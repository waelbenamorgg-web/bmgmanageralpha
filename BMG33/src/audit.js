import { stBalance, invoiceST, euros } from './stReconcile.js';
// Contrôles déterministes : aucun voyant « OK » sans vérification réelle.
const num = (v) => Number(v);
const finite = (v) => Number.isFinite(num(v));
const sum = (items) => (items || []).reduce((acc, v) => acc + (finite(v) ? num(v) : 0), 0);
const money = (v) => `${num(v).toLocaleString('fr-FR', {maximumFractionDigits:2})} €`;
const issue = (tab, severity, title, detail, action, code='') => ({ tab, severity, title, detail, action, code });

export function auditProject(project) {
  const p = project || {};
  const result = [];
  const codes = p.imputationCodes || [];
  const codesById = new Map(codes.map(c => [c.code, c]));
  const count = (p.months || []).length;
  const budgets = Object.fromEntries(codes.map(c => [c.code, (num(c.qty)||0)*(num(c.pu)||0)]));
  const tolerance = 0.01;
  const checkMonths = (values, tab, label) => {
    if (!Array.isArray(values) || values.length !== count) result.push(issue(tab,'error',`${label} : calendrier incomplet`,`${values?.length ?? 0} mois renseignés pour ${count} mois de chantier.`,'Corriger la ventilation mensuelle.'));
    if ((values || []).some(v => !finite(v))) result.push(issue(tab,'error',`${label} : valeur mensuelle invalide`,'Une valeur non numérique a été détectée. Les moins-values justifiées restent autorisées.','Corriger les cellules concernées.'));
  };
  if (!count) result.push(issue('dashboard','error','Calendrier absent','Aucun mois défini.','Renseigner les dates dans la configuration.'));
  if (!finite(p.clientBudget) || num(p.clientBudget)<0) result.push(issue('dashboard','error','Marché client invalide','Le montant du marché de base est invalide.','Corriger le marché client dans Configuration.'));
  if (!finite(p.overheadRate) || num(p.overheadRate)<0 || num(p.overheadRate)>100) result.push(issue('dashboard','error','Taux de frais généraux invalide','Le taux doit être compris entre 0 et 100 %.','Corriger le taux dans Configuration.'));
  const seen=new Set();
  codes.forEach(c=>{
    if (!c.code || seen.has(c.code)) result.push(issue('budget','error','Code d’imputation absent ou doublonné',`Code : ${c.code||'vide'}.`,'Corriger les codes dans Budget évolution.',c.code));
    seen.add(c.code);
    if (!finite(c.qty)||!finite(c.pu)||num(c.qty)<0||num(c.pu)<0) result.push(issue('budget','error',`Budget invalide : ${c.code}`,'Quantité ou montant négatif / non numérique.','Corriger le budget attribué.',c.code));
  });
  if (p.studyDisbursementBudget !== null && p.studyDisbursementBudget !== undefined) {
    const study=num(p.studyDisbursementBudget), initial=sum(Object.values(budgets));
    if (!finite(study)||Math.abs(study-initial)>tolerance) result.push(issue('dashboard','warning','Budget études ≠ budget imputé',`Études : ${money(study)} ; imputations : ${money(initial)} ; écart : ${money(study-initial)}.`,'Comparer Configuration et Budget évolution.'));
  }
  (p.clientAmendments||[]).forEach(a=>{
    const alloc=sum(Object.values(a.allocations||{}));
    if (alloc>num(a.amount)+tolerance) result.push(issue('budget','error',`Avenant ${a.number||a.id} sur-affecté`,`Avenant ${money(a.amount)} ; affectation ${money(alloc)}.`,'Réduire les affectations dans Budget évolution.'));
    Object.keys(a.allocations||{}).forEach(code=>{if (!codesById.has(code)) result.push(issue('budget','error',`Avenant affecté à un code absent : ${code}`,'Une affectation ne peut pas être intégrée au budget.','Corriger le code de l’avenant.',code));});
    checkMonths(a.billingMonthly,'rad',`Facturation avenant ${a.number||a.id}`);
    if (Math.abs(sum(a.billingMonthly)-num(a.amount))>tolerance) result.push(issue('rad','error',`Avenant ${a.number||a.id} non ventilé`,`Facturation RAD ${money(sum(a.billingMonthly))} / avenant ${money(a.amount)}.`,'Compléter la ligne de facturation de cet avenant dans RAD.'));
  });
  const running={...budgets};
  (p.clientAmendments||[]).forEach(a=>Object.entries(a.allocations||{}).forEach(([code,amount])=>{if(code in running) running[code]+=num(amount)||0;}));
  (p.transfers||[]).forEach((t,i)=>{
    const label=`Transfert ${i+1}`;
    if (!codesById.has(t.fromCode)||!codesById.has(t.toCode)) {result.push(issue('budget','error',`${label} : code inexistant`,`${t.fromCode||'—'} → ${t.toCode||'—'}.`,'Corriger ou supprimer le transfert dans Budget évolution.'));return;}
    if(t.fromCode===t.toCode) result.push(issue('budget','error',`${label} : codes identiques`,'Le code source et le code destination sont identiques.','Corriger le transfert.'));
    if(!finite(t.amount)||num(t.amount)<=0) {result.push(issue('budget','error',`${label} : montant invalide`,`${t.amount}.`,'Renseigner un montant strictement positif.'));return;}
    if (num(t.amount)>running[t.fromCode]+tolerance) result.push(issue('budget','error',`${label} : budget source insuffisant`,`Source ${t.fromCode} : ${money(running[t.fromCode])} ; transfert : ${money(t.amount)}.`,'Réduire le transfert ou réaffecter le budget.'));
    running[t.fromCode]-=num(t.amount); running[t.toCode]+=num(t.amount);
  });
  if(Object.values(running).some(v=>v< -tolerance)) result.push(issue('budget','error','Budget réajusté négatif','Au moins un code possède un budget négatif après transfert.','Vérifier les transferts budgétaires.'));
  (p.subContractors||[]).forEach(st=>{
    const name=st.company||st.code||'Sous-traitant';
    if(!codesById.has(st.code)) result.push(issue('subcontractors','error',`ST sans imputation : ${name}`,`Code ${st.code||'absent'}.`,'Affecter un code valide au sous-traitant.'));
    else if(codesById.get(st.code).family!=='Sous-traitance') result.push(issue('subcontractors','error',`ST affecté hors famille : ${name}`,`Code ${st.code}.`,'Utiliser un code de sous-traitance.'));
    const orders=sum((st.modificationOrders||[]).map(o=>o.amount));
    const pending=sum((st.pendingOrders||[]).map(o=>o.amount));
    if(Math.abs(orders-(num(st.modifications)||0))>tolerance||Math.abs(pending-(num(st.toRegularize)||0))>tolerance) result.push(issue('subcontractors','error',`OM / régularisations incohérents : ${name}`,'Les totaux mémorisés diffèrent des lignes détaillées.','Vérifier les ordres modificatifs et les régularisations.'));
    if(!finite(st.prorataRate)||num(st.prorataRate)<0||num(st.prorataRate)>100) result.push(issue('subcontractors','error',`Taux prorata ST invalide : ${name}`,'Le taux doit être compris entre 0 et 100 %.','Corriger le taux dans ST.'));
    const contract=(num(st.initialMarket)||0)+(num(st.modifications)||0)+(num(st.toRegularize)||0);
    if(contract < -tolerance) result.push(issue('subcontractors','error',`Marché ST négatif : ${name}`,`Marché actualisé ${money(contract)}.`, 'Vérifier les moins-values et le marché initial.',st.code));
    checkMonths(st.radMonthly,'subcontractors',`RAD ST ${name}`);
    const balance = stBalance(st, p.expenses || [], p.subContractors || []);
    if (balance.remainingCents < 0) result.push(issue('subcontractors','error',`Facturation supérieure au marché : ${name}`,`Marché net de prorata ${money(euros(balance.netMarketCents))} ; factures/avoirs réels ${money(euros(balance.billedCents))} ; dépassement ${money(euros(-balance.remainingCents))}.`,'Vérifier les factures et les OM / travaux à régulariser du marché ST.',st.code));
    if (balance.differenceCents !== 0) result.push(issue('subcontractors','error',`Rapprochement ST au centime : ${name}`,`Marché brut ${money(euros(balance.marketCents))} − prorata ${money(euros(balance.withheldCents))} − factures/avoirs réels ${money(euros(balance.billedCents))} = reste à facturer ${money(euros(balance.remainingCents))}. RAD mensuel restant ${money(euros(balance.radCents))}. Écart ${money(euros(balance.differenceCents))}.`,'Dans ST, reventiler MANUELLEMENT les mois du RAD restant jusqu’à un écart de 0,00 €. Les factures réelles ne doivent pas être soustraites automatiquement.',st.code));
  });
  (p.prorataItems||[]).forEach(item=>checkMonths(item.monthly,'prorata',`Prorata ${item.item||item.id}`));
  const prorataBudget=budgets.PRORATA||0;
  const prorataForecast=sum((p.prorataItems||[]).flatMap(item=>item.monthly||[]));
  if(!p.prorataRemoved&&Math.abs(prorataForecast-prorataBudget)>tolerance) result.push(issue('prorata','warning','Prorata : ventilation ≠ enveloppe',`Budget ${money(prorataBudget)} ; ventilation ${money(prorataForecast)}.`,'Comparer le budget PRORATA dans Budget évolution et les postes de Prorata.','PRORATA'));
  Object.entries(p.radNonST||{}).forEach(([code,values])=>{
    if(!codesById.has(code)) result.push(issue('rad','error',`RAD avec code inconnu : ${code}`,'Ventilation rattachée à un code absent.','Corriger ou réaffecter le code.',code));
    else if(codesById.get(code).family==='Sous-traitance'||code==='PRORATA') result.push(issue('rad','warning',`RAD doublon potentiel : ${code}`,'Ce poste doit être ventilé dans son onglet dédié.','Supprimer la saisie directe en doublon.',code));
    checkMonths(values,'rad',`RAD ${code}`);
  });
  checkMonths(p.clientSalesPlan,'rad','Facturation marché de base');
  if(Math.abs(sum(p.clientSalesPlan)-num(p.clientBudget))>tolerance) result.push(issue('rad','error','Facturation de base non équilibrée',`Prévision : ${money(sum(p.clientSalesPlan))} ; marché : ${money(p.clientBudget)}.`,'Modifier la ligne de facturation du marché de base dans RAD.'));
  (p.expenses||[]).forEach(e=>{
    if(!codesById.has(e.subCode)) result.push(issue('epicier','error',`Dépense ${e.id} : code inconnu`,`${e.subCode||'absent'}.`,'Corriger l’imputation dans Cahier d’épicier.'));
    if(!finite(e.invoiceAmount)) result.push(issue('epicier','error',`Dépense ${e.id} : montant invalide`,`${e.invoiceAmount}.`,'Corriger le montant non numérique ; les avoirs négatifs sont autorisés.'));
    if(e.period && !(p.months||[]).includes(e.period)) result.push(issue('epicier','warning',`Dépense ${e.id} : mois hors chantier`,e.period,'Vérifier la période de la dépense.'));
    if(codesById.get(e.subCode)?.family==='Sous-traitance') {
      const st = invoiceST(e, p.subContractors || []);
      if (!st || st.code !== e.subCode) result.push(issue('epicier','error',`Facture ST ${e.id} sans marché identifié`,`${e.supplier || 'Fournisseur'} : ${money(e.invoiceAmount)} imputés sur ${e.subCode}.`,'Dans Cahier d’épicier, modifier la facture et sélectionner le sous-traitant exact.',e.subCode));
    }
  });
  const rev=p.priceRevision||{};
  if(rev.enabled){
    if(!finite(rev.baseIndexValue)||num(rev.baseIndexValue)<=0) result.push(issue('revision','error','Indice de base invalide','L’indice de base doit être positif.','Corriger la révision de prix.'));
    if(!finite(rev.fixedPart)||!finite(rev.variablePart)||Math.abs(num(rev.fixedPart)+num(rev.variablePart)-1)>0.0001) result.push(issue('revision','warning','Coefficients de révision non équilibrés',`Part fixe + part variable = ${num(rev.fixedPart)+num(rev.variablePart)} au lieu de 1.`,'Vérifier les coefficients de la formule contractuelle.'));
    if((rev.monthlyIndexes||[]).length!==count) result.push(issue('revision','warning','Indices mensuels incomplets','La période de révision ne couvre pas tous les mois.','Renseigner les indices mensuels.'));
    (rev.monthlyIndexes||[]).forEach((v,i)=>{if(!finite(v)||num(v)<=0) result.push(issue('revision','error',`Indice invalide : mois ${i+1}`,`${v}.`,'Corriger cet indice.'));});
  }
  // Signalement explicite d’une hypothèse comptable, sans la corriger silencieusement.
  const totalInvoices=sum((p.expenses||[]).map(e=>e.invoiceAmount));
  const totalRad=sum(Object.values(p.radNonST||{}).flat())+sum((p.subContractors||[]).flatMap(st=>st.radMonthly||[]))+prorataForecast;
  if(totalInvoices>0&&totalRad>0) result.push(issue('dashboard','info','Périmètre engagé + RAD à confirmer',`Dépenses facturées ${money(totalInvoices)} et RAD ${money(totalRad)} sont additionnés à l’atterrissage.`,'Vérifier que le RAD représente uniquement le reste à dépenser ; sinon, le résultat est surestimé en coûts.'));
  return result;
}
