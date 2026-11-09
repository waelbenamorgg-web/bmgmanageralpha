import { euroBmg } from './bmgEvolution.js';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const signed = value => `${value > 0 ? '+' : ''}${euroBmg(value)}`;
const money = value => escapeHtml(signed(value));
export function buildBmgReportHtml({ projectName, reference, target, comparison, targetLabel }) {
  if (!comparison) throw new Error('Aucune comparaison disponible');
  const rows = [...comparison.rows].sort((a,b) => a.delta-b.delta);
  const losses = rows.filter(row => row.delta < 0);
  const gains = rows.filter(row => row.delta > 0);
  const sum = arr => Math.round(arr.reduce((total,row) => total + Math.round(row.delta*100),0))/100;
  const tableRows = rows.map(row => `<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.label)}</td><td class="num">${escapeHtml(euroBmg(row.budget))}</td><td class="num">${money(row.previousGain)}</td><td class="num">${money(row.currentGain)}</td><td class="num ${row.delta < 0 ? 'loss' : row.delta > 0 ? 'gain' : ''}">${money(row.delta)}</td></tr>`).join('');
  const refDate = reference?.createdAt ? new Date(reference.createdAt).toLocaleDateString('fr-FR') : '—';
  const targetDate = target?.createdAt ? new Date(target.createdAt).toLocaleDateString('fr-FR') : 'Situation actuelle';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Évolution BMG - ${escapeHtml(projectName)}</title><style>
  @page{size:A4 landscape;margin:13mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#182337;margin:0;font-size:11px}h1{font-size:23px;margin:0 0 5px}h2{font-size:14px;margin:25px 0 10px}.muted{color:#64748b}.header{border-bottom:3px solid #283f76;padding-bottom:14px;margin-bottom:18px}.meta{display:flex;gap:24px;margin:10px 0 18px}.meta div{flex:1}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.card{border:1px solid #dbe2eb;border-radius:6px;padding:12px}.card strong{display:block;font-size:17px;margin-top:6px}.loss{color:#a61b36;font-weight:bold}.gain{color:#047857;font-weight:bold}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#edf2f8;text-align:left}th,td{padding:7px;border-bottom:1px solid #dbe2eb}tr{break-inside:avoid}.num{text-align:right;white-space:nowrap}.foot{font-size:10px;color:#64748b;margin-top:20px}button{border:0;background:#283f76;color:white;border-radius:6px;padding:10px 16px;cursor:pointer;margin-bottom:18px}@media print{button{display:none}thead{display:table-header-group}}
  </style></head><body><button onclick="window.print()">Imprimer / Enregistrer en PDF</button><div class="header"><h1>Évolution du BMG — Rapport direction</h1><div class="muted">${escapeHtml(projectName || 'Chantier non nommé')} · Édité le ${new Date().toLocaleDateString('fr-FR')}</div></div>
  <div class="meta"><div><b>Présentation de référence</b><br>${escapeHtml(reference?.label || 'BMG précédent')}<br><span class="muted">${escapeHtml(refDate)}</span></div><div><b>Présentation comparée</b><br>${escapeHtml(targetLabel || target?.label || 'BMG actuel (non figé)')}<br><span class="muted">${escapeHtml(targetDate)}</span></div></div>
  <div class="cards"><div class="card">Gain de référence<strong>${money(comparison.previous.totalGain)}</strong></div><div class="card">Gain comparé<strong>${money(comparison.current.totalGain)}</strong></div><div class="card">Évolution globale<strong class="${comparison.totalDelta < 0 ? 'loss' : 'gain'}">${money(comparison.totalDelta)}</strong></div><div class="card">Codes en dégradation<strong class="loss">${losses.length}</strong></div></div>
  <h2>Synthèse des mouvements</h2><p>Dégradations : <b class="loss">${money(sum(losses))}</b> sur ${losses.length} code(s) · Améliorations : <b class="gain">${money(sum(gains))}</b> sur ${gains.length} code(s).</p>
  <h2>Comparaison détaillée par code (dégradations en premier)</h2><table><thead><tr><th>Code</th><th>Désignation</th><th class="num">Budget actuel HT</th><th class="num">Gain de référence HT</th><th class="num">Gain comparé HT</th><th class="num">Évolution HT</th></tr></thead><tbody>${tableRows || '<tr><td colspan="6">Aucun code à comparer</td></tr>'}</tbody></table>
  <p class="foot">Évolution = gain comparé − gain de référence. Un montant négatif représente une dégradation. Les gains sont calculés à partir du budget actualisé moins les dépenses réelles et le RAD restant. Le BMG actuel non figé est une photographie au moment de l’édition. Rapport généré localement ; aucune donnée n’est transmise à un service PDF externe.</p></body></html>`;
}
export function openBmgPdfReport(options) {
  const popup = window.open('', '_blank');
  if (!popup) { window.alert('Le navigateur bloque la fenêtre du rapport. Autorisez les fenêtres pop-up pour BMG puis réessayez.'); return; }
  popup.document.open(); popup.document.write(buildBmgReportHtml(options)); popup.document.close(); popup.focus();
}
