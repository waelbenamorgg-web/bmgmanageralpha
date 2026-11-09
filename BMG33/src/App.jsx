import { captureBmg, compareBmg, euroBmg } from './bmgEvolution.js';
import { openBmgPdfReport } from './bmgPdfReport.js';
import { makeBackup, inspectBackup, APP_VERSION } from './backupMigration.js';
import { stBalance, invoiceST, euros } from './stReconcile.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { auditProject } from './audit.js';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Calendar,
  Receipt,
  PieChart as PieChartIcon,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  Download,
  Upload,
  Building2,
  Info,
  Settings,
  Trash2,
  Edit3,
  Search,
  Lock,
  Unlock,
  Bot,
  Scale,
  Plus,
  BarChart3,
  X
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

function generateMonthLabels(startDateStr, endDateStr) {
  const start = new Date(startDateStr || '2026-09-01');
  const end = new Date(endDateStr || '2027-02-28');

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return {
      monthsCount: 6,
      months: ['Septembre 2026', 'Octobre 2026', 'Novembre 2026', 'Décembre 2026', 'Janvier 2027', 'Février 2027']
    };
  }

  const months = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endCompare = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endCompare && months.length < 120) {
    const monthLabel = current.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    months.push(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1));
    current.setMonth(current.getMonth() + 1);
  }

  return { monthsCount: months.length || 1, months: months.length ? months : ['Septembre 2026'] };
}

const DEFAULT_PROJECT = {
  name: 'Chantier 42 Avenue Jean Jaurès',
  location: 'Paris 19e',
  lot: 'Gros Œuvre - Structure & Clos Couvert',
  manager: 'Alexandre Martin - Conducteur de Travaux',
  startDate: '2026-09-01',
  endDate: '2027-02-28',
  monthsCount: 6,
  clientBudget: 2850000,
  studyDisbursementBudget: null,
  clientAmendments: [],
  prorataRemoved: false,
  billedToClientActual: 950000,
  overheadRate: 15,
  overheadLocked: false,
  months: ['Septembre 2026', 'Octobre 2026', 'Novembre 2026', 'Décembre 2026', 'Janvier 2027', 'Février 2027'],
  clientSalesPlan: [300000, 450000, 500000, 600000, 600000, 400000],
  priceRevision: {
    enabled: true,
    indexName: 'BT01 - Bâtiment Tous Corps d’État',
    baseIndexValue: 132.5,
    fixedPart: 0.15,
    variablePart: 0.85,
    monthlyIndexes: [133.2, 134.0, 134.8, 135.5, 136.2, 137.0],
    locked: false
  },
  imputationCodes: [
    { family: 'Main-d’œuvre', code: 'MO', label: 'Main-d’œuvre ouvrière', unit: 'h', pu: 38, qty: 8947, locked: true },
    { family: 'Encadrement', code: 'CC', label: 'Chef de chantier / Encadrement', unit: 'mois', pu: 6000, qty: 20, locked: true },
    { family: 'Matériaux', code: 'MXBE', label: 'Béton prêt à l’emploi', unit: 'm3', pu: 120, qty: 2333, locked: false },
    { family: 'Matériaux', code: 'MXFE', label: 'Acier / Ferraillage', unit: 'kg', pu: 1.4, qty: 135714, locked: false },
    { family: 'Matériaux', code: 'MXMO', label: 'Mortiers et liants', unit: 'sac', pu: 15, qty: 3000, locked: false },
    { family: 'Matériaux', code: 'MXPA', label: 'Maçonnerie / Parpaings', unit: 'm2', pu: 45, qty: 1377, locked: false },
    { family: 'Matériaux', code: 'MXIS', label: 'Isolants et rupteurs', unit: 'm2', pu: 35, qty: 1085, locked: false },
    { family: 'Matériaux', code: 'MXME', label: 'Menuiseries extérieures', unit: 'ens', pu: 145000, qty: 1, locked: false },
    { family: 'Location', code: 'MLLOEN', label: 'Engins motorisés & nacelles', unit: 'mois', pu: 9166, qty: 6, locked: false },
    { family: 'Location', code: 'MLLOCO', label: 'Coffrages & étaiements', unit: 'm2', pu: 26, qty: 3000, locked: false },
    { family: 'Location', code: 'MLLOGR', label: 'Location Grue à tour', unit: 'mois', pu: 15833, qty: 6, locked: true },
    { family: 'Location', code: 'MLLOEC', label: 'Échafaudages de façade', unit: 'm2', pu: 21, qty: 2000, locked: false },
    { family: 'Sous-traitance', code: 'STDE', label: 'Désamiantage ST', unit: 'forfait', pu: 85000, qty: 1, locked: true },
    { family: 'Sous-traitance', code: 'STGO', label: 'Gros œuvre / Maçonnerie ST', unit: 'forfait', pu: 450000, qty: 1, locked: false },
    { family: 'Sous-traitance', code: 'STET', label: 'Étanchéité toiture ST', unit: 'forfait', pu: 115000, qty: 1, locked: false },
    { family: 'Sous-traitance', code: 'STEL', label: 'Électricité & CVC ST', unit: 'forfait', pu: 210000, qty: 1, locked: false },
    { family: 'Frais divers', code: 'ACHA', label: 'Achats divers & frais divers', unit: 'forfait', pu: 95000, qty: 1, locked: false },
    { family: 'Frais divers', code: 'PRORATA', label: 'Prorata de chantier', unit: 'forfait', pu: 0, qty: 1, locked: true }
  ],
  transfers: [
    { id: 1, date: '2026-10-12', fromCode: 'MXFE', toCode: 'MXMO', amount: 5000, reason: 'Ajustement volume mortier maçonnerie', locked: true },
    { id: 2, date: '2026-11-02', fromCode: 'MLLOEN', toCode: 'MLLOGR', amount: 8000, reason: 'Extension durée location grue', locked: false }
  ],
  subContractors: [
    { id: 1, code: 'STDE', company: 'DECONTAM IDF', statusContract: 'Signé', agreement: 'Validé', dgd: 'En cours', initialMarket: 85000, modifications: 4500, toRegularize: 0, radMonthly: [0, 25000, 40000, 26500, 0, 0], locked: true },
    { id: 2, code: 'STGO', company: 'BATIPRO STRUCTURES', statusContract: 'Signé', agreement: 'Validé', dgd: 'Non', initialMarket: 450000, modifications: 12000, toRegularize: 5000, radMonthly: [60000, 90000, 110000, 100000, 75000, 42000], locked: false },
    { id: 3, code: 'STET', company: 'ETANCHISOL PARIS', statusContract: 'En cours', agreement: 'En attente', dgd: 'Non', initialMarket: 115000, modifications: 0, toRegularize: 2500, radMonthly: [0, 0, 30000, 45000, 30000, 12500], locked: false },
    { id: 4, code: 'STEL', company: 'ELEC-PRO 19', statusContract: 'Signé', agreement: 'Validé', dgd: 'Non', initialMarket: 210000, modifications: 3500, toRegularize: 0, radMonthly: [10000, 35000, 50000, 50000, 40000, 33500], locked: false }
  ],
  radNonST: {
    MO: [45000, 55000, 60000, 65000, 60000, 55000],
    CC: [20000, 20000, 20000, 20000, 20000, 20000],
    MXBE: [45000, 65000, 70000, 50000, 25500, 0],
    MXFE: [30000, 45000, 50000, 35000, 24000, 0],
    MXMO: [5000, 8000, 12000, 12000, 8000, 5000],
    MXPA: [0, 10000, 20000, 20000, 12000, 0],
    MXIS: [0, 0, 10000, 15000, 13000, 0],
    MXME: [0, 0, 25000, 45000, 45000, 30000],
    MLLOEN: [8000, 10000, 12000, 10000, 7000, 0],
    MLLOCO: [12000, 15000, 18000, 15000, 10000, 8000],
    MLLOGR: [17000, 17000, 17000, 17000, 17000, 8000],
    MLLOEC: [5000, 7000, 10000, 10000, 6000, 4000],
    ACHA: [12000, 15000, 18000, 18000, 16000, 11200]
  },
  expenses: [
    { id: 'EXP-101', period: 'Septembre 2026', supplier: 'CEMEX BÉTONS', description: 'Livraison Béton voiles R+1', code: 'Matériaux', subCode: 'MXBE', poNumber: 'BC-2026-089', poAmount: 24500, deliveryDate: '2026-09-14', invoiceDate: '2026-09-30', invoiceAmount: 24500, locked: true },
    { id: 'EXP-102', period: 'Septembre 2026', supplier: 'KILOUTOU MODULE', description: 'Bases de vie et sanitaires', code: 'Location', subCode: 'MLLOEN', poNumber: 'BC-2026-042', poAmount: 8200, deliveryDate: '2026-09-02', invoiceDate: '2026-09-28', invoiceAmount: 8200, locked: true },
    { id: 'EXP-103', period: 'Octobre 2026', supplier: 'SAMSE MATÉRIAUX', description: 'Mortiers et ciments colle', code: 'Matériaux', subCode: 'MXMO', poNumber: 'BC-2026-112', poAmount: 6400, deliveryDate: '2026-10-10', invoiceDate: '2026-10-25', invoiceAmount: 6400, locked: false },
    { id: 'EXP-104', period: 'Octobre 2026', supplier: 'LIEBHERR RENT', description: 'Location Grue à tour Mois 02', code: 'Location', subCode: 'MLLOGR', poNumber: 'BC-2026-015', poAmount: 18500, deliveryDate: '2026-10-01', invoiceDate: '2026-10-31', invoiceAmount: 18500, locked: false },
    { id: 'EXP-105', period: 'Novembre 2026', supplier: 'ARMADEX ACIERS', description: 'Ferraillage HA 12/16 dalles R+2', code: 'Matériaux', subCode: 'MXFE', poNumber: 'BC-2026-145', poAmount: 31200, deliveryDate: '2026-11-03', invoiceDate: '2026-11-06', invoiceAmount: 31200, locked: false },
    { id: 'EXP-106', period: 'Novembre 2026', supplier: 'EULER HERMES PRORATA', description: 'Nettoyage et gardiennage partagé', code: 'Frais divers', subCode: 'ACHA', poNumber: 'BC-2026-150', poAmount: 4800, deliveryDate: '2026-11-05', invoiceDate: '2026-11-06', invoiceAmount: 4800, locked: false }
  ],
  prorataItems: [
    { id: 1, item: 'Électricité (Compteur temporaire & consommations)', monthly: [1800, 2400, 2800, 3100, 2900, 2200], locked: false },
    { id: 2, item: 'Eau de chantier (Abonnement & m³)', monthly: [450, 620, 780, 800, 750, 600], locked: false },
    { id: 3, item: 'Bennes & Traitement des déchets DIB', monthly: [3200, 4500, 5100, 4800, 4200, 3500], locked: false },
    { id: 4, item: 'Nettoyage & Hygiène des bases de vie', monthly: [2100, 2100, 2100, 2100, 2100, 2100], locked: false },
    { id: 5, item: 'Télécoms, Wi‑Fi & Sécurité vidéosurveillance', monthly: [650, 650, 650, 650, 650, 650], locked: false },
    { id: 6, item: 'Remise en état et panneaux de signalisation', monthly: [800, 400, 600, 500, 1200, 2500], locked: false }
  ]
};

// Alpha vierge : aucune donnée financière fictive, sauf le code PRORATA à 0 €.
// Les données existantes du navigateur ne sont jamais écrasées au démarrage.
function makeBlankProject() {
  const start = new Date();
  const first = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(start.getFullYear(), start.getMonth() + 6, 0);
  const iso = d => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  const { months } = generateMonthLabels(iso(first), iso(last));
  return {
    ...DEFAULT_PROJECT,
    name: 'Nouveau chantier', location: '', lot: '', manager: '',
    startDate: iso(first), endDate: iso(last), months, monthsCount: months.length,
    clientBudget: 0, studyDisbursementBudget: null, billedToClientActual: 0,
    clientAmendments: [], clientSalesPlan: months.map(() => 0),
    priceRevision: { ...DEFAULT_PROJECT.priceRevision, enabled: false, monthlyIndexes: months.map(() => 100), baseIndexValue: 100 },
    imputationCodes: [{ family: 'Frais divers', code: 'PRORATA', label: 'Prorata de chantier', unit: 'forfait', pu: 0, qty: 1, locked: false }],
    transfers: [], subContractors: [], radNonST: {}, expenses: [], prorataItems: [],
    prorataRemoved: false, projectInfoLocked: false, bmgHistory: []
  };
}

const START_GUIDE = [
  { title: 'Configurer le chantier', tab: 'dashboard', detail: 'Ouvrez Config. Renseignez le nom, la localisation, le responsable, les dates, le marché client HT, le budget études déboursé et les frais généraux. Déverrouillez les paramètres si nécessaire.', check: 'Les dates et les montants de base sont renseignés.' },
  { title: 'Créer les codes et budgets études', tab: 'budget', detail: 'Dans Budget évolution, ajoutez les codes d’imputation (matériaux, main-d’œuvre, location, ST, etc.). Attribuez à chaque code son budget études. Un sous-traitant doit d’abord avoir son code ST ici. PRORATA est initialement à 0 €.', check: 'Les enveloppes études sont réparties entre les codes.' },
  { title: 'Renseigner les marchés sous-traitants', tab: 'subcontractors', detail: 'Dans ST, renseignez pour chaque code ST le nom de l’entreprise, le montant réellement signé et le taux de retenue prorata (2 % par défaut). Ajoutez ensuite les OM et les travaux à régulariser, en positif ou négatif. Le budget études reste indépendant du marché signé.', check: 'Marchés signés, OM et régularisations sont contrôlés.' },
  { title: 'Préparer le compte prorata', tab: 'prorata', detail: 'Si votre chantier comporte un budget PRORATA, attribuez-le dans Budget évolution puis ventilez les dépenses prévues par poste et par mois dans Prorata. Ne confondez pas cette enveloppe avec les retenues opérées sur les marchés ST.', check: 'Le détail mensuel du prorata correspond à son enveloppe.' },
  { title: 'Ventiler le RAD et la facturation', tab: 'rad', detail: 'Dans RAD, répartissez manuellement les dépenses prévisionnelles par code et par mois. Pour chaque ST, la somme des mois restants doit égaler marché actualisé moins retenue prorata moins factures ST nettes. Ventilez séparément la facturation client du marché de base et des avenants.', check: 'Les contrôles de ventilation au centime sont équilibrés.' },
  { title: 'Enregistrer les dépenses réelles', tab: 'epicier', detail: 'Dans Cahier d’épicier, saisissez les factures HT sur le bon code et rattachez les factures ST au bon sous-traitant. Les avoirs se saisissent avec un montant négatif. Les dépenses réelles ne modifient jamais automatiquement les mois du RAD.', check: 'Chaque facture ou avoir possède une imputation correcte.' },
  { title: 'Réajuster le prévisionnel manuellement', tab: 'rad', detail: 'Après chaque facture, ajustez vous-même le RAD restant et, pour les ST, sa répartition mensuelle. Le montant net restant doit correspondre au centime près au marché ST actualisé net de prorata, diminué des factures ST nettes. Une dépense non compensée augmente le coût à terminaison.', check: 'Aucune facture ST n’est laissée sans rapprochement.' },
  { title: 'Contrôler et sauvegarder', tab: 'dashboard', detail: 'Dans Tableau de bord → Contrôles, traitez les anomalies par onglet : budgets, ST, RAD, Cahier d’épicier, Prorata et Révision. Exportez régulièrement une sauvegarde JSON. L’import JSON permet de reprendre un chantier.', check: 'Les écarts sont expliqués et une sauvegarde JSON est exportée.' }
];

// Source unique des montants ST : les lignes d'ordres sont agrégées, sans double comptage.
const stOrderSum = (orders) => (orders || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
const signedAmountClass = (value) => Number(value) < 0 ? 'text-rose-600' : 'text-emerald-700';
const stMarketTotal = (st) => (Number(st.initialMarket) || 0) + (Number(st.modifications) || 0) + (Number(st.toRegularize) || 0);
// Le prorata ST porte sur le marché engagé + OM + travaux à régulariser.
const stProrataBase = (st) => (Number(st.initialMarket) || 0) + (Number(st.modifications) || 0) + (Number(st.toRegularize) || 0);
const stProrataAmount = (st) => Math.round(stProrataBase(st) * (Number(st.prorataRate ?? 2) || 0)) / 100;
const stNetAfterProrata = (st) => stProrataBase(st) - stProrataAmount(st);
const euro = (value) => (Number(value) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

function normalizeProjectData(data) {
  const source = data && typeof data === 'object' ? data : {};
  const merged = { ...DEFAULT_PROJECT, ...source };
  merged.months = Array.isArray(source.months) && source.months.length ? source.months : [...DEFAULT_PROJECT.months];
  merged.monthsCount = merged.months.length;
  merged.imputationCodes = Array.isArray(source.imputationCodes) ? [...source.imputationCodes] : [...DEFAULT_PROJECT.imputationCodes];
  merged.prorataItems = Array.isArray(source.prorataItems) ? source.prorataItems : [...DEFAULT_PROJECT.prorataItems];
  merged.subContractors = Array.isArray(source.subContractors) ? source.subContractors : [...DEFAULT_PROJECT.subContractors];
  merged.expenses = Array.isArray(source.expenses) ? source.expenses : [...DEFAULT_PROJECT.expenses];
  merged.transfers = Array.isArray(source.transfers) ? source.transfers : [...DEFAULT_PROJECT.transfers];
  merged.radNonST = source.radNonST && typeof source.radNonST === 'object' ? { ...source.radNonST } : { ...DEFAULT_PROJECT.radNonST };
  merged.clientSalesPlan = Array.isArray(source.clientSalesPlan) ? source.clientSalesPlan : [...DEFAULT_PROJECT.clientSalesPlan];
  merged.priceRevision = { ...DEFAULT_PROJECT.priceRevision, ...(source.priceRevision || {}) };
  merged.clientAmendments = (Array.isArray(source.clientAmendments) ? source.clientAmendments : []).map(a => ({
    ...a,
    billingMonthly: Array.from({ length: merged.monthsCount }, (_, i) =>
      Array.isArray(a.billingMonthly) ? (Number(a.billingMonthly[i]) || 0) :
      (a.month === merged.months[i] ? (Number(a.amount) || 0) : 0))
  }));
  merged.studyDisbursementBudget = source.studyDisbursementBudget === undefined || source.studyDisbursementBudget === null ? null : Number(source.studyDisbursementBudget);
  // PRORATA is optional. A deliberate deletion must persist across JSON import and reload.
  merged.prorataRemoved = Boolean(source.prorataRemoved);
  const oldProrataCode = merged.imputationCodes.find(c => c.code === 'PRORATA');
  const legacyProrataBudget = oldProrataCode ? Number(oldProrataCode.pu) * Number(oldProrataCode.qty || 1) : source.prorataBudget;
  merged.imputationCodes = merged.imputationCodes.filter(code => code.code !== 'PRORATA');
  if (!merged.prorataRemoved) {
    merged.imputationCodes.push({
      family: 'Frais divers', code: 'PRORATA', label: 'Prorata de chantier', unit: 'forfait',
      pu: Number(legacyProrataBudget ?? 0) || 0, qty: 1, locked: Boolean(oldProrataCode?.locked)
    });
    if (legacyProrataBudget === undefined || legacyProrataBudget === null) {
      const sumProrata = merged.prorataItems.reduce((sum, item) => sum + (item.monthly || []).reduce((a, b) => a + (Number(b) || 0), 0), 0);
      merged.imputationCodes = merged.imputationCodes.map(c => c.code === 'PRORATA' ? { ...c, pu: sumProrata } : c);
    }
  } else {
    merged.prorataItems = [];
  }
  delete merged.radNonST.PRORATA;
  merged.prorataBudget = Number(merged.imputationCodes.find(c => c.code === 'PRORATA')?.pu) || 0;
  merged.radNonST = Object.fromEntries(Object.entries(merged.radNonST).map(([code, values]) => [
    code,
    Array.from({ length: merged.monthsCount }, (_, index) => Number(values?.[index]) || 0)
  ]));
  merged.subContractors = merged.subContractors.map(st => {
    const modificationOrders = Array.isArray(st.modificationOrders) ? st.modificationOrders :
      (Number(st.modifications) ? [{ id: `legacy-mod-${st.id}`, reference: 'Solde OM repris', amount: Number(st.modifications) }] : []);
    const pendingOrders = Array.isArray(st.pendingOrders) ? st.pendingOrders :
      (Number(st.toRegularize) ? [{ id: `legacy-pending-${st.id}`, reference: 'Solde à régulariser repris', amount: Number(st.toRegularize) }] : []);
    return {
      ...Object.fromEntries(Object.entries(st).filter(([key]) => key !== 'provision')),
      initialMarket: Number(st.initialMarket) || 0,
      prorataRate: st.prorataRate === undefined || st.prorataRate === null ? 2 : Math.max(0, Math.min(100, Number(st.prorataRate) || 0)),
      modificationOrders,
      pendingOrders,
      modifications: stOrderSum(modificationOrders),
      toRegularize: stOrderSum(pendingOrders),
      radMonthly: Array.from({ length: merged.monthsCount }, (_, index) => Number(st.radMonthly?.[index]) || 0)
    };
  });
  merged.prorataItems = merged.prorataItems.map(item => ({
    ...item,
    monthly: Array.from({ length: merged.monthsCount }, (_, index) => Number(item.monthly?.[index]) || 0)
  }));
  merged.clientSalesPlan = Array.from({ length: merged.monthsCount }, (_, index) => Number(merged.clientSalesPlan?.[index]) || 0);
  merged.priceRevision.monthlyIndexes = Array.from({ length: merged.monthsCount }, (_, index) =>
    Number(merged.priceRevision.monthlyIndexes?.[index]) || Number(merged.priceRevision.baseIndexValue) || 100
  );
  if (merged.projectInfoLocked === undefined) merged.projectInfoLocked = false;
  return merged;
}

const TABS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'budget', label: 'Budget évolution', icon: TrendingUp },
  { id: 'evolution', label: 'Évolution du BMG', icon: BarChart3 },
  { id: 'subcontractors', label: 'ST', icon: Users },
  { id: 'rad', label: 'RAD', icon: Calendar },
  { id: 'epicier', label: "Cahier d'épicier", icon: Receipt },
  { id: 'prorata', label: 'Prorata', icon: PieChartIcon },
  { id: 'revision', label: 'Révision', icon: Scale }
];

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <label className="text-xs font-medium text-slate-400">{label}</label>
        {hint ? <span className="text-[10px] text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200/10 bg-white/5',
    indigo: 'border-indigo-500/25 bg-indigo-500/10',
    emerald: 'border-emerald-500/25 bg-emerald-500/10',
    rose: 'border-rose-500/25 bg-rose-500/10',
    amber: 'border-amber-500/25 bg-amber-500/10'
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-slate-400">{sub}</div> : null}
    </div>
  );
}

function ActionButton({ children, onClick, tone = 'slate', icon: Icon, className = '' }) {
  const styles = {
    slate: 'border-slate-200/10 bg-white/5 text-slate-200 hover:bg-white/10',
    indigo: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-100 hover:bg-indigo-500/25',
    emerald: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${styles[tone]} ${className}`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export default function App() {
  const [project, setProject] = useState(() => {
    try {
      const saved = localStorage.getItem('bmg_project_data');
      return saved ? normalizeProjectData(JSON.parse(saved)) : normalizeProjectData(makeBlankProject());
    } catch (error) {
      console.error('Impossible de charger les données BMG :', error);
      return normalizeProjectData(makeBlankProject());
    }
  });

  // Client-side convenience gate only: NOT a security boundary for a public Vercel deployment.
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessRole, setAccessRole] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [showAccessPassword, setShowAccessPassword] = useState(false);
  const [showAdminPasswordDraft, setShowAdminPasswordDraft] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [adminPasswordDraft, setAdminPasswordDraft] = useState('');
  const [showAccessSettings, setShowAccessSettings] = useState(false);
  const [loginMode, setLoginMode] = useState('user');
  const [backupDirty, setBackupDirty] = useState(false);
  const [backupNotice, setBackupNotice] = useState('');
  const [pendingImport, setPendingImport] = useState(null);
  const lastBackupRef = useRef(null);
  const [userAccessPassword, setUserAccessPassword] = useState(() => {
    try { return localStorage.getItem('bmg_user_password') || 'tempere123'; }
    catch { return 'tempere123'; }
  });
  const checkAccess = (e) => {
    e.preventDefault();
    if (loginMode === 'admin' && accessPassword === 'tempere1974') {
      setAccessRole('admin'); setAccessGranted(true); setShowAccessSettings(true); setAccessError('');
    } else if (loginMode === 'user' && accessPassword === userAccessPassword) {
      setAccessRole('user'); setAccessGranted(true); setShowAccessSettings(false); setAccessError('');
    } else setAccessError('Mot de passe incorrect pour le mode sélectionné.');
    setAccessPassword('');
  };
  const changeUserPassword = (e) => {
    e.preventDefault();
    if (accessRole !== 'admin' || adminPasswordDraft.trim().length < 8) return;
    localStorage.setItem('bmg_user_password', adminPasswordDraft.trim());
    setUserAccessPassword(adminPasswordDraft.trim());
    setAdminPasswordDraft('');
    setShowAccessSettings(false);
    alert('Mot de passe utilisateur modifié sur ce navigateur uniquement.');
  };

  const [monthDisplayMode, setMonthDisplayMode] = useState('recent6');
  const [monthWindowEnd, setMonthWindowEnd] = useState(null);
  const visibleMonthEntries = useMemo(() => {
    const months = project.months || [];
    const length = months.length;
    const windowSize = monthDisplayMode === 'recent12' ? 12 : monthDisplayMode === 'recent6' ? 6 : length;
    const end = Math.min(length, Math.max(1, monthWindowEnd === null ? length : monthWindowEnd));
    const start = monthDisplayMode === 'all' ? 0 : Math.max(0, end - windowSize);
    const stop = monthDisplayMode === 'all' ? length : end;
    return months.map((label, index) => ({label, index})).slice(start, stop);
  }, [project.months, monthDisplayMode, monthWindowEnd]);
  const visibleMonths = visibleMonthEntries.map(e => e.label);
  const monthControls = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm">
      <div className="flex items-center gap-2"><span className="font-semibold text-slate-200">Période affichée</span><span className="text-slate-400">{visibleMonthEntries[0]?.label || '—'} → {visibleMonthEntries[visibleMonthEntries.length-1]?.label || '—'}</span></div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Nombre de mois visibles" value={monthDisplayMode} onChange={e => {setMonthDisplayMode(e.target.value); setMonthWindowEnd(null);}} className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-100">
          <option value="recent6">6 mois</option><option value="recent12">12 mois</option><option value="all">Tous les mois</option>
        </select>
        {monthDisplayMode !== 'all' && <>
          <button type="button" onClick={() => setMonthWindowEnd(v => Math.max(monthDisplayMode === 'recent12' ? 12 : 6, (v ?? project.months.length) - (monthDisplayMode === 'recent12' ? 12 : 6)))} className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-100">← Anciens mois</button>
          <button type="button" onClick={() => setMonthWindowEnd(v => Math.min(project.months.length, (v ?? project.months.length) + (monthDisplayMode === 'recent12' ? 12 : 6)))} className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-100">Mois suivants →</button>
          <button type="button" onClick={() => setMonthWindowEnd(null)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white">Derniers mois</button>
        </>}
      </div>
      <p className="w-full text-xs text-slate-400">Les mois masqués restent enregistrés et inclus dans les totaux du chantier.</p>
    </div>
  );
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bmgPresentationLabel, setBmgPresentationLabel] = useState('');
  const [bmgReferenceId, setBmgReferenceId] = useState('');
  const [bmgTargetId, setBmgTargetId] = useState('current');
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showStartGuide, setShowStartGuide] = useState(true);
  const [guideStep, setGuideStep] = useState(0);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showSTModal, setShowSTModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [newProrataName, setNewProrataName] = useState('');
  const [stOrderDrafts, setSTOrderDrafts] = useState({});
  const [expandedST, setExpandedST] = useState({});
  const [amendmentForm, setAmendmentForm] = useState({ number: '', date: '', amount: '', allocations: {} });
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);

  const [newTransfer, setNewTransfer] = useState({ fromCode: '', toCode: '', amount: '', reason: '' });
  const [newExpense, setNewExpense] = useState({
    period: '',
    supplier: '',
    description: '',
    subCode: '',
    poNumber: '',
    poAmount: '',
    deliveryDate: '',
    invoiceDate: '',
    invoiceAmount: '',
    stId: ''
  });
  const [newST, setNewST] = useState({
    code: '',
    company: '',
    statusContract: 'En cours',
    agreement: 'En attente',
    dgd: 'Non',
    initialMarket: '',
    prorataRate: 2,
    modifications: 0,
    toRegularize: 0
  });
  const [newCode, setNewCode] = useState({
    family: 'Sous-traitance',
    tradeKey: 'STPE',
    customCode: '',
    label: '',
    unit: 'forfait',
    pu: 0,
    qty: 1,
    totalBudget: 0,
    calculationMode: 'direct',
    useCustomCode: false
  });

  const [expenseFilterPeriod, setExpenseFilterPeriod] = useState('ALL');
  const [expenseFilterSupplier, setExpenseFilterSupplier] = useState('');
  const [expenseFilterCode, setExpenseFilterCode] = useState('ALL');

  useEffect(() => {
    const serialized = JSON.stringify(project);
    localStorage.setItem('bmg_project_data', serialized);
    if (lastBackupRef.current === null) {
      // Les données déjà présentes dans le navigateur ne sont pas une sauvegarde JSON exportée.
      setBackupDirty(true);
    } else {
      setBackupDirty(serialized !== lastBackupRef.current);
    }
  }, [project]);

  useEffect(() => {
    if (!backupDirty) return;
    const warnOnClose = (event) => {
      event.preventDefault();
      event.returnValue = true; // Le navigateur affiche son propre texte, non personnalisable.
    };
    window.addEventListener('beforeunload', warnOnClose);
    return () => window.removeEventListener('beforeunload', warnOnClose);
  }, [backupDirty]);

  const exportBackup = () => {
    const serialized = JSON.stringify(project);
    const blob = new Blob([JSON.stringify(makeBackup(project), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bmg_${String(project.name || 'chantier').toLowerCase().replace(/[^a-z0-9_-]+/gi, '_')}_${new Date().toISOString().slice(0,10)}_v1.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    lastBackupRef.current = serialized;
    setBackupDirty(false);
    setBackupNotice('Export JSON lancé. Vérifiez que le fichier est bien présent dans Téléchargements avant de fermer BMG.');
  };

  const downloadSafetyCopy = () => {
    const blob = new Blob([JSON.stringify(makeBackup(project), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bmg_securite_avant_import_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const confirmMigration = () => {
    if (!pendingImport) return;
    try {
      // Normaliser sur une copie, sans jamais modifier le chantier actif avant validation.
      const migrated = normalizeProjectData(pendingImport.project);
      if (!window.confirm(`Remplacer le chantier actuellement ouvert par « ${migrated.name || 'Sans nom'} » ?\nUne copie de sécurité va être téléchargée automatiquement. Vérifiez sa présence dans Téléchargements.`)) return;
      downloadSafetyCopy();
      setProject(migrated);
      lastBackupRef.current = null; // imposer un nouvel export après conversion
      setBackupDirty(true);
      setPendingImport(null);
      setActiveTab('dashboard');
      setBackupNotice('Chantier importé et converti. Contrôlez les écarts dans Tableau de bord → Contrôles puis exportez un nouveau JSON versionné.');
    } catch (error) { alert(`Migration impossible : ${error.message}`); }
  };

  const updateProject = (field, value) => {
    if (project.projectInfoLocked) return;
    setProject(prev => ({ ...prev, [field]: value }));
  };

  const toggleLockProjectInfo = () => setProject(prev => ({ ...prev, projectInfoLocked: !prev.projectInfoLocked }));
  const toggleLockCode = (code) => setProject(prev => ({
    ...prev,
    imputationCodes: prev.imputationCodes.map(c => c.code === code ? { ...c, locked: !c.locked } : c)
  }));
  const toggleLockST = (id) => setProject(prev => ({
    ...prev,
    subContractors: prev.subContractors.map(st => st.id === id ? { ...st, locked: !st.locked } : st)
  }));
  const toggleLockExpense = (id) => setProject(prev => ({
    ...prev,
    expenses: prev.expenses.map(e => e.id === id ? { ...e, locked: !e.locked } : e)
  }));
  const toggleLockProrata = (id) => setProject(prev => ({
    ...prev,
    prorataItems: prev.prorataItems.map(p => p.id === id ? { ...p, locked: !p.locked } : p)
  }));

  const budgetInitialByCode = useMemo(() => {
    const map = {};
    project.imputationCodes.forEach(c => {
      map[c.code] = Number(c.qty || 0) * Number(c.pu || 0);
    });
    return map;
  }, [project.imputationCodes]);

  const amendmentAllocationsByCode = useMemo(() => {
    const result = {};
    (project.clientAmendments || []).forEach(amendment => {
      Object.entries(amendment.allocations || {}).forEach(([code, amount]) => {
        result[code] = (result[code] || 0) + (Number(amount) || 0);
      });
    });
    return result;
  }, [project.clientAmendments]);
  const totalClientAmendments = (project.clientAmendments || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const actualizedClientMarket = (Number(project.clientBudget) || 0) + totalClientAmendments;

  const adjustedBudgets = useMemo(() => {
    const map = { ...budgetInitialByCode };
    Object.entries(amendmentAllocationsByCode).forEach(([code, amount]) => { if (code in map) map[code] += amount; });
    project.transfers.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (map[t.fromCode] !== undefined) map[t.fromCode] -= amt;
      if (map[t.toCode] !== undefined) map[t.toCode] += amt;
    });
    return map;
  }, [budgetInitialByCode, amendmentAllocationsByCode, project.transfers]);

  const currentBmgCapture = useMemo(() => captureBmg(project, adjustedBudgets), [project, adjustedBudgets]);
  const bmgHistory = project.bmgHistory || [];
  const bmgComparison = useMemo(() => {
    const previous = bmgHistory.find(s => s.id === bmgReferenceId) || bmgHistory[bmgHistory.length - 1];
    const target = bmgTargetId === 'current' ? currentBmgCapture : bmgHistory.find(s => s.id === bmgTargetId) || currentBmgCapture;
    return previous ? compareBmg(previous, target) : null;
  }, [bmgHistory, bmgReferenceId, bmgTargetId, currentBmgCapture]);
  const publishBmg = () => {
    const nextNumber = (project.bmgHistory || []).length + 1;
    const label = bmgPresentationLabel.trim() || `BMG n°${nextNumber}`;
    if (!window.confirm(`Figer « ${label} » comme présentation n°${nextNumber} ?\nLes chiffres de cette présentation resteront inchangés.`)) return;
    const snapshot = { ...currentBmgCapture, id: `${Date.now()}-${nextNumber}`, number: nextNumber, label, createdAt: new Date().toISOString() };
    setProject(prev => ({ ...prev, bmgHistory: [...(prev.bmgHistory || []), snapshot] }));
    setBmgPresentationLabel('');
    setBmgTargetId('current');
    setBmgReferenceId(snapshot.id);
  };

  const actualExpensesByCode = useMemo(() => {
    const map = {};
    project.expenses.forEach(e => {
      map[e.subCode] = (map[e.subCode] || 0) + (parseFloat(e.invoiceAmount) || 0);
    });
    return map;
  }, [project.expenses]);

  const stTotalsByCode = useMemo(() => {
    const map = {};
    project.subContractors.forEach(st => {
      const code = st.code;
      const totalContract = stNetAfterProrata(st);
      const radSum = (st.radMonthly || []).reduce((a, b) => a + b, 0);
      if (!map[code]) map[code] = { totalContract: 0, radSum: 0, linearized: true };
      map[code].totalContract += totalContract;
      map[code].radSum += radSum;
      if (Math.round((totalContract - radSum) * 100) !== 0) map[code].linearized = false;
    });
    return map;
  }, [project.subContractors]);

  const radNonSTTotals = useMemo(() => {
    const map = {};
    Object.keys(project.radNonST || {}).forEach(code => {
      map[code] = (project.radNonST[code] || []).reduce((a, b) => a + (Number(b) || 0), 0);
    });
    map.PRORATA = (project.prorataItems || []).reduce((sum, item) =>
      sum + (item.monthly || []).reduce((a, b) => a + (Number(b) || 0), 0), 0);
    return map;
  }, [project.radNonST, project.prorataItems]);

  const priceRevisionCalculations = useMemo(() => {
    const revConfig = project.priceRevision || { enabled: false, baseIndexValue: 100, fixedPart: 0.15, variablePart: 0.85, monthlyIndexes: [] };
    const i0 = parseFloat(revConfig.baseIndexValue) || 1;
    const a = Number.isFinite(Number(revConfig.fixedPart)) ? Number(revConfig.fixedPart) : 0.15;
    const b = Number.isFinite(Number(revConfig.variablePart)) ? Number(revConfig.variablePart) : 0.85;

    const monthlyData = (project.months || []).map((mLabel, mIdx) => {
      const iN = parseFloat(revConfig.monthlyIndexes?.[mIdx]) || i0;
      const kCoeff = revConfig.enabled ? (a + b * (iN / i0)) : 1;
      const revisionRate = kCoeff - 1;
      const baseBilling = parseFloat(project.clientSalesPlan?.[mIdx]) || 0;
      const revisionAmount = baseBilling * revisionRate;
      const revisedBilling = baseBilling + revisionAmount;

      return { month: mLabel, indexValue: iN, kCoeff, revisionRate, baseBilling, revisionAmount, revisedBilling };
    });

    const totalRevisionAmount = monthlyData.reduce((acc, curr) => acc + curr.revisionAmount, 0);
    const totalRevisedClientBudget = (parseFloat(project.clientBudget) || 0) + (revConfig.enabled ? totalRevisionAmount : 0);

    return { enabled: revConfig.enabled, i0, a, b, monthlyData, totalRevisionAmount, totalRevisedClientBudget };
  }, [project.priceRevision, project.clientSalesPlan, project.clientBudget, project.months]);

  const metrics = useMemo(() => {
    const totalInitialBudget = Object.values(budgetInitialByCode).reduce((a, b) => a + b, 0);
    const totalAdjustedBudget = Object.values(adjustedBudgets).reduce((a, b) => a + b, 0);
    const totalEngagedActual = Object.values(actualExpensesByCode).reduce((a, b) => a + b, 0);

    let totalRad = 0;
    project.imputationCodes.forEach(c => {
      totalRad += c.family === 'Sous-traitance' ? (stTotalsByCode[c.code]?.radSum || 0) : (radNonSTTotals[c.code] || 0);
    });

    const forecastCostAtCompletion = totalEngagedActual + totalRad;
    const clientBudget = parseFloat(project.clientBudget) || 0;
    const billedToClientActual = parseFloat(project.billedToClientActual) || 0;
    const overheadRate = project.overheadRate === '' ? 15 : (Number.isFinite(Number(project.overheadRate)) ? Math.min(100, Math.max(0, Number(project.overheadRate))) : 15);
    const effectiveClientBudget = actualizedClientMarket + (priceRevisionCalculations.enabled ? priceRevisionCalculations.totalRevisionAmount : 0);

    const initialGrossMargin = clientBudget - totalInitialBudget;
    const initialOverhead = clientBudget * (overheadRate / 100);
    const initialNetResult = initialGrossMargin - initialOverhead;
    const initialNetMarginPercent = clientBudget > 0 ? (initialNetResult / clientBudget) * 100 : 0;

    const actualGrossMargin = billedToClientActual - totalEngagedActual;
    const actualOverhead = billedToClientActual * (overheadRate / 100);
    const actualNetResult = actualGrossMargin - actualOverhead;
    const actualNetMarginPercent = billedToClientActual > 0 ? (actualNetResult / billedToClientActual) * 100 : 0;

    const forecastGrossMargin = effectiveClientBudget - forecastCostAtCompletion;
    const forecastOverhead = effectiveClientBudget * (overheadRate / 100);
    const forecastNetResult = forecastGrossMargin - forecastOverhead;
    const forecastNetMarginPercent = effectiveClientBudget > 0 ? (forecastNetResult / effectiveClientBudget) * 100 : 0;

    return {
      totalInitialBudget,
      totalAdjustedBudget,
      totalEngagedActual,
      totalRad,
      forecastCostAtCompletion,
      clientBudget,
      actualizedClientMarket,
      effectiveClientBudget,
      billedToClientActual,
      overheadRate,
      initialGrossMargin,
      initialOverhead,
      initialNetResult,
      initialNetMarginPercent,
      actualGrossMargin,
      actualOverhead,
      actualNetResult,
      actualNetMarginPercent,
      forecastGrossMargin,
      forecastOverhead,
      forecastNetResult,
      forecastNetMarginPercent
    };
  }, [budgetInitialByCode, adjustedBudgets, actualExpensesByCode, stTotalsByCode, radNonSTTotals, project, priceRevisionCalculations, actualizedClientMarket]);

  const familyChartData = useMemo(() => {
    const families = ['Main-d’œuvre', 'Encadrement', 'Matériaux', 'Location', 'Sous-traitance', 'Frais divers'];
    return families.map(f => {
      const codes = project.imputationCodes.filter(c => c.family === f).map(c => c.code);
      const reajustedSum = codes.reduce((acc, code) => acc + (adjustedBudgets[code] || 0), 0);
      const engagedSum = codes.reduce((acc, code) => acc + (actualExpensesByCode[code] || 0), 0);
      return { family: f, Réajusté: reajustedSum, Engagé: engagedSum };
    });
  }, [project.imputationCodes, adjustedBudgets, actualExpensesByCode]);

  const aiDiagnostics = useMemo(() => {
    const alerts = [];
    const studyBudget = project.studyDisbursementBudget;
    if (studyBudget !== null && studyBudget !== undefined && Math.abs(Number(studyBudget) - metrics.totalInitialBudget) > 0.01) {
      alerts.push({ id: 'study-budget', code: 'ETUDES', title: 'Écart budget études / imputations', message: `Budget études déboursé : ${Number(studyBudget).toLocaleString('fr-FR')} € HT ; total initial attribué : ${metrics.totalInitialBudget.toLocaleString('fr-FR')} € HT. Écart : ${(Number(studyBudget) - metrics.totalInitialBudget).toLocaleString('fr-FR')} € HT.`, action: 'Contrôler le budget études dans la configuration et les montants initiaux dans Budget évolution.' });
    }
    
    const amendmentDifference = (project.clientAmendments || []).reduce((sum, a) => sum + (Number(a.amount) || 0) - Object.values(a.allocations || {}).reduce((t, v) => t + (Number(v) || 0), 0), 0);
    if (amendmentDifference < -0.01) alerts.push({ id: 'amendments', code: 'AVENANTS', title: 'Avenants sur-affectés', message: `Sur-affectation : ${(-amendmentDifference).toLocaleString('fr-FR')} € HT.`, action: 'Corriger la répartition des avenants dans Budget évolution.' });
    const baseSalesTotal = (project.clientSalesPlan || []).reduce((sum,v)=>sum+(Number(v)||0),0);
    if (Math.abs(baseSalesTotal - (Number(project.clientBudget)||0)) > 0.01) alerts.push({ id: 'billing-base', code: 'FACTURATION', title: 'Marché de base : facturation prévisionnelle non concordante', message: `Prévision ${euro(baseSalesTotal)} € / marché de base ${euro(project.clientBudget)} €.`, action: 'Corriger les montants mensuels dans RAD.' });
    (project.clientAmendments || []).forEach(a => {
      const billed = (a.billingMonthly || []).reduce((sum,v) => sum + (Number(v)||0), 0);
      if (Math.abs(billed - (Number(a.amount)||0)) > 0.01) alerts.push({ id: `billing-${a.id}`, code: 'FACTURATION', title: `Avenant ${a.number} non totalement planifié`, message: `Facturation prévue ${euro(billed)} € / avenant ${euro(a.amount)} €.`, action: 'Ventiler la facturation prévisionnelle dans RAD.' });
    });
    project.imputationCodes.forEach(c => {
      const budget = adjustedBudgets[c.code] || 0;
      const engaged = actualExpensesByCode[c.code] || 0;
      const forecast = c.code === 'PRORATA' ? (radNonSTTotals.PRORATA || 0) : c.family === 'Sous-traitance' ? (stTotalsByCode[c.code]?.radSum || 0) : (radNonSTTotals[c.code] || 0);
      if (engaged + forecast > budget + 0.01) alerts.push({ id: `overrun-${c.code}`, code: c.code, title: `Dépassement prévisionnel ${c.code}`, message: `Budget actualisé ${budget.toLocaleString('fr-FR')} € ; engagé + RAD ${ (engaged + forecast).toLocaleString('fr-FR') } €.`, action: 'Vérifier les dépenses et ajuster la prévision ou le budget.' });
    });

    project.subContractors.forEach(st => {
      const balance = stBalance(st, project.expenses, project.subContractors);
      if (balance.differenceCents !== 0) alerts.push({
        id: `st-reconcile-${st.id}`,
        code: st.code,
        title: `Factures ST / RAD à rapprocher : ${st.company}`,
        message: `Marché net de prorata ${euro(euros(balance.netMarketCents))} € − factures/avoirs ST ${euro(euros(balance.billedCents))} € = RAD attendu ${euro(euros(balance.remainingCents))} €. RAD saisi ${euro(euros(balance.radCents))} € ; écart ${euro(euros(balance.differenceCents))} € (tolérance : 0,00 €).`,
        action: 'Ouvrir ST et modifier manuellement la ventilation mensuelle du RAD restant.'
      });
    });

    if (metrics.forecastNetMarginPercent < 5) {
      alerts.push({
        id: 'margin-alert',
        code: 'MARGE',
        title: `Marge nette prévisionnelle faible (${metrics.forecastNetMarginPercent.toFixed(2)}%)`,
        message: `La marge nette d'atterrissage est inférieure à l'objectif de 5%. Résultat estimé : ${metrics.forecastNetResult.toLocaleString('fr-FR')} € HT.`,
        action: `Revoir les prévisions RAD ou renégocier les avenants sous-traitants.`
      });
    }

    return alerts;
  }, [project, stTotalsByCode, metrics, adjustedBudgets, actualExpensesByCode, radNonSTTotals]);

  const functionalControls = useMemo(() => auditProject(project), [project]);
  const controlsByTab = TABS.map(tab => ({
    ...tab,
    items: functionalControls.filter(item => item.tab === tab.id),
  }));
  const errorsCount = functionalControls.filter(item => item.severity === 'error').length;
  const warningsCount = functionalControls.filter(item => item.severity === 'warning').length;

  const TRADE_CODES_DICTIONARY = {
    'Sous-traitance': [
      { code: 'STDE', label: 'Désamiantage / Dépollution' },
      { code: 'STGO', label: 'Gros œuvre / Maçonnerie' },
      { code: 'STET', label: 'Étanchéité toiture' },
      { code: 'STCO', label: 'Couverture' },
      { code: 'STBA', label: 'Bardage' },
      { code: 'STRA', label: 'Ravalement / Façade' },
      { code: 'STSE', label: 'Serrurerie / Métallerie' },
      { code: 'STPB', label: 'Plomberie - CVC' },
      { code: 'STEL', label: 'Électricité / Courants faibles' },
      { code: 'STAS', label: 'Ascenseurs' },
      { code: 'STPL', label: 'Plâtrerie / Cloisons' },
      { code: 'STMI', label: 'Menuiseries intérieures' },
      { code: 'STME', label: 'Menuiseries extérieures' },
      { code: 'STPE', label: 'Peinture / Revêtements' },
      { code: 'STRS', label: 'Revêtements de sol' },
      { code: 'STVRD', label: 'VRD / Aménagements extérieurs' }
    ],
    'Matériaux': [
      { code: 'MXBE', label: 'Béton prêt à l’emploi' },
      { code: 'MXFE', label: 'Acier / Ferraillage' },
      { code: 'MXMO', label: 'Mortiers et ciments' },
      { code: 'MXPA', label: 'Parpaings / Maçonnerie' },
      { code: 'MXPR', label: 'Éléments préfabriqués' },
      { code: 'MXIS', label: 'Isolants & rupteurs' },
      { code: 'MXME', label: 'Menuiseries extérieures' },
      { code: 'MXMI', label: 'Menuiseries intérieures' },
      { code: 'MXPB', label: 'Plomberie CVC' },
      { code: 'MXVRD', label: 'VRD' }
    ],
    'Location': [
      { code: 'MLLOEN', label: 'Engins motorisés & nacelles' },
      { code: 'MLLOCO', label: 'Coffrages & étaiements' },
      { code: 'MLLOGR', label: 'Grue à tour' },
      { code: 'MLLOPO', label: 'Petit outillage' },
      { code: 'MLLOEC', label: 'Échafaudages' },
      { code: 'MLLOIC', label: 'Installation de chantier' }
    ],
    'Main-d’œuvre': [{ code: 'MO', label: 'Main-d’œuvre ouvrière' }],
    'Encadrement': [{ code: 'CC', label: 'Chef de chantier' }],
    'Frais divers': [{ code: 'ACHA', label: 'Achats divers, Prorata & Frais généraux' }]
  };

  const handleUpdateDates = (newStartDate, newEndDate) => {
    if (project.projectInfoLocked) return;
    const startStr = newStartDate !== undefined ? newStartDate : project.startDate;
    const endStr = newEndDate !== undefined ? newEndDate : project.endDate;
    const { monthsCount: newCount, months: newMonths } = generateMonthLabels(startStr, endStr);

    const newRadNonST = { ...project.radNonST };
    Object.keys(newRadNonST).forEach(code => {
      const current = newRadNonST[code] || [];
      newRadNonST[code] = current.length < newCount ? [...current, ...Array(newCount - current.length).fill(0)] : current.slice(0, newCount);
    });

    const newSubContractors = project.subContractors.map(st => {
      const current = st.radMonthly || [];
      const newRad = current.length < newCount ? [...current, ...Array(newCount - current.length).fill(0)] : current.slice(0, newCount);
      return { ...st, radMonthly: newRad };
    });

    const newProrata = project.prorataItems.map(p => {
      const current = p.monthly || [];
      const newMonthly = current.length < newCount ? [...current, ...Array(newCount - current.length).fill(0)] : current.slice(0, newCount);
      return { ...p, monthly: newMonthly };
    });
    const resizeMonthly = (values, fallback = 0) => {
      const current = Array.isArray(values) ? values : [];
      return current.length < newCount
        ? [...current, ...Array(newCount - current.length).fill(fallback)]
        : current.slice(0, newCount);
    };
    const newSalesPlan = resizeMonthly(project.clientSalesPlan, 0);
    const newAmendments = (project.clientAmendments || []).map(a => ({ ...a, billingMonthly: resizeMonthly(a.billingMonthly, 0) }));
    const newRevisionIndexes = resizeMonthly(project.priceRevision?.monthlyIndexes, Number(project.priceRevision?.baseIndexValue) || 100);

    setProject(prev => ({
      ...prev,
      startDate: startStr,
      endDate: endStr,
      monthsCount: newCount,
      months: newMonths,
      radNonST: newRadNonST,
      subContractors: newSubContractors,
      prorataItems: newProrata,
      clientSalesPlan: newSalesPlan,
      clientAmendments: newAmendments,
      priceRevision: { ...prev.priceRevision, monthlyIndexes: newRevisionIndexes }
    }));
  };

  const handleUpdateCodeInline = (code, field, value) => {
    const target = project.imputationCodes.find(c => c.code === code);
    if (target?.locked) return;
    setProject(prev => ({
      ...prev,
      imputationCodes: prev.imputationCodes.map(c => {
        if (c.code !== code) return c;
        if (field === 'unit' && value.toLowerCase() === 'forfait') {
          // Conserver le budget existant lors du passage en forfait.
          return { ...c, unit: 'forfait', qty: 1, pu: (Number(c.qty) || 0) * (Number(c.pu) || 0) };
        }
        if (field === 'unit') return { ...c, unit: value };
        const val = (field === 'qty' || field === 'pu') ? (parseFloat(value) || 0) : value;
        return { ...c, [field]: val };
      })
    }));
  };

  const handleAddCode = (e) => {
    e.preventDefault();
    let finalCode = '';
    let defaultLabel = newCode.label;

    if (!newCode.useCustomCode && TRADE_CODES_DICTIONARY[newCode.family]) {
      finalCode = newCode.tradeKey;
      const foundTrade = TRADE_CODES_DICTIONARY[newCode.family].find(t => t.code === finalCode);
      if (foundTrade && !newCode.label) defaultLabel = foundTrade.label;
    } else {
      finalCode = (newCode.customCode || '').toUpperCase().trim();
    }

    if (!/^[A-Z0-9_-]{2,24}$/.test(finalCode) || finalCode === 'PRORATA') { alert('Code invalide ou réservé.'); return; }
    if (project.imputationCodes.some(c => c.code === finalCode)) { alert('Ce code existe déjà. Modifiez son budget directement dans le tableau.'); return; }

    let finalPu = parseFloat(newCode.pu) || 0;
    let finalQty = parseFloat(newCode.qty) || 1;
    if (newCode.calculationMode === 'direct') {
      const tot = parseFloat(newCode.totalBudget) || 0;
      finalPu = tot;
      finalQty = 1;
    }

    const newItem = {
      family: newCode.family,
      code: finalCode,
      label: defaultLabel || finalCode,
      unit: newCode.unit || 'forfait',
      pu: finalPu,
      qty: finalQty,
      locked: false
    };

    setProject(prev => {
      const exists = prev.imputationCodes.some(c => c.code === finalCode);
      const updatedCodes = exists
        ? prev.imputationCodes.map(c => c.code === finalCode ? newItem : c)
        : [...prev.imputationCodes, newItem];

      let updatedST = [...prev.subContractors];
      if (newCode.family === 'Sous-traitance' && !updatedST.some(s => s.code === finalCode)) {
        updatedST.push({
          id: Date.now(),
          code: finalCode,
          company: defaultLabel.toUpperCase() || 'NOUVEAU ST',
          statusContract: 'En cours',
          agreement: 'En attente',
          dgd: 'Non',
          initialMarket: 0,
          prorataRate: 2,
          modifications: 0,
          toRegularize: 0,
          radMonthly: Array(prev.monthsCount).fill(0),
          locked: false
        });
      }

      const updatedRadNonST = { ...prev.radNonST };
      if (newCode.family !== 'Sous-traitance' && finalCode !== 'PRORATA' && !updatedRadNonST[finalCode]) {
        updatedRadNonST[finalCode] = Array(prev.monthsCount).fill(0);
      }

      return { ...prev, imputationCodes: updatedCodes, subContractors: updatedST, radNonST: updatedRadNonST };
    });

    setShowCodeModal(false);
    setNewCode({ family: 'Sous-traitance', tradeKey: 'STPE', customCode: '', useCustomCode: false, label: '', unit: 'forfait', pu: 0, qty: 1, totalBudget: 0, calculationMode: 'direct' });
  };

  const handleAddClientAmendment = (e) => {
    e.preventDefault();
    const amount = Number(amendmentForm.amount);
    const allocations = Object.fromEntries(Object.entries(amendmentForm.allocations).filter(([,v]) => Number(v) !== 0).map(([k,v]) => [k, Number(v)]));
    const allocated = Object.values(allocations).reduce((a,b) => a+b, 0);
    if (!amendmentForm.number.trim() || !amendmentForm.date || !Number.isFinite(amount) || amount === 0 || (amount > 0 && (allocated < -0.01 || allocated > amount + 0.01)) || (amount < 0 && (allocated > 0.01 || allocated < amount - 0.01))) {
      alert('Renseignez le numéro et la date. Le montant attribué ne peut pas dépasser le montant de l’avenant.'); return;
    }
    if (Object.keys(allocations).some(code => !project.imputationCodes.some(c => c.code === code))) { alert('Un code de ventilation est introuvable.'); return; }
    if ((project.clientAmendments || []).some(a => a.number.trim().toLowerCase() === amendmentForm.number.trim().toLowerCase())) { alert('Ce numéro d’avenant existe déjà.'); return; }
    setProject(prev => ({ ...prev, clientAmendments: [...(prev.clientAmendments || []), { id: Date.now(), number: amendmentForm.number.trim(), date: amendmentForm.date, amount, allocations, billingMonthly: Array(prev.months.length).fill(0) }] }));
    setAmendmentForm({ number: '', date: '', amount: '', allocations: {} });
    setShowAmendmentForm(false);
  };

  const handleDeleteCode = (codeToDelete) => {
    const item = project.imputationCodes.find(c => c.code === codeToDelete);
    if (!item) return;
    if (codeToDelete === 'PRORATA') {
      const hasAmendment = (project.clientAmendments || []).some(a => Number(a.allocations?.PRORATA) !== 0);
      const hasExpenses = project.expenses.some(e => e.subCode === 'PRORATA');
      const hasTransfer = project.transfers.some(t => t.fromCode === 'PRORATA' || t.toCode === 'PRORATA');
      if (hasAmendment || hasExpenses || hasTransfer) { alert('PRORATA est utilisé dans une imputation, un avenant ou une dépense. Régularisez ces écritures avant suppression.'); return; }
      if (!window.confirm('Supprimer le code PRORATA et toutes ses ventilations détaillées ? Cette opération est irréversible sans sauvegarde JSON.')) return;
      setProject(prev => ({ ...prev, prorataRemoved: true, prorataBudget: 0,
        prorataItems: [], imputationCodes: prev.imputationCodes.filter(c => c.code !== 'PRORATA') }));
      return;
    }
    if (item.locked) return;
    const hasAmendment = (project.clientAmendments || []).some(a => Number(a.allocations?.[codeToDelete]) !== 0);
    const hasTransfer = project.transfers.some(t => t.fromCode === codeToDelete || t.toCode === codeToDelete);
    const hasExpenses = project.expenses.some(exp => exp.subCode === codeToDelete);
    const hasRad = (project.radNonST[codeToDelete] || []).some(value => Number(value) !== 0);
    const hasST = project.subContractors.some(st => st.code === codeToDelete && (
      Number(st.initialMarket) || Number(st.modifications) || Number(st.toRegularize) ||
      (st.radMonthly || []).some(value => Number(value) !== 0)
    ));
    if (hasExpenses || hasRad || hasST || hasAmendment || hasTransfer) {
      alert('Suppression impossible : ce code contient déjà des dépenses, un RAD ou un marché ST. Régularisez ces éléments avant de le supprimer.');
      return;
    }
    setProject(prev => {
      const nextRad = { ...prev.radNonST };
      delete nextRad[codeToDelete];
      return {
        ...prev,
        imputationCodes: prev.imputationCodes.filter(c => c.code !== codeToDelete),
        subContractors: prev.subContractors.filter(st => st.code !== codeToDelete),
        radNonST: nextRad
      };
    });
  };

  const handleUpdateSTField = (id, field, value) => {
    setProject(prev => ({
      ...prev,
      subContractors: prev.subContractors.map(st => st.id === id
        ? st.locked ? st : { ...st, [field]: value }
        : st
      )
    }));
  };

  const updateSTAmount = (id, field, raw) => {
    const amount = Number(raw);
    if (raw !== '' && raw !== '-' && raw !== '.' && raw !== '-.' && !Number.isFinite(amount)) return;
    if (field === 'prorataRate' && raw !== '' && (amount < 0 || amount > 100)) return;
    setProject(prev => ({ ...prev, subContractors: prev.subContractors.map(st =>
      st.id === id && !st.locked ? { ...st, [field]: raw === '' || raw === '-' || raw === '.' || raw === '-.' ? raw : amount } : st
    ) }));
  };

  const updateSTOrder = (id, kind, orderId, field, value) => {
    const listKey = kind === 'modification' ? 'modificationOrders' : 'pendingOrders';
    setProject(prev => ({ ...prev, subContractors: prev.subContractors.map(st => {
      if (st.id !== id || st.locked) return st;
      const nextOrders = (st[listKey] || []).map(order => order.id === orderId
        ? { ...order, [field]: field === 'amount' ? (value === '' || value === '-' || value === '.' || value === '-.' ? value : Number(value)) : value }
        : order);
      return { ...st, [listKey]: nextOrders,
        [kind === 'modification' ? 'modifications' : 'toRegularize']: stOrderSum(nextOrders) };
    }) }));
  };

  const addSTOrder = (id, kind) => {
    const key = `${id}-${kind}`;
    const draft = stOrderDrafts[key] || {};
    if (!String(draft.reference || '').trim() || !Number.isFinite(Number(draft.amount)) || String(draft.amount ?? '').trim() === '') {
      alert('Renseigner une référence et un montant valide.'); return;
    }
    const listKey = kind === 'modification' ? 'modificationOrders' : 'pendingOrders';
    setProject(prev => ({ ...prev, subContractors: prev.subContractors.map(st => {
      if (st.id !== id || st.locked) return st;
      const nextOrders = [...(st[listKey] || []), { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, reference: draft.reference.trim(), amount: Number(draft.amount) }];
      return { ...st, [listKey]: nextOrders,
        [kind === 'modification' ? 'modifications' : 'toRegularize']: stOrderSum(nextOrders) };
    }) }));
    setSTOrderDrafts(prev => ({ ...prev, [key]: { reference: '', amount: '' } }));
  };

  const deleteSTOrder = (id, kind, orderId) => {
    const listKey = kind === 'modification' ? 'modificationOrders' : 'pendingOrders';
    setProject(prev => ({ ...prev, subContractors: prev.subContractors.map(st => {
      if (st.id !== id || st.locked) return st;
      const nextOrders = (st[listKey] || []).filter(order => order.id !== orderId);
      return { ...st, [listKey]: nextOrders,
        [kind === 'modification' ? 'modifications' : 'toRegularize']: stOrderSum(nextOrders) };
    }) }));
  };

  const handleSTMonthlyRadChange = (stId, monthIdx, value) => {
    const val = parseFloat(value) || 0;
    setProject(prev => ({
      ...prev,
      subContractors: prev.subContractors.map(st => {
        if (st.id === stId) {
          if (st.locked) return st;
          const newRad = [...(st.radMonthly || [])];
          newRad[monthIdx] = val;
          return { ...st, radMonthly: newRad };
        }
        return st;
      })
    }));
  };

  const handleRadNonSTChange = (code, monthIdx, value) => {
    if (code === 'PRORATA' || code.startsWith('ST')) return;
    const val = parseFloat(value) || 0;
    setProject(prev => {
      const currentArr = [...(prev.radNonST[code] || Array(prev.monthsCount).fill(0))];
      currentArr[monthIdx] = val;
      return { ...prev, radNonST: { ...prev.radNonST, [code]: currentArr } };
    });
  };

  const handleAddProrataItem = (e) => {
    e.preventDefault();
    const label = newProrataName.trim();
    if (!label) return;
    setProject(prev => ({
      ...prev,
      prorataItems: [...(prev.prorataItems || []), {
        id: Date.now(), item: label, monthly: Array(prev.monthsCount).fill(0), locked: false
      }]
    }));
    setNewProrataName('');
  };

  const handleUpdateProrataLabel = (id, value) => {
    setProject(prev => ({
      ...prev,
      prorataItems: prev.prorataItems.map(item => item.id === id && !item.locked ? { ...item, item: value } : item)
    }));
  };

  const handleDeleteProrataItem = (id) => {
    const item = project.prorataItems.find(row => row.id === id);
    if (!item || item.locked) return;
    if (!window.confirm(`Supprimer le poste de prorata « ${item.item} » et sa ventilation mensuelle ?`)) return;
    setProject(prev => ({ ...prev, prorataItems: prev.prorataItems.filter(row => row.id !== id) }));
  };

  const handleProrataMonthlyChange = (id, monthIdx, value) => {
    const val = Number(value) || 0;
    setProject(prev => ({
      ...prev,
      prorataItems: prev.prorataItems.map(item => {
        if (item.id !== id || item.locked) return item;
        const monthly = [...(item.monthly || Array(prev.monthsCount).fill(0))];
        monthly[monthIdx] = val;
        return { ...item, monthly };
      })
    }));
  };

  const handleAddTransfer = (e) => {
    e.preventDefault();
    if (!newTransfer.fromCode || !newTransfer.toCode || newTransfer.fromCode === 'PRORATA' || newTransfer.toCode === 'PRORATA') return;
    const amount = Number(newTransfer.amount);
    if (!Number.isFinite(amount) || amount <= 0 || newTransfer.fromCode === newTransfer.toCode) { window.alert('Transfert invalide : montant positif et codes distincts requis.'); return; }
    if (!(newTransfer.fromCode in adjustedBudgets) || !(newTransfer.toCode in adjustedBudgets) || amount > adjustedBudgets[newTransfer.fromCode] + 0.01) { window.alert('Transfert refusé : code inexistant ou budget source insuffisant.'); return; }
    const transferObj = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      fromCode: newTransfer.fromCode,
      toCode: newTransfer.toCode,
      amount,
      reason: newTransfer.reason || 'Virement interne',
      locked: false
    };
    setProject(prev => ({ ...prev, transfers: [...prev.transfers, transferObj] }));
    setShowTransferModal(false);
    setNewTransfer({ fromCode: '', toCode: '', amount: '', reason: '' });
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.supplier || !newExpense.subCode || String(newExpense.invoiceAmount).trim() === "" || !Number.isFinite(Number(newExpense.invoiceAmount))) return;
    if (project.imputationCodes.find(c => c.code === newExpense.subCode)?.family === 'Sous-traitance' && !project.subContractors.some(st => String(st.id) === String(newExpense.stId) && st.code === newExpense.subCode)) { window.alert('Sélectionnez le marché ST correspondant à la facture.'); return; }

    if (editingExpense) {
      setProject(prev => ({
        ...prev,
        expenses: prev.expenses.map(exp => exp.id === editingExpense.id ? {
          ...exp,
          period: newExpense.period || exp.period,
          supplier: newExpense.supplier.toUpperCase(),
          description: newExpense.description || 'Dépense fournisseur',
          code: project.imputationCodes.find(c => c.code === newExpense.subCode)?.family || exp.code,
          subCode: newExpense.subCode,
          poNumber: newExpense.poNumber || exp.poNumber,
          poAmount: newExpense.poAmount === "" ? Number(newExpense.invoiceAmount) : Number(newExpense.poAmount),
          deliveryDate: newExpense.deliveryDate || exp.deliveryDate,
          invoiceDate: newExpense.invoiceDate || exp.invoiceDate,
          invoiceAmount: parseFloat(newExpense.invoiceAmount) || 0,
          stId: project.imputationCodes.find(c=>c.code===newExpense.subCode)?.family==='Sous-traitance' ? (newExpense.stId || null) : null
        } : exp)
      }));
      setEditingExpense(null);
    } else {
      const expObj = {
        id: `EXP-${Date.now().toString().slice(-4)}`,
        period: newExpense.period || project.months[0],
        supplier: newExpense.supplier.toUpperCase(),
        description: newExpense.description || 'Dépense fournisseur',
        code: project.imputationCodes.find(c => c.code === newExpense.subCode)?.family || 'Matériaux',
        subCode: newExpense.subCode,
        poNumber: newExpense.poNumber || 'BC-DIRECT',
        poAmount: newExpense.poAmount === "" ? Number(newExpense.invoiceAmount) : Number(newExpense.poAmount),
        deliveryDate: newExpense.deliveryDate || new Date().toISOString().split('T')[0],
        invoiceDate: newExpense.invoiceDate || new Date().toISOString().split('T')[0],
        invoiceAmount: parseFloat(newExpense.invoiceAmount) || 0,
        stId: project.imputationCodes.find(c=>c.code===newExpense.subCode)?.family==='Sous-traitance' ? (newExpense.stId || null) : null,
        locked: false
      };
      setProject(prev => ({ ...prev, expenses: [...prev.expenses, expObj] }));
    }

    setShowExpenseModal(false);
    setNewExpense({ period: '', supplier: '', description: '', subCode: '', poNumber: '', poAmount: '', deliveryDate: '', invoiceDate: '', invoiceAmount: '', stId: '' });
  };

  const handleEditExpense = (exp) => {
    if (exp.locked) return;
    setEditingExpense(exp);
    setNewExpense({
      period: exp.period,
      supplier: exp.supplier,
      description: exp.description,
      subCode: exp.subCode,
      poNumber: exp.poNumber,
      poAmount: exp.poAmount,
      deliveryDate: exp.deliveryDate,
      invoiceDate: exp.invoiceDate,
      invoiceAmount: exp.invoiceAmount,
      stId: exp.stId ?? ''
    });
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = (id) => {
    const exp = project.expenses.find(e => e.id === id);
    if (exp?.locked) return;
    setProject(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
  };

  const handleAddST = (e) => {
    e.preventDefault();
    if (!newST.code || !project.imputationCodes.some(c => c.code === newST.code && c.family === 'Sous-traitance') || project.subContractors.some(st => st.code === newST.code) || !newST.company || newST.initialMarket === '' || !Number.isFinite(Number(newST.initialMarket))) return;
    const stObj = {
      id: Date.now(),
      code: newST.code,
      company: newST.company.toUpperCase(),
      statusContract: newST.statusContract,
      agreement: newST.agreement,
      dgd: newST.dgd,
      initialMarket: parseFloat(newST.initialMarket) || 0,
      prorataRate: Math.max(0, Math.min(100, Number(newST.prorataRate) || 0)),
      modifications: parseFloat(newST.modifications) || 0,
      toRegularize: parseFloat(newST.toRegularize) || 0,
      modificationOrders: Number(newST.modifications) ? [{ id: `new-mod-${Date.now()}`, reference: 'Ordres modificatifs initiaux', amount: Number(newST.modifications) }] : [],
      pendingOrders: Number(newST.toRegularize) ? [{ id: `new-pending-${Date.now()}`, reference: 'Montant initial à régulariser', amount: Number(newST.toRegularize) }] : [],
      radMonthly: Array(project.monthsCount).fill(0),
      locked: false
    };
    setProject(prev => ({ ...prev, subContractors: [...prev.subContractors, stObj] }));
    setShowSTModal(false);
    setNewST({ code: '', company: '', statusContract: 'En cours', agreement: 'En attente', dgd: 'Non', initialMarket: '', prorataRate: 2, modifications: 0, toRegularize: 0 });
  };

  const filteredExpenses = useMemo(() => {
    return project.expenses.filter(e => {
      const matchPeriod = expenseFilterPeriod === 'ALL' || e.period === expenseFilterPeriod;
      const matchSupplier = !expenseFilterSupplier || e.supplier.toLowerCase().includes(expenseFilterSupplier.toLowerCase()) || e.description.toLowerCase().includes(expenseFilterSupplier.toLowerCase());
      const matchCode = expenseFilterCode === 'ALL' || e.subCode === expenseFilterCode;
      return matchPeriod && matchSupplier && matchCode;
    });
  }, [project.expenses, expenseFilterPeriod, expenseFilterSupplier, expenseFilterCode]);

  // Le total engagé provient exclusivement des factures et avoirs du Cahier d'épicier.
  // Calcul en centimes pour éviter les écarts d'arrondi sur les montants négatifs.
  const totalEpicierEngageCents = (project.expenses || []).reduce((sum, expense) => sum + Math.round((Number(expense.invoiceAmount) || 0) * 100), 0);
  const totalEpicierFiltreCents = filteredExpenses.reduce((sum, expense) => sum + Math.round((Number(expense.invoiceAmount) || 0) * 100), 0);
  const formatEpicierCents = cents => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' € HT';

  const monthlySalesForecast = project.months.map((month, monthIdx) =>
    (Number(priceRevisionCalculations.monthlyData[monthIdx]?.revisedBilling ?? project.clientSalesPlan?.[monthIdx]) || 0) + (project.clientAmendments || []).reduce((sum, a) => sum + (Number(a.billingMonthly?.[monthIdx]) || 0), 0)
  );
  const totalSalesVentileBase = (project.clientSalesPlan || []).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const totalSalesVentile = monthlySalesForecast.reduce((sum, value) => sum + value, 0);
  // Contrôle indépendant de chaque échéancier : une différence supérieure à 1 centime est signalée.
  const billingScheduleChecks = [
    { id: 'base', label: 'Marché de base', expected: Number(project.clientBudget) || 0, planned: totalSalesVentileBase },
    ...(project.clientAmendments || []).map(a => ({
      id: a.id,
      label: `Avenant ${a.number}`,
      expected: Number(a.amount) || 0,
      planned: (a.billingMonthly || []).reduce((sum, v) => sum + (Number(v) || 0), 0)
    }))
  ].map(item => ({ ...item, difference: Math.round((item.expected - item.planned) * 100) / 100 }));
  const billingScheduleErrors = billingScheduleChecks.filter(item => Math.abs(item.difference) > 0.01);
  const actualExpensesMonthly = project.months.map(month =>
    (project.expenses || []).filter(expense => expense.period === month)
      .reduce((sum, expense) => sum + (Number(expense.invoiceAmount) || 0), 0)
  );
  const totalRADMonthly = project.months.map((_, mIdx) => {
    const radNonStSum = Object.values(project.radNonST || {}).reduce((sum, arr) => sum + (Number(arr[mIdx]) || 0), 0);
    const radStSum = (project.subContractors || []).reduce((sum, st) => sum + (Number(st.radMonthly?.[mIdx]) || 0), 0);
    const prorataSum = (project.prorataItems || []).reduce((sum, item) => sum + (Number(item.monthly?.[mIdx]) || 0), 0);
    return radNonStSum + radStSum + prorataSum;
  });

  if (!accessGranted) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-slate-100">
      <form onSubmit={checkAccess} className="w-full max-w-md space-y-5 rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <div className="text-3xl font-bold tracking-tight">BMG</div>
        <h1 className="text-xl font-semibold">Accès à l'application</h1>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-800 p-1">
          <button type="button" onClick={() => { setLoginMode('user'); setAccessPassword(''); setAccessError(''); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${loginMode === 'user' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}>Utilisateur</button>
          <button type="button" onClick={() => { setLoginMode('admin'); setAccessPassword(''); setAccessError(''); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${loginMode === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}>Administrateur</button>
        </div>
        <label className="block text-sm text-slate-300">Mot de passe
          <span className="mt-2 flex gap-2">
            <input type={showAccessPassword ? 'text' : 'password'} autoComplete="current-password" autoFocus required value={accessPassword} onChange={e=>setAccessPassword(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white" />
            <button type="button" onClick={()=>setShowAccessPassword(v=>!v)} aria-label={showAccessPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="rounded-xl border border-slate-600 px-3 py-2 text-sm text-white">{showAccessPassword ? 'Masquer' : 'Afficher'}</button>
          </span>
        </label>
        {accessError && <p role="alert" className="text-sm text-rose-400">{accessError}</p>}
        <button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white">Ouvrir BMG</button>
        <p className="text-center text-xs text-slate-500">Made by WB</p>
      </form>
    </div>;
  }

  return (
    <div className="bmg-app min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1750px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 shadow-sm ring-1 ring-indigo-100">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-slate-900">{project.name}</h1>
                <button
                  onClick={toggleLockProjectInfo}
                  className={`rounded-full p-1.5 transition ${project.projectInfoLocked ? 'bg-amber-50 text-amber-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
                  title={project.projectInfoLocked ? 'Déverrouiller les paramètres' : 'Verrouiller les paramètres'}
                >
                  {project.projectInfoLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {project.location} • {project.lot} • {project.manager}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton tone="indigo" icon={Bot} onClick={() => setShowAiAssistant(true)}>
              Assistant IA ({aiDiagnostics.length})
            </ActionButton>
            <button type="button" onClick={() => setShowStartGuide(v => !v)} className="rounded-xl border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100">{showStartGuide ? 'Masquer le guide' : 'Guide pas à pas'}</button>
            <ActionButton icon={Settings} onClick={() => setShowProjectSettings(v => !v)}>
              Config
            </ActionButton>
            <ActionButton
              icon={Download}
              onClick={exportBackup}
            >
              Export JSON
            </ActionButton>
            <button type="button" onClick={() => {
              if (!window.confirm('Créer un chantier vierge ? Les données actuellement ouvertes seront remplacées dans ce navigateur. Exportez d’abord un JSON de sauvegarde.')) return;
              const fresh = normalizeProjectData(makeBlankProject());
              setProject(fresh); setActiveTab('dashboard'); setShowProjectSettings(true); setShowStartGuide(true); setGuideStep(0);
              setBackupDirty(true); setBackupNotice('Nouveau chantier vierge créé. Pensez à exporter un JSON de sauvegarde.');
            }} className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100">Nouveau chantier vierge</button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">
              <Upload className="h-4 w-4" />
              Import JSON
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    try {
                      const parsed = JSON.parse(evt.target.result);
                      const report = inspectBackup(parsed);
                      setPendingImport(report);
                      setBackupNotice('Sauvegarde analysée. Vérifiez le rapport de migration avant de confirmer.');
                    } catch (err) {
                      alert(`Import refusé : ${err.message}`);
                    } finally { e.target.value = ''; }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>
        </div>

        <div className="mx-auto max-w-[1750px] px-4 pb-3 lg:px-8">
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${backupDirty ? 'border-amber-600/50 bg-amber-950/40 text-amber-100' : 'border-emerald-600/40 bg-emerald-950/30 text-emerald-100'}`}>
            <span>{backupDirty ? 'Sauvegarde externe à faire : cliquez sur Export JSON avant de fermer BMG. Le navigateur garde une copie locale, mais elle peut être perdue.' : 'Export JSON effectué depuis la dernière modification.'}</span>
            <button type="button" onClick={exportBackup} className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white">Sauvegarder en JSON</button>
          </div>
          {pendingImport && <div className="mt-3 rounded-xl border border-indigo-400 bg-slate-900 p-4 text-slate-100" role="region" aria-label="Prévisualisation de la migration">
            <h3 className="font-bold text-base">Prévisualisation de la migration JSON</h3>
            <p className="mt-2 text-sm">Chantier : <strong>{pendingImport.project.name || 'Sans nom'}</strong> · Source : {pendingImport.sourceVersion} · Destination : {APP_VERSION}</p>
            <p className="mt-1 text-sm">{pendingImport.counts.months} mois · {pendingImport.counts.codes} codes · {pendingImport.counts.contractors} sous-traitants · {pendingImport.counts.expenses} dépenses</p>
            {pendingImport.warnings.length > 0 ? <div className="mt-2 rounded-lg border border-amber-600 bg-amber-950/30 p-2 text-amber-100"><strong>Points à contrôler :</strong><ul className="mt-1 list-disc pl-5">{pendingImport.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div> : <p className="mt-2 text-sm text-emerald-300">Structure cohérente, aucune alerte de migration détectée.</p>}
            <p className="mt-2 text-xs text-slate-300">La migration ne modifie pas le fichier d’origine. Avant remplacement, une copie du chantier actuellement ouvert sera téléchargée. Le rapprochement financier reste à vérifier dans Contrôles.</p>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={confirmMigration} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Confirmer et importer</button><button type="button" onClick={()=>setPendingImport(null)} className="rounded-lg border border-slate-500 px-4 py-2 text-sm">Annuler</button></div>
          </div>}
          {backupNotice && <p role="status" className="mt-2 text-xs text-slate-500">{backupNotice}</p>}
        </div>
        <div className="mx-auto flex max-w-[1750px] flex-wrap items-center justify-end gap-3 px-4 pb-3 lg:px-8">
          {accessRole === 'admin' && <button type="button" onClick={() => setShowAccessSettings(v=>!v)} className="rounded-lg border border-indigo-500 bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-sm">{showAccessSettings ? 'Fermer les paramètres administrateur' : 'Administration · Changer le mot de passe utilisateur'}</button>}
          <button type="button" onClick={() => {setAccessGranted(false);setAccessRole('');}} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300">Verrouiller la session</button>
        </div>
        {showAccessSettings && accessRole === 'admin' && <form onSubmit={changeUserPassword} className="mx-auto mb-4 flex max-w-[1750px] flex-wrap items-end gap-3 rounded-xl border border-slate-600 bg-slate-900 p-4 lg:mx-8">
          <label className="text-xs text-slate-300">Nouveau mot de passe utilisateur (8 caractères minimum)
            <span className="mt-1 flex gap-2">
              <input type={showAdminPasswordDraft ? 'text' : 'password'} minLength={8} required value={adminPasswordDraft} onChange={e=>setAdminPasswordDraft(e.target.value)} className="min-w-0 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white" />
              <button type="button" onClick={()=>setShowAdminPasswordDraft(v=>!v)} className="rounded-lg border border-slate-600 px-3 text-white">{showAdminPasswordDraft ? 'Masquer' : 'Afficher'}</button>
            </span>
          </label>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">Modifier</button>
          <p className="w-full text-xs text-slate-300">Ce réglage est propre à cet ordinateur et à ce navigateur.</p>
        </form>}
        {showStartGuide && (
          <section aria-label="Guide de démarrage BMG" className="mx-auto mb-4 max-w-[1750px] px-4 lg:px-8">
            <div className="rounded-2xl border border-indigo-300 bg-indigo-50 p-5 text-slate-900 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-wide text-indigo-700">BMG Alpha · Guide débutant</p><h2 className="mt-1 text-lg font-bold">Étape {guideStep + 1} / {START_GUIDE.length} — {START_GUIDE[guideStep].title}</h2></div>
                <button type="button" onClick={() => setShowStartGuide(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">Fermer</button>
              </div>
              <div className="mt-3 flex gap-1" aria-label="Progression du guide">{START_GUIDE.map((_, i) => <button key={i} type="button" onClick={() => setGuideStep(i)} title={`Étape ${i+1}`} aria-label={`Aller à l’étape ${i+1}`} className={`h-2 flex-1 rounded-full ${i <= guideStep ? 'bg-indigo-600' : 'bg-indigo-200'}`} />)}</div>
              <p className="mt-4 text-sm leading-relaxed">{START_GUIDE[guideStep].detail}</p>
              <p className="mt-3 rounded-lg bg-white p-3 text-xs font-semibold text-slate-700">À vérifier : {START_GUIDE[guideStep].check}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setGuideStep(i => Math.max(0, i-1))} disabled={guideStep===0} className="rounded-lg border border-indigo-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">Précédent</button>
                <button type="button" onClick={() => { setActiveTab(START_GUIDE[guideStep].tab); if (guideStep===0) setShowProjectSettings(true); }} className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">Ouvrir l’onglet concerné</button>
                <button type="button" onClick={() => guideStep === START_GUIDE.length-1 ? setShowStartGuide(false) : setGuideStep(i=>i+1)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">{guideStep===START_GUIDE.length-1?'Terminer':'Étape suivante'}</button>
              </div>
              <p className="mt-3 text-xs text-slate-600">Version vierge : aucun montant de démonstration. Si vous aviez déjà utilisé BMG dans ce navigateur, vos anciennes données locales sont conservées. Pour un nouveau chantier, exportez d’abord votre JSON.</p>
            </div>
          </section>
        )}
        {showProjectSettings && (
          <div className="border-t border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-[1750px] space-y-5 px-4 py-5 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Settings className="h-4 w-4 text-indigo-600" />
                  Paramètres projet
                </div>
                <ActionButton onClick={toggleLockProjectInfo} tone={project.projectInfoLocked ? 'slate' : 'emerald'}>
                  {project.projectInfoLocked ? 'Déverrouillé' : 'Verrouillé'}
                </ActionButton>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Field label="Nom chantier">
                  <input
                    value={project.name}
                    onChange={(e) => updateProject('name', e.target.value)}
                    disabled={project.projectInfoLocked}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </Field>
                <Field label="Localisation">
                  <input
                    value={project.location}
                    onChange={(e) => updateProject('location', e.target.value)}
                    disabled={project.projectInfoLocked}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </Field>
                <Field label="Responsable">
                  <input
                    value={project.manager}
                    onChange={(e) => updateProject('manager', e.target.value)}
                    disabled={project.projectInfoLocked}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </Field>
                <Field label="Budget client HT">
                  <input
                    type="number"
                    value={project.clientBudget}
                    onChange={(e) => updateProject('clientBudget', parseFloat(e.target.value) || 0)}
                    disabled={project.projectInfoLocked}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Frais généraux (%)" hint="Taux appliqué aux montants client HT pour calculer la marge nette.">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      inputMode="decimal"
                      aria-label="Taux de frais généraux en pourcentage"
                      value={project.overheadRate ?? 15}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') { updateProject('overheadRate', ''); return; }
                        const parsed = Number(raw);
                        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) updateProject('overheadRate', parsed);
                      }}
                      onBlur={() => {
                        if (project.overheadRate === '') updateProject('overheadRate', 15);
                      }}
                      className="w-full rounded-xl border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">%</span>
                  </div>
                </Field>
                <Field label="Budget études déboursé HT">
                  <input type="number" step="0.01" value={project.studyDisbursementBudget ?? ''} placeholder="À renseigner" disabled={project.projectInfoLocked} onChange={e => updateProject('studyDisbursementBudget', e.target.value === '' ? null : Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                </Field>
                <Field label="Date de démarrage">
                  <input
                    type="date"
                    value={project.startDate || ''}
                    onChange={(e) => handleUpdateDates(e.target.value, undefined)}
                    disabled={project.projectInfoLocked}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </Field>
                <Field label="Date de fin prévue">
                  <input
                    type="date"
                    value={project.endDate || ''}
                    onChange={(e) => handleUpdateDates(undefined, e.target.value)}
                    disabled={project.projectInfoLocked}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </Field>
                <Field label="Durée calculée" hint="Mois">
                  <div className="flex h-[42px] items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
                    {project.monthsCount} mois
                  </div>
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {project.months.map((m, idx) => (
                    <span key={idx} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                      {m}
                    </span>
                  ))}
                </div>
                <ActionButton tone="indigo" icon={Plus} onClick={() => setShowCodeModal(true)}>
                  Ajouter un code
                </ActionButton>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1750px] overflow-x-auto px-4 lg:px-8">
          <div className="flex gap-2 py-3">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1750px] space-y-6 px-4 py-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <StatCard label="Budget étude initial" value={`${metrics.totalInitialBudget.toLocaleString('fr-FR')} €`} sub="Quantités × PU" />
              <StatCard label="Budget réajusté" value={`${metrics.totalAdjustedBudget.toLocaleString('fr-FR')} €`} sub={`${project.transfers.length} transfert(s)`} tone="indigo" />
              <StatCard label="Déboursé atterrissage" value={`${metrics.forecastCostAtCompletion.toLocaleString('fr-FR')} €`} sub="Engagé réel + RAD" />
              <StatCard label="Résultat atterrissage" value={`${metrics.forecastNetResult.toLocaleString('fr-FR')} €`} sub={`${metrics.forecastNetMarginPercent.toFixed(2)}% de marge nette`} tone={metrics.forecastNetResult >= 0 ? 'emerald' : 'rose'} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Lecture rapide de la marge</h2>
                    <p className="mt-1 text-xs text-slate-500">Vue claire entre étude, réel et atterrissage.</p>
                  </div>
                  {priceRevisionCalculations.enabled && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
                      <div className="text-xs font-medium text-emerald-700">Révision de prix</div>
                      <div className="text-lg font-semibold text-emerald-700">+{priceRevisionCalculations.totalRevisionAmount.toLocaleString('fr-FR')} €</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-medium text-slate-500">Étude</div>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <div className="flex justify-between"><span>Marché client</span><span>{metrics.clientBudget.toLocaleString('fr-FR')} €</span></div>
                      <div className="flex justify-between"><span>Déboursé initial</span><span>{metrics.totalInitialBudget.toLocaleString('fr-FR')} €</span></div>
                      <div className="flex justify-between font-semibold text-indigo-700"><span>Marge nette</span><span>{metrics.initialNetResult.toLocaleString('fr-FR')} €</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                    <div className="text-xs font-medium text-indigo-700">Réel</div>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <div className="flex justify-between"><span>Facturé</span><span>{metrics.billedToClientActual.toLocaleString('fr-FR')} €</span></div>
                      <div className="flex justify-between"><span>Engagé</span><span>{metrics.totalEngagedActual.toLocaleString('fr-FR')} €</span></div>
                      <div className="flex justify-between font-semibold text-indigo-700"><span>Marge nette</span><span>{metrics.actualNetResult.toLocaleString('fr-FR')} €</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-medium text-slate-500">Atterrissage</div>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <div className="flex justify-between"><span>Client révisé</span><span>{metrics.effectiveClientBudget.toLocaleString('fr-FR')} €</span></div>
                      <div className="flex justify-between"><span>Déboursé</span><span>{metrics.forecastCostAtCompletion.toLocaleString('fr-FR')} €</span></div>
                      <div className="flex justify-between font-semibold text-indigo-700"><span>Marge nette</span><span>{metrics.forecastNetResult.toLocaleString('fr-FR')} €</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Alertes utiles</h3>
                </div>
                <div className="space-y-3">
                  {aiDiagnostics.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                      <CheckCircle2 className="mb-2 h-5 w-5" />
                      Aucune alerte dans cette sélection. Consulter le centre de contrôle fonctionnel ci-dessous.
                    </div>
                  ) : (
                    aiDiagnostics.map(diag => (
                      <div key={diag.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-amber-800">{diag.title}</div>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{diag.code}</span>
                        </div>
                        <p className="mt-2 text-xs text-amber-900/80">{diag.message}</p>
                        <p className="mt-2 text-[11px] font-medium text-amber-700">Solution : {diag.action}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Budget réajusté vs engagé</h3>
                    <p className="mt-1 text-xs text-slate-500">Lecture par famille de dépenses.</p>
                  </div>
                  <span className="text-xs text-slate-400">€ HT</span>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={familyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="family" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${Math.round(val / 1000)}k€`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#172337', color: '#e2e8f0', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                        formatter={(value) => [`${value.toLocaleString('fr-FR')} €`, '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Bar dataKey="Réajusté" fill="#4f46e5" name="Budget réajusté" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="Engagé" fill="#0ea5e9" name="Engagé réel" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Contrôles</h3>
                </div>
                <p className="mb-3 text-xs text-slate-600">Contrôles automatiques par onglet. Cliquez sur un onglet pour corriger les anomalies.</p>
                <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-lg bg-rose-100 px-2 py-1 text-rose-800">{errorsCount} erreur(s)</span>
                  <span className="rounded-lg bg-amber-100 px-2 py-1 text-amber-800">{warningsCount} alerte(s)</span>
                </div>
                <div className="space-y-2">
                  {controlsByTab.map(tab => {
                    const errors = tab.items.filter(x=>x.severity==='error').length;
                    const warnings = tab.items.filter(x=>x.severity==='warning').length;
                    const infos = tab.items.filter(x=>x.severity==='info').length;
                    return <button key={tab.id} type="button" onClick={()=>setActiveTab(tab.id)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-900">{tab.label}</span><span className={`text-xs font-bold ${errors?'text-rose-700':warnings?'text-amber-700':'text-emerald-700'}`}>{errors?`${errors} erreur(s)`:warnings?`${warnings} alerte(s)`:'Aucune alerte'}{infos?` · ${infos} info`:''}</span></div>
                      {tab.items.filter(x=>x.severity!=='info').slice(0,2).map((x,i)=><p key={i} className="mt-1 text-[11px] text-slate-700">• {x.title}</p>)}
                    </button>;
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold">Centre de contrôle fonctionnel</h2><p className="text-xs text-slate-400">Contrôles calculés sur les données actuelles, classés par onglet. Les alertes indiquent où intervenir.</p></div>
              <span className="rounded-lg bg-slate-800 px-3 py-2 text-sm">{errorsCount} erreurs · {warningsCount} alertes</span>
            </div>
            <div className="space-y-4">
              {controlsByTab.map(tab=><div key={tab.id} className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
                <div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold">{tab.label}</h3><button type="button" onClick={()=>setActiveTab(tab.id)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">Ouvrir l'onglet →</button></div>
                {tab.items.length===0 ? <p className="text-xs text-emerald-300">✓ Aucune anomalie détectée par les règles actuellement disponibles.</p> :
                  <div className="space-y-2">{tab.items.map((item,i)=><div key={`${item.title}-${i}`} className={`rounded-lg border p-3 ${item.severity==='error'?'border-rose-800 bg-rose-950/40':item.severity==='warning'?'border-amber-800 bg-amber-950/30':'border-sky-900 bg-sky-950/30'}`}>
                    <p className="text-sm font-semibold">{item.severity==='error'?'⛔':item.severity==='warning'?'⚠':'ℹ'} {item.title}</p>
                    <p className="mt-1 text-xs text-slate-300">{item.detail}</p>
                    <p className="mt-1 text-xs font-medium text-slate-200">À faire : {item.action}</p>
                  </div>)}</div>}
              </div>)}
            </div>
          </section>
        )}

        {activeTab === 'dashboard' && (
          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Contrôle budgétaire par imputation</h2>
            <p className="mt-1 text-xs text-slate-500">Comparaison du budget initial, de l'enveloppe actualisée, des dépenses engagées et du RAD restant prévisionnel.</p>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Code</th><th className="p-3">Désignation</th><th className="p-3 text-right">Initial</th><th className="p-3 text-right">Actualisé</th><th className="p-3 text-right">Engagé</th><th className="p-3 text-right">RAD prévu</th><th className="p-3 text-right">Écart</th></tr></thead><tbody>{project.imputationCodes.map(c => { const initial = budgetInitialByCode[c.code] || 0; const budget = adjustedBudgets[c.code] || 0; const engaged = actualExpensesByCode[c.code] || 0; const rad = c.code === 'PRORATA' ? (radNonSTTotals.PRORATA || 0) : c.family === 'Sous-traitance' ? (stTotalsByCode[c.code]?.radSum || 0) : (radNonSTTotals[c.code] || 0); const variance = budget - engaged - rad; return <tr key={c.code} className="border-t border-slate-200"><td className="p-3 font-mono">{c.code}</td><td className="p-3">{c.label}</td><td className="p-3 text-right">{initial.toLocaleString('fr-FR')} €</td><td className="p-3 text-right">{budget.toLocaleString('fr-FR')} €</td><td className="p-3 text-right">{engaged.toLocaleString('fr-FR')} €</td><td className="p-3 text-right">{rad.toLocaleString('fr-FR')} €</td><td className={`p-3 text-right font-semibold ${variance < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{variance.toLocaleString('fr-FR')} €</td></tr>; })}</tbody></table></div>
            <p className="mt-3 text-xs text-slate-500">Convention actuelle : engagé et RAD sont deux flux distincts. Le RAD doit représenter uniquement le reste à dépenser, pas les dépenses déjà engagées.</p>
          </section>
        )}

        {activeTab === 'evolution' && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Évolution du BMG — suivi des présentations</h2>
              <p className="mt-2 text-sm text-slate-600">Chaque présentation est figée. Le coût final prévisionnel par code correspond aux factures réelles HT + au reste à dépenser (RAD). Un écart positif signifie un gain, une évolution négative une dégradation par rapport à la présentation de référence.</p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm font-medium text-slate-700">Nom de la présentation
                  <input className="rounded-lg border border-slate-300 px-3 py-2" value={bmgPresentationLabel} onChange={e => setBmgPresentationLabel(e.target.value)} placeholder={`BMG n°${bmgHistory.length + 1} — réunion direction`} />
                </label>
                <button type="button" onClick={publishBmg} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">Figer et présenter ce BMG</button>
              </div>
              <p className="mt-2 text-xs text-amber-700">Une présentation figée est conservée dans les données locales et les exports JSON. Exportez le JSON après chaque présentation. Les présentations ne se synchronisent pas entre ordinateurs.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">Historique des BMG présentés ({bmgHistory.length})</h3>
              {bmgHistory.length === 0 ? <p className="mt-3 text-sm text-slate-500">Aucune présentation enregistrée. Figez votre premier BMG pour créer la référence de comparaison.</p> : (
                <div className="mt-3 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-2">Présentation</th><th className="p-2">Date</th><th className="p-2 text-right">Budget HT</th><th className="p-2 text-right">Coût final HT</th><th className="p-2 text-right">Gain / perte HT</th></tr></thead><tbody>{bmgHistory.map(item => <tr key={item.id} className="border-b"><td className="p-2 font-medium">{item.label}</td><td className="p-2">{new Date(item.createdAt).toLocaleString('fr-FR')}</td><td className="p-2 text-right">{euroBmg(item.totalBudget)}</td><td className="p-2 text-right">{euroBmg(item.totalCost)}</td><td className={`p-2 text-right font-semibold ${item.totalGain >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{euroBmg(item.totalGain)}</td></tr>)}</tbody></table></div>
              )}
            </div>
            {bmgHistory.length > 0 && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">Comparer deux présentations, code par code</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">BMG de référence
                  <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={bmgReferenceId || bmgHistory[bmgHistory.length - 1]?.id} onChange={e => setBmgReferenceId(e.target.value)}>{bmgHistory.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                </label>
                <label className="text-sm font-medium">BMG à comparer
                  <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={bmgTargetId} onChange={e => setBmgTargetId(e.target.value)}><option value="current">BMG actuel (non figé)</option>{bmgHistory.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                </label>
              </div>
              {bmgComparison && <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                  <p className="text-sm text-indigo-900">Rapport direction : synthèse des gains / pertes et comparaison détaillée par code.</p>
                  <button type="button" onClick={() => openBmgPdfReport({ projectName: project.name, reference: bmgComparison.previous, target: bmgComparison.current, comparison: bmgComparison, targetLabel: bmgTargetId === 'current' ? 'BMG actuel (non figé)' : bmgHistory.find(s => s.id === bmgTargetId)?.label })} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">Exporter le rapport PDF</button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-600">Gain de référence</p><p className="text-lg font-bold">{euroBmg(bmgComparison.previous.totalGain)}</p></div>
                  <div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-600">Gain comparé</p><p className="text-lg font-bold">{euroBmg(bmgComparison.current.totalGain)}</p></div>
                  <div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-600">Évolution du gain</p><p className={`text-lg font-bold ${bmgComparison.totalDelta < 0 ? 'text-rose-700' : bmgComparison.totalDelta > 0 ? 'text-emerald-700' : ''}`}>{euroBmg(bmgComparison.totalDelta)}</p></div>
                </div>
                <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-2">Code</th><th className="p-2">Désignation</th><th className="p-2 text-right">Budget actuel</th><th className="p-2 text-right">Gain précédent</th><th className="p-2 text-right">Gain actuel</th><th className="p-2 text-right">Évolution</th></tr></thead><tbody>{bmgComparison.rows.map(row => <tr key={row.code} className="border-b"><td className="p-2 font-semibold">{row.code}</td><td className="p-2">{row.label}</td><td className="p-2 text-right">{euroBmg(row.budget)}</td><td className="p-2 text-right">{euroBmg(row.previousGain)}</td><td className="p-2 text-right">{euroBmg(row.currentGain)}</td><td className={`p-2 text-right font-bold ${row.delta < 0 ? 'text-rose-700' : row.delta > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{euroBmg(row.delta)}</td></tr>)}</tbody></table></div>
                <p className="mt-3 text-xs text-slate-600">L'évolution intègre les variations de budget et de coût prévisionnel. Les codes ajoutés ou supprimés restent visibles dans la comparaison.</p>
              </>}
            </div>}
          </section>
        )}

        {activeTab === 'budget' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Budget évolution – imputations et avenants</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton tone="indigo" icon={Plus} onClick={() => setShowCodeModal(true)}>
                  Ajouter un code
                </ActionButton>
                <ActionButton tone="indigo" icon={PlusCircle} onClick={() => setShowAmendmentForm(v => !v)}>Nouvel avenant</ActionButton>
                {project.prorataRemoved && <button type="button" className="rounded-xl border border-indigo-500 px-3 py-2 text-sm text-indigo-700" onClick={() => setProject(prev => ({ ...prev, prorataRemoved: false, imputationCodes: [...prev.imputationCodes, { family: 'Frais divers', code: 'PRORATA', label: 'Prorata de chantier', unit: 'forfait', pu: 0, qty: 1, locked: false }] }))}>Rétablir le code PRORATA</button>}
                <ActionButton tone="indigo" icon={ArrowRightLeft} onClick={() => setShowTransferModal(true)}>
                  Nouveau transfert
                </ActionButton>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <StatCard label="Marché initial HT" value={`${metrics.clientBudget.toLocaleString('fr-FR')} €`} />
                <StatCard label="Avenants HT" value={`${totalClientAmendments.toLocaleString('fr-FR')} €`} />
                <StatCard label="Marché actualisé HT" value={`${actualizedClientMarket.toLocaleString('fr-FR')} €`} />
                <StatCard label="Budget imputé actualisé" value={`${metrics.totalAdjustedBudget.toLocaleString('fr-FR')} €`} />
                <StatCard label="Avenants non affectés (marge potentielle)" value={`${(totalClientAmendments - Object.values(amendmentAllocationsByCode).reduce((sum,v)=>sum+v,0)).toLocaleString('fr-FR')} €`} />
              </div>
              {showAmendmentForm && <form onSubmit={handleAddClientAmendment} className="space-y-3 border-t border-slate-200 pt-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Numéro d’avenant"><input required value={amendmentForm.number} onChange={e => setAmendmentForm(v => ({ ...v, number: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-2" /></Field>
                  <Field label="Date"><input required type="date" value={amendmentForm.date} onChange={e => setAmendmentForm(v => ({ ...v, date: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-2" /></Field>
                  <Field label="Montant HT (négatif si moins-value)"><input required type="number" step="0.01" value={amendmentForm.amount} onChange={e => setAmendmentForm(v => ({ ...v, amount: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-2" /></Field>
                </div>
                <p className="text-xs text-slate-500">La facturation prévisionnelle de cet avenant sera ventilée uniquement dans l’onglet RAD.</p>
                <div className="text-xs font-semibold text-slate-600">Répartition de l’avenant par code d’imputation</div>
                <div className="grid gap-2 md:grid-cols-3">{project.imputationCodes.map(c => <label key={c.code} className="flex items-center gap-2 text-xs"><span className="min-w-20 font-mono">{c.code}</span><input type="number" step="0.01" value={amendmentForm.allocations[c.code] ?? ''} onChange={e => setAmendmentForm(v => ({ ...v, allocations: { ...v.allocations, [c.code]: e.target.value } }))} className="w-full rounded-xl border border-slate-200 p-2" /></label>)}</div>
                <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm">Budget affecté : {Object.values(amendmentForm.allocations).reduce((a,b) => a + (Number(b) || 0), 0).toLocaleString('fr-FR')} € / {Number(amendmentForm.amount || 0).toLocaleString('fr-FR')} € · Non affecté : {(Number(amendmentForm.amount || 0) - Object.values(amendmentForm.allocations).reduce((a,b) => a + (Number(b) || 0), 0)).toLocaleString('fr-FR')} €</span><button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Enregistrer l’avenant</button></div>
              </form>}
              {(project.clientAmendments || []).length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">Avenant</th><th>Date</th><th>Non affecté HT</th><th>Montant HT</th><th>Répartition</th><th>Action</th></tr></thead><tbody>{project.clientAmendments.map(a => <tr key={a.id} className="border-t border-slate-200"><td>{a.number}</td><td className="text-center">{a.date}</td><td className="text-right">{(Number(a.amount) - Object.values(a.allocations || {}).reduce((sum,v)=>sum+(Number(v)||0),0)).toLocaleString('fr-FR')} €</td><td className="text-right">{Number(a.amount).toLocaleString('fr-FR')} €</td><td className="text-center">{Object.entries(a.allocations || {}).filter(([,v]) => Number(v) !== 0).map(([k,v]) => `${k}: ${Number(v).toLocaleString('fr-FR')} €`).join(' · ')}</td><td className="text-center"><button onClick={() => { if(window.confirm('Supprimer cet avenant et sa ventilation ?')) setProject(prev => ({ ...prev, clientAmendments: prev.clientAmendments.filter(x => x.id !== a.id) })); }} className="text-rose-500">Supprimer</button></td></tr>)}</tbody></table></div>}
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Verrou</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Libellé</th>
                      <th className="px-4 py-3 text-center">Unité</th>
                      <th className="px-4 py-3 text-center">Qté</th>
                      <th className="px-4 py-3 text-center">PU / Montant HT</th>
                      <th className="px-4 py-3 text-right">Marché ST initial HT</th>
                      <th className="px-4 py-3 text-right">Avenants + transferts</th>
                      <th className="px-4 py-3 text-right">Réajusté</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.imputationCodes.map((item) => {
                      const init = budgetInitialByCode[item.code] || 0;
                      const adj = adjustedBudgets[item.code] || 0;
                      const diff = adj - init;
                      return (
                        <tr key={item.code} className={item.locked ? 'bg-slate-50/70' : 'hover:bg-slate-50'}>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleLockCode(item.code)} className="rounded-lg p-2 hover:bg-slate-100">
                              {item.locked ? <Lock className="h-4 w-4 text-amber-600" /> : <Unlock className="h-4 w-4 text-slate-400" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{item.code}</td>
                          <td className="px-4 py-3">
                            <input
                              value={item.label}
                              onChange={(e) => handleUpdateCodeInline(item.code, 'label', e.target.value)}
                              disabled={item.locked}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              value={item.unit || 'forfait'}
                              onChange={(e) => handleUpdateCodeInline(item.code, 'unit', e.target.value)}
                              disabled={item.locked}
                              aria-label={`Unité du code ${item.code}`}
                              className="w-28 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center outline-none focus:border-indigo-400 disabled:bg-slate-100"
                            >
                              {[item.unit, 'forfait', 'u', 'm', 'm²', 'm³', 'kg', 't', 'h', 'jour', 'mois', 'ml'].filter((u, i, arr) => u && arr.indexOf(u) === i).map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              value={item.unit === 'forfait' || item.code === 'PRORATA' ? 1 : item.qty}
                              onChange={(e) => handleUpdateCodeInline(item.code, 'qty', e.target.value)}
                              disabled={item.locked || item.code === 'PRORATA' || item.unit === 'forfait'}
                              title={item.unit === 'forfait' ? 'Forfait : quantité fixée à 1, saisir le montant HT dans la colonne PU / Montant' : undefined}
                              className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center outline-none focus:border-indigo-400 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              step="any"
                              value={item.pu}
                              aria-label={item.unit === 'forfait' ? `Montant forfaitaire HT du code ${item.code}` : `Prix unitaire du code ${item.code}`}
                              onChange={(e) => handleUpdateCodeInline(item.code, 'pu', e.target.value)}
                              disabled={item.locked}
                              className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center outline-none focus:border-indigo-400 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">{init.toLocaleString('fr-FR')} €</td>
                          <td className={`px-4 py-3 text-right font-semibold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                            {diff > 0 ? `+${diff.toLocaleString('fr-FR')}` : diff.toLocaleString('fr-FR')} €
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-indigo-700">{adj.toLocaleString('fr-FR')} €</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleDeleteCode(item.code)} disabled={item.locked && item.code !== 'PRORATA'} title={item.code === 'PRORATA' ? 'Supprimer le code et la ventilation PRORATA' : 'Supprimer le code'} className="rounded-lg p-2 hover:bg-rose-50 disabled:opacity-30">
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Historique des transferts</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Donneur</th>
                      <th className="px-4 py-3">Bénéficiaire</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                      <th className="px-4 py-3">Motif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.transfers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500">{t.date}</td>
                        <td className="px-4 py-3 font-semibold text-rose-600">{t.fromCode}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">{t.toCode}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{(t.amount || 0).toLocaleString('fr-FR')} €</td>
                        <td className="px-4 py-3 text-slate-600">{t.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subcontractors' && (
          <div className="space-y-6">
            {monthControls}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Sous-traitance</h2>
                <p className="mt-1 text-xs text-slate-600">Les budgets d’études sont définis dans Budget évolution. Les marchés engagés sont saisis ici, indépendamment du budget études. Les OM et régularisations font évoluer le marché. Le RAD ST est suivi net de retenue prorata : marché actualisé − prorata − factures/avoirs ST. Les ajustements mensuels restent manuels et sont contrôlés au centime.</p>
              </div>
              <button type="button" onClick={() => setActiveTab('budget')} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Créer un code ST dans Budget évolution</button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Verrou</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Entreprise</th>
                      <th className="px-4 py-3 text-center">Contrat</th>
                      <th className="px-4 py-3 text-center">Agrément</th>
                      <th className="px-4 py-3 text-right">Marché engagé HT</th>
                      <th className="px-4 py-3 text-right">Modifs</th>
                      <th className="px-4 py-3 text-right">À régulariser</th>
                      <th className="px-4 py-3 text-right">Prorata ST</th>
                      <th className="px-4 py-3 text-right">Net après prorata</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">RAD</th>
                      <th className="px-4 py-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.subContractors.map((st) => {
                      const totalContract = stMarketTotal(st);
                      const radSum = (st.radMonthly || []).reduce((a, b) => a + b, 0);
                      const balance = stBalance(st, project.expenses, project.subContractors);
                      const isLinearized = balance.differenceCents === 0;

                      return (
                        <React.Fragment key={st.id}>
                          <tr className={st.locked ? 'bg-slate-50/70' : 'hover:bg-slate-50'}>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleLockST(st.id)} className="rounded-lg p-2 hover:bg-slate-100">
                                {st.locked ? <Lock className="h-4 w-4 text-amber-600" /> : <Unlock className="h-4 w-4 text-slate-400" />}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{st.code}</td>
                            <td className="px-4 py-3">
                              <input
                                value={st.company}
                                onChange={(e) => handleUpdateSTField(st.id, 'company', e.target.value.toUpperCase())}
                                disabled={st.locked}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400 disabled:bg-slate-100"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <select
                                value={st.statusContract}
                                onChange={(e) => handleUpdateSTField(st.id, 'statusContract', e.target.value)}
                                disabled={st.locked}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400 disabled:bg-slate-100"
                              >
                                <option>Signé</option>
                                <option>En cours</option>
                                <option>Non signé</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <select
                                value={st.agreement}
                                onChange={(e) => handleUpdateSTField(st.id, 'agreement', e.target.value)}
                                disabled={st.locked}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400 disabled:bg-slate-100"
                              >
                                <option>Validé</option>
                                <option>En attente</option>
                                <option>Refusé</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input type="text" inputMode="decimal" aria-label={`Marché sous-traité de ${st.company}`} value={st.initialMarket ?? 0}
                                onChange={e => updateSTAmount(st.id, 'initialMarket', e.target.value)} disabled={st.locked}
                                className={`w-32 rounded-lg border border-slate-300 bg-white px-2 py-2 text-right disabled:bg-slate-100 ${signedAmountClass(st.initialMarket)}`} />
                            </td>
                            <td className={`px-4 py-3 text-right ${Number(st.modifications) < 0 ? 'text-rose-600' : 'text-indigo-700'}`}>{euro(st.modifications)} €</td>
                            <td className={`px-4 py-3 text-right ${Number(st.toRegularize) < 0 ? 'text-rose-600' : 'text-amber-700'}`}>{euro(st.toRegularize)} €</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex min-w-36 flex-col items-end gap-1">
                                <label className="flex items-center gap-1 text-xs text-slate-600">
                                  <input type="number" min="0" max="100" step="0.01" aria-label={`Taux de prorata de ${st.company}`}
                                    value={st.prorataRate ?? 2} disabled={st.locked}
                                    onChange={e => updateSTAmount(st.id, 'prorataRate', e.target.value)}
                                    className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-slate-900 disabled:bg-slate-100" /> %
                                </label>
                                <span className="font-semibold text-rose-700">− {euro(stProrataAmount(st))} €</span>
                              </div>
                            </td>
                            <td className={`px-4 py-3 text-right font-semibold ${signedAmountClass(stNetAfterProrata(st))}`}>{euro(stNetAfterProrata(st))} €</td>
                            <td className="px-4 py-3 text-right font-semibold">{totalContract.toLocaleString('fr-FR')} €</td>
                            <td className={`px-4 py-3 text-right font-semibold ${signedAmountClass(radSum)}`}>{euro(radSum)} €</td>
                            <td className="px-4 py-3 text-center">
                              {isLinearized ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">OK</span>
                              ) : (
                                <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">Écart</span>
                              )}
                            </td>
                          </tr>
                          <tr className="bg-slate-900/5">
                            <td colSpan={13} className="px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-xs text-slate-600">
                                  <strong>Budget études attribué au code {st.code} :</strong> {euro(adjustedBudgets[st.code] || 0)} € HT
                                  <span className="ml-3"><strong>Marché ST actualisé brut :</strong> {euro(totalContract)} € HT</span>
                                  <span className="ml-3"><strong>Marché initial saisi :</strong> {euro(st.initialMarket)} € HT</span>
                                  <span className="ml-3"><strong>OM :</strong> {euro(st.modifications)} € HT</span>
                                  <span className="ml-3"><strong>À régulariser :</strong> {euro(st.toRegularize)} € HT</span>
                                  <span className="ml-3"><strong>Prorata retenu :</strong> {euro(stProrataAmount(st))} € HT</span>
                                  <span className="ml-3"><strong>Marché net de prorata :</strong> {euro(euros(balance.netMarketCents))} € HT</span>
                                  <span className="ml-3"><strong>Factures et avoirs ST (nets) :</strong> {euro(euros(balance.billedCents))} € HT</span>
                                  <span className="ml-3"><strong>Reste à facturer prévisionnel NET de prorata :</strong> {euro(euros(balance.remainingCents))} € HT</span>
                                  <span className={`ml-3 font-bold ${isLinearized ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    Contrôle au centime : {isLinearized ? 'Équilibré' : `${euro(euros(balance.differenceCents))} € à corriger dans le RAD mensuel`}
                                  </span>
                                  <span className={`ml-3 font-semibold ${totalContract > (adjustedBudgets[st.code] || 0) ? 'text-rose-600' : 'text-emerald-700'}`}>
                                    Écart budget / marché : {euro((adjustedBudgets[st.code] || 0) - totalContract)} € HT
                                  </span>
                                </div>
                                <button type="button" className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                                  onClick={() => setExpandedST(prev => ({ ...prev, [st.id]: !prev[st.id] }))}>
                                  {expandedST[st.id] ? 'Masquer les ordres' : 'Gérer OM et régularisations'}
                                </button>
                              </div>
                              {expandedST[st.id] && (
                                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                  {[
                                    { kind: 'modification', title: 'Ordres modificatifs', key: 'modificationOrders' },
                                    { kind: 'pending', title: 'Montants à régulariser', key: 'pendingOrders' }
                                  ].map(group => {
                                    const draftKey = `${st.id}-${group.kind}`;
                                    const draft = stOrderDrafts[draftKey] || {};
                                    return <div key={group.kind} className="rounded-xl border border-slate-200 bg-white p-3">
                                      <h4 className="mb-2 text-sm font-semibold text-slate-800">{group.title}</h4>
                                      {(st[group.key] || []).map(order => <div key={order.id} className="mb-2 flex flex-wrap gap-2">
                                        <input aria-label="Référence de l'ordre" value={order.reference || ''} disabled={st.locked}
                                          onChange={e => updateSTOrder(st.id, group.kind, order.id, 'reference', e.target.value)}
                                          className="min-w-28 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
                                        <input aria-label="Montant de l'ordre" type="text" inputMode="decimal" value={order.amount ?? 0} disabled={st.locked}
                                          onChange={e => updateSTOrder(st.id, group.kind, order.id, 'amount', e.target.value)}
                                          onBlur={e => { if (!Number.isFinite(Number(e.target.value)) || e.target.value.trim() === '') updateSTOrder(st.id, group.kind, order.id, 'amount', '0'); }}
                                          className={`w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-xs ${Number(order.amount) < 0 ? 'text-rose-600' : 'text-slate-900'}`} />
                                        <button type="button" disabled={st.locked} onClick={() => deleteSTOrder(st.id, group.kind, order.id)}
                                          className="rounded-lg border border-rose-300 px-2 text-xs text-rose-600 disabled:opacity-40">Supprimer</button>
                                      </div>)}
                                      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                                        <input placeholder="N° / libellé" aria-label="Nouvelle référence" value={draft.reference || ''} disabled={st.locked}
                                          onChange={e => setSTOrderDrafts(prev => ({ ...prev, [draftKey]: { ...prev[draftKey], reference: e.target.value } }))}
                                          className="min-w-28 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
                                        <input placeholder="Montant HT" aria-label="Nouveau montant" type="text" inputMode="decimal" value={draft.amount ?? ''} disabled={st.locked}
                                          onChange={e => setSTOrderDrafts(prev => ({ ...prev, [draftKey]: { ...prev[draftKey], amount: e.target.value } }))}
                                          className={`w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-xs ${Number(draft.amount) < 0 ? 'text-rose-600' : 'text-slate-900'}`} />
                                        <button type="button" disabled={st.locked} onClick={() => addSTOrder(st.id, group.kind)}
                                          className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Ajouter</button>
                                      </div>
                                    </div>;
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                          <tr className="bg-slate-50">
                            <td colSpan={5} className="px-4 py-3 text-xs text-slate-500">
                              RAD mensuel
                            </td>
                            <td colSpan={8} className="px-4 py-3">
                              <div className="flex flex-wrap gap-2 justify-end">
                                {visibleMonthEntries.map(({ label: m, index: mIdx }) => (
                                  <div key={mIdx} className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] text-slate-400">{m}</span>
                                    <input
                                      type="number" step="0.01"
                                      value={st.radMonthly?.[mIdx] || 0}
                                      onChange={(e) => handleSTMonthlyRadChange(st.id, mIdx, e.target.value)}
                                      disabled={st.locked}
                                      className={`w-24 rounded-xl border border-slate-200 bg-white px-2 py-2 text-right text-xs outline-none focus:border-indigo-400 disabled:bg-slate-100 ${signedAmountClass(st.radMonthly?.[mIdx])}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rad' && (
          <div className="space-y-6">
            {monthControls}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Planning RAD et facturation</h2>
              {billingScheduleErrors.length > 0 ? (
                <div role="alert" aria-live="polite" className="mt-4 rounded-xl border-2 border-rose-500 bg-rose-50 p-4 text-rose-900">
                  <div className="flex items-center gap-2 font-bold"><AlertTriangle size={18} /> ERREUR DE VENTILATION : facturation mensuelle non équilibrée</div>
                  <p className="mt-1 text-sm">La somme des mois doit correspondre au montant du marché de base et à chaque avenant, séparément. Corrigez les cellules ci-dessous dans RAD.</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {billingScheduleErrors.map(item => <li key={item.id}><strong>{item.label}</strong> : prévu {euro(item.planned)} / attendu {euro(item.expected)} — {item.difference > 0 ? 'reste à ventiler' : 'sur-ventilation'} : {euro(Math.abs(item.difference))}</li>)}
                  </ul>
                </div>
              ) : (
                <div role="status" className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Facturation linéarisée : marché de base et avenants équilibrés.</div>
              )}

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Indicateur</th>
                        <th className="px-4 py-3 text-right">Total chantier</th>
                        {visibleMonthEntries.map(({ label: m, index: idx }) => <th key={idx} className="px-4 py-3 text-center">{m}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-indigo-50/40">
                        <td className="px-4 py-3 font-semibold text-emerald-700">Facturation prévisionnelle du marché de base HT (modifiable dans RAD)</td>
                        <td className={`px-4 py-3 text-right font-semibold ${billingScheduleErrors.some(x => x.id === 'base') ? 'bg-rose-100 text-rose-800' : 'text-emerald-700'}`}>{totalSalesVentileBase.toLocaleString('fr-FR')} € {billingScheduleErrors.some(x => x.id === 'base') ? '⚠' : '✓'}</td>
                        {visibleMonthEntries.map(({ label: _, index: mIdx }) => (
                          <td key={mIdx} className="px-3 py-2">
                            <input
                              type="number"
                              value={project.clientSalesPlan?.[mIdx] || 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setProject(prev => {
                                  const newPlan = [...(prev.clientSalesPlan || Array(prev.monthsCount).fill(0))];
                                  newPlan[mIdx] = val;
                                  return { ...prev, clientSalesPlan: newPlan };
                                });
                              }}
                              className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-xs outline-none focus:border-indigo-400"
                            />
                          </td>
                        ))}
                      </tr>

                      {(project.clientAmendments || []).map(amendment => (
                        <tr key={`billing-amendment-${amendment.id}`} className="bg-indigo-50/20">
                          <td className="px-4 py-3 font-semibold text-indigo-700">Facturation prévisionnelle avenant {amendment.number}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${billingScheduleErrors.some(x => x.id === amendment.id) ? 'bg-rose-100 text-rose-800' : 'text-indigo-700'}`}>{(amendment.billingMonthly || []).reduce((sum,v)=>sum+(Number(v)||0),0).toLocaleString('fr-FR')} € / {Number(amendment.amount).toLocaleString('fr-FR')} € {billingScheduleErrors.some(x => x.id === amendment.id) ? '⚠' : '✓'}</td>
                          {visibleMonthEntries.map(({index: mIdx}) => (
                            <td key={mIdx} className="px-3 py-2"><input type="number" step="0.01" value={amendment.billingMonthly?.[mIdx] ?? 0}
                              onChange={e => { const val = Number(e.target.value) || 0; setProject(prev => ({ ...prev, clientAmendments: prev.clientAmendments.map(a => {
                                if (a.id !== amendment.id) return a;
                                const next = [...(a.billingMonthly || Array(prev.months.length).fill(0))]; next[mIdx] = val;
                                return { ...a, billingMonthly: next };
                              }) })); }}
                              className="w-24 rounded-xl border border-indigo-200 bg-white px-2 py-2 text-center text-xs" aria-label={`Facturation ${amendment.number} ${project.months[mIdx]}`} /></td>
                          ))}
                        </tr>
                      ))}
                      <tr className="bg-emerald-950 text-white">
                        <td className="bg-emerald-950 px-4 py-3 font-bold text-white">Facturation client totale HT (base + avenants + révision)</td>
                        <td className="bg-emerald-950 px-4 py-3 text-right font-bold text-white">{totalSalesVentile.toLocaleString('fr-FR')} €</td>
                        {visibleMonthEntries.map(({index: idx}) => <td key={idx} className="bg-emerald-950 px-4 py-3 text-center font-bold text-white">{monthlySalesForecast[idx].toLocaleString('fr-FR')} €</td>)}
                      </tr>

                      {priceRevisionCalculations.enabled && (
                        <>
                          <tr>
                            <td className="px-4 py-3 font-semibold text-slate-700">Révision de prix</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">{priceRevisionCalculations.totalRevisionAmount.toLocaleString('fr-FR')} €</td>
                            {visibleMonthEntries.map(({index: idx}) => { const month = priceRevisionCalculations.monthlyData[idx]; return <td key={idx} className="px-4 py-3 text-center text-emerald-600">{month.revisionAmount.toLocaleString('fr-FR')} €</td>; })}
                          </tr>
                          <tr className="bg-indigo-50/40">
                            <td className="px-4 py-3 font-semibold text-emerald-700">Facturation client HT révisée, avenants compris</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">{totalSalesVentile.toLocaleString('fr-FR')} €</td>
                            {visibleMonthEntries.map(({index: idx}) => { const value = monthlySalesForecast[idx]; return <td key={idx} className="px-4 py-3 text-center font-semibold text-emerald-700">{value.toLocaleString('fr-FR')} €</td>; })}
                          </tr>
                        </>
                      )}

                      <tr>
                        <td className="px-4 py-3 font-semibold text-slate-700">Dépenses engagées HT</td>
                        <td className="px-4 py-3 text-right font-semibold text-sky-700">
                          {actualExpensesMonthly.reduce((sum, value) => sum + value, 0).toLocaleString('fr-FR')} €
                        </td>
                        {visibleMonthEntries.map(({index: idx}) => <td key={idx} className="px-4 py-3 text-center text-sky-700">{(actualExpensesMonthly[idx] || 0).toLocaleString('fr-FR')} €</td>)}
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-semibold text-slate-700">Dépenses RAD totales HT</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {totalRADMonthly.reduce((a, b) => a + b, 0).toLocaleString('fr-FR')} €
                        </td>
                        {totalRADMonthly.map((v, idx) => <td key={idx} className="px-4 py-3 text-center text-slate-600">{v.toLocaleString('fr-FR')} €</td>)}
                      </tr>

                      <tr>
                        <td className="px-4 py-3 font-semibold text-slate-700">Frais généraux</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {(totalSalesVentile * (metrics.overheadRate / 100)).toLocaleString('fr-FR')} €
                        </td>
                        {visibleMonthEntries.map(({ label: _, index: mIdx }) => {
                          const sales = monthlySalesForecast[mIdx] || 0;
                          return <td key={mIdx} className="px-4 py-3 text-center text-slate-600">{(sales * (metrics.overheadRate / 100)).toLocaleString('fr-FR')} €</td>;
                        })}
                      </tr>

                      <tr className="bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-indigo-700">Marge nette mensuelle</td>
                        <td className="px-4 py-3 text-right font-semibold text-indigo-700">
                          {project.months.reduce((sum, _, monthIdx) => {
                            const sales = monthlySalesForecast[monthIdx] || 0;
                            const costs = (actualExpensesMonthly[monthIdx] || 0) + (totalRADMonthly[monthIdx] || 0);
                            return sum + costs * -1 + sales - (sales * (metrics.overheadRate / 100));
                          }, 0).toLocaleString('fr-FR')} €
                        </td>
                        {visibleMonthEntries.map(({ label: _, index: mIdx }) => {
                          const sales = monthlySalesForecast[mIdx] || 0;
                          const engaged = actualExpensesMonthly[mIdx] || 0;
                          const rad = totalRADMonthly[mIdx] || 0;
                          const net = sales - engaged - rad - (sales * (metrics.overheadRate / 100));
                          return <td key={mIdx} className={`px-4 py-3 text-center font-semibold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{net.toLocaleString('fr-FR')} €</td>;
                        })}
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-indigo-700">Marge nette mensuelle (%)</td>
                        <td className="px-4 py-3 text-right font-semibold text-indigo-700">{totalSalesVentile !== 0 ? ((totalSalesVentile - actualExpensesMonthly.reduce((a,b) => a+b, 0) - totalRADMonthly.reduce((a,b) => a+b, 0) - totalSalesVentile * metrics.overheadRate / 100) / totalSalesVentile * 100).toFixed(2) : '—'} %</td>
                        {visibleMonthEntries.map(({ label: _, index: idx }) => { const sales = monthlySalesForecast[idx] || 0; const net = sales - (actualExpensesMonthly[idx] || 0) - (totalRADMonthly[idx] || 0) - sales * metrics.overheadRate / 100; return <td key={idx} className="px-4 py-3 text-center font-semibold">{sales !== 0 ? (net / sales * 100).toFixed(2) + ' %' : '—'}</td>; })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Charges directes – saisie RAD</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Libellé</th>
                      <th className="px-4 py-3 text-right">Réajusté</th>
                      <th className="px-4 py-3 text-right">Facturé</th>
                      <th className="px-4 py-3 text-right">RAD</th>
                      <th className="px-4 py-3 text-right">Atterrissage</th>
                      <th className="px-4 py-3 text-right">Écart</th>
                      {visibleMonthEntries.map(({ label: m, index: idx }) => <th key={idx} className="px-4 py-3 text-center">{m}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.imputationCodes.filter(c => c.family !== 'Sous-traitance' && c.code !== 'PRORATA').map((item) => {
                      const adj = adjustedBudgets[item.code] || 0;
                      const exp = actualExpensesByCode[item.code] || 0;
                      const radSum = radNonSTTotals[item.code] || 0;
                      const forecast = exp + radSum;
                      const margin = adj - forecast;
                      return (
                        <tr key={item.code} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{item.code}</td>
                          <td className="px-4 py-3 text-slate-700">{item.label}</td>
                          <td className="px-4 py-3 text-right font-medium">{adj.toLocaleString('fr-FR')} €</td>
                          <td className="px-4 py-3 text-right text-sky-700">{exp.toLocaleString('fr-FR')} €</td>
                          <td className="px-4 py-3 text-right text-emerald-700">{radSum.toLocaleString('fr-FR')} €</td>
                          <td className="px-4 py-3 text-right font-semibold">{forecast.toLocaleString('fr-FR')} €</td>
                          <td className={`px-4 py-3 text-right font-semibold ${margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {margin >= 0 ? `+${margin.toLocaleString('fr-FR')}` : margin.toLocaleString('fr-FR')} €
                          </td>
                          {visibleMonthEntries.map(({ label: _, index: mIdx }) => (
                            <td key={mIdx} className="px-3 py-2">
                              <input
                                type="number"
                                value={project.radNonST[item.code]?.[mIdx] || 0}
                                onChange={(e) => handleRadNonSTChange(item.code, mIdx, e.target.value)}
                                className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-xs outline-none focus:border-indigo-400"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">RAD sous-traitants – report automatique</h3>
                <p className="mt-1 text-xs text-slate-500">Consultation uniquement : toute modification se fait dans l’onglet Sous-traitance.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Entreprise</th>
                      <th className="px-4 py-3 text-right">Marché net de prorata</th>
                      <th className="px-4 py-3 text-right">RAD total</th>
                      {visibleMonthEntries.map(({ label: month, index: idx }) => <th key={idx} className="px-4 py-3 text-center">{month}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.subContractors.map(st => {
                      const contract = stNetAfterProrata(st);
                      const total = (st.radMonthly || []).reduce((sum, value) => sum + (Number(value) || 0), 0);
                      return (
                        <tr key={st.id}>
                          <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{st.code}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{st.company}</td>
                          <td className="px-4 py-3 text-right">{contract.toLocaleString('fr-FR')} €</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">{total.toLocaleString('fr-FR')} €</td>
                          {visibleMonthEntries.map(({ label: _, index: monthIdx }) => <td key={monthIdx} className="whitespace-nowrap px-4 py-3 text-center">{(Number(st.radMonthly?.[monthIdx]) || 0).toLocaleString('fr-FR')} €</td>)}
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={4} className="px-4 py-3">Total RAD sous-traitants</td>
                      {visibleMonthEntries.map(({ label: _, index: monthIdx }) => {
                        const total = project.subContractors.reduce((sum, st) => sum + (Number(st.radMonthly?.[monthIdx]) || 0), 0);
                        return <td key={monthIdx} className="px-4 py-3 text-center">{total.toLocaleString('fr-FR')} €</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">RAD prorata – report automatique</h3>
                <p className="mt-1 text-xs text-slate-500">Consultation uniquement : les postes et montants se modifient dans l’onglet Prorata.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Poste</th>
                      <th className="px-4 py-3 text-right">RAD total</th>
                      {visibleMonthEntries.map(({ label: month, index: idx }) => <th key={idx} className="px-4 py-3 text-center">{month}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.prorataItems.map(item => {
                      const total = (item.monthly || []).reduce((sum, value) => sum + (Number(value) || 0), 0);
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-mono font-semibold text-indigo-700">PRORATA</td>
                          <td className="px-4 py-3 text-slate-800">{item.item}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">{total.toLocaleString('fr-FR')} €</td>
                          {visibleMonthEntries.map(({ label: _, index: monthIdx }) => <td key={monthIdx} className="whitespace-nowrap px-4 py-3 text-center">{(Number(item.monthly?.[monthIdx]) || 0).toLocaleString('fr-FR')} €</td>)}
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={2} className="px-4 py-3">Total RAD prorata</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{(radNonSTTotals.PRORATA || 0).toLocaleString('fr-FR')} €</td>
                      {visibleMonthEntries.map(({ label: _, index: monthIdx }) => {
                        const total = project.prorataItems.reduce((sum, item) => sum + (Number(item.monthly?.[monthIdx]) || 0), 0);
                        return <td key={monthIdx} className="px-4 py-3 text-center">{total.toLocaleString('fr-FR')} €</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'epicier' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Cahier Épicier</h2>
              </div>
              <ActionButton tone="indigo" icon={Plus} onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}>
                Nouvelle dépense
              </ActionButton>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Totaux des dépenses du Cahier d'épicier">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-medium text-slate-500">Total engagé HT — toutes les factures et avoirs</div>
                <div className={`mt-2 text-2xl font-bold ${signedAmountClass(totalEpicierEngageCents)}`}>
                  {formatEpicierCents(totalEpicierEngageCents)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-medium text-slate-500">Total engagé HT — sélection filtrée</div>
                <div className={`mt-2 text-2xl font-bold ${signedAmountClass(totalEpicierFiltreCents)}`}>
                  {formatEpicierCents(totalEpicierFiltreCents)}
                </div>
                <div className="mt-1 text-xs text-slate-500">Mis à jour selon la recherche, la période et le code sélectionnés.</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
              <Field label="Recherche">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Fournisseur ou objet..."
                    value={expenseFilterSupplier}
                    onChange={(e) => setExpenseFilterSupplier(e.target.value)}
                    className="w-full outline-none"
                  />
                </div>
              </Field>
              <Field label="Période">
                <select
                  value={expenseFilterPeriod}
                  onChange={(e) => setExpenseFilterPeriod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                >
                  <option value="ALL">Toutes les périodes</option>
                  {project.months.map((m, i) => <option key={i} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Code">
                <select
                  value={expenseFilterCode}
                  onChange={(e) => setExpenseFilterCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                >
                  <option value="ALL">Tous les codes</option>
                  {project.imputationCodes.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Verrou</th>
                      <th className="px-4 py-3">ID / Période</th>
                      <th className="px-4 py-3">Fournisseur</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Commande</th>
                      <th className="px-4 py-3 text-right">Facture</th>
                      <th className="px-4 py-3 text-center">Date</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className={exp.locked ? 'bg-slate-50/70' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleLockExpense(exp.id)} className="rounded-lg p-2 hover:bg-slate-100">
                            {exp.locked ? <Lock className="h-4 w-4 text-amber-600" /> : <Unlock className="h-4 w-4 text-slate-400" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          <div className="font-mono text-sm font-semibold text-slate-700">{exp.id}</div>
                          <div className="text-[11px]">{exp.period}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{exp.supplier}</td>
                        <td className="px-4 py-3 text-slate-600">{exp.description}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{exp.subCode}</td>
                        <td className="px-4 py-3 text-slate-500">{exp.poNumber || '-'}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${signedAmountClass(exp.invoiceAmount)}`}>{(parseFloat(exp.invoiceAmount) || 0).toLocaleString('fr-FR')} €</td>
                        <td className="px-4 py-3 text-center text-slate-500">{exp.invoiceDate || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEditExpense(exp)} disabled={exp.locked} className="rounded-lg p-2 hover:bg-indigo-50 disabled:opacity-30">
                              <Edit3 className="h-4 w-4 text-indigo-600" />
                            </button>
                            <button onClick={() => handleDeleteExpense(exp.id)} disabled={exp.locked} className="rounded-lg p-2 hover:bg-rose-50 disabled:opacity-30">
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prorata' && project.prorataRemoved && <div className="rounded-2xl border p-6">Le code PRORATA a été supprimé. Rétablissez-le depuis Budget évolution pour gérer sa ventilation.</div>}
      {activeTab === 'prorata' && !project.prorataRemoved && (
          <div className="space-y-6">
            {monthControls}
            <div className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Prorata de chantier</h2>
                <div className="mt-3 flex flex-wrap gap-5 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Budget attribué dans Budget évolution (lecture seule)</div>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number" min="0" step="any"
                        value={adjustedBudgets.PRORATA ?? 0}
                        readOnly
                        className="w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm font-semibold outline-none focus:border-indigo-400"
                      />
                      <span className="text-slate-500">€ HT</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">RAD ventilé</div>
                    <div className="mt-2 font-semibold text-emerald-600">{(radNonSTTotals.PRORATA || 0).toLocaleString('fr-FR')} € HT</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Écart budget / RAD</div>
                    <div className={`mt-2 font-semibold ${((adjustedBudgets.PRORATA || 0) - (radNonSTTotals.PRORATA || 0)) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {((adjustedBudgets.PRORATA || 0) - (radNonSTTotals.PRORATA || 0)).toLocaleString('fr-FR')} € HT
                    </div>
                  </div>
                </div>
              </div>
              <form onSubmit={handleAddProrataItem} className="flex flex-wrap items-center gap-2">
                <input
                  value={newProrataName}
                  onChange={(e) => setNewProrataName(e.target.value)}
                  placeholder="Intitulé du nouveau poste"
                  className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <ActionButton tone="indigo" icon={Plus} onClick={handleAddProrataItem}>Ajouter un poste</ActionButton>
              </form>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Verrou</th>
                      <th className="px-4 py-3">Poste de prorata</th>
                      <th className="px-4 py-3 text-right">Total RAD</th>
                      {visibleMonthEntries.map(({ label: month, index: idx }) => <th key={idx} className="px-4 py-3 text-center">{month}</th>)}
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.prorataItems.map((item) => {
                      const total = (item.monthly || []).reduce((sum, value) => sum + (Number(value) || 0), 0);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <button onClick={() => toggleLockProrata(item.id)} className="rounded-lg p-2 hover:bg-slate-100" title={item.locked ? 'Déverrouiller le poste' : 'Verrouiller le poste'}>
                              {item.locked ? <Lock className="h-4 w-4 text-amber-600" /> : <Unlock className="h-4 w-4 text-slate-400" />}
                            </button>
                          </td>
                          <td className="min-w-[230px] px-4 py-3">
                            <input
                              value={item.item}
                              onChange={(e) => handleUpdateProrataLabel(item.id, e.target.value)}
                              disabled={item.locked}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-600">{total.toLocaleString('fr-FR')} €</td>
                          {visibleMonthEntries.map(({ label: _, index: monthIdx }) => (
                            <td key={monthIdx} className="px-3 py-2">
                              <input
                                type="number" min="0" step="any"
                                value={item.monthly?.[monthIdx] ?? 0}
                                onChange={(e) => handleProrataMonthlyChange(item.id, monthIdx, e.target.value)}
                                disabled={item.locked}
                                className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-xs outline-none focus:border-indigo-400 disabled:bg-slate-100"
                              />
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleDeleteProrataItem(item.id)} disabled={item.locked} title="Supprimer le poste" className="rounded-lg p-2 hover:bg-rose-50 disabled:opacity-30">
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={2} className="px-4 py-3">Total prorata</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{(radNonSTTotals.PRORATA || 0).toLocaleString('fr-FR')} €</td>
                      {visibleMonthEntries.map(({ label: _, index: monthIdx }) => {
                        const total = project.prorataItems.reduce((sum, item) => sum + (Number(item.monthly?.[monthIdx]) || 0), 0);
                        return <td key={monthIdx} className="px-4 py-3 text-center">{total.toLocaleString('fr-FR')} €</td>;
                      })}
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'revision' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Révision de prix</h2>
              </div>
              <ActionButton
                tone={project.priceRevision?.enabled ? 'emerald' : 'slate'}
                onClick={() => setProject(p => ({ ...p, priceRevision: { ...p.priceRevision, enabled: !p.priceRevision?.enabled } }))}
              >
                {project.priceRevision?.enabled ? 'Révision activée' : 'Révision désactivée'}
              </ActionButton>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field label="Nom de l'index">
                <input
                  value={project.priceRevision?.indexName || 'BT01'}
                  onChange={(e) => setProject(p => ({ ...p, priceRevision: { ...p.priceRevision, indexName: e.target.value } }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                />
              </Field>
              <Field label="I0">
                <input
                  type="number"
                  step="any"
                  value={project.priceRevision?.baseIndexValue || 100}
                  onChange={(e) => setProject(p => ({ ...p, priceRevision: { ...p.priceRevision, baseIndexValue: parseFloat(e.target.value) || 1 } }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                />
              </Field>
              <Field label="Part fixe a">
                <input
                  type="number"
                  step="0.01"
                  value={project.priceRevision?.fixedPart || 0.15}
                  onChange={(e) => setProject(p => ({ ...p, priceRevision: { ...p.priceRevision, fixedPart: parseFloat(e.target.value) || 0 } }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                />
              </Field>
              <Field label="Part variable b">
                <input
                  type="number"
                  step="0.01"
                  value={project.priceRevision?.variablePart || 0.85}
                  onChange={(e) => setProject(p => ({ ...p, priceRevision: { ...p.priceRevision, variablePart: parseFloat(e.target.value) || 0 } }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                />
              </Field>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Mois</th>
                      <th className="px-4 py-3 text-center">In</th>
                      <th className="px-4 py-3 text-center">K</th>
                      <th className="px-4 py-3 text-center">ΔK</th>
                      <th className="px-4 py-3 text-right">Base</th>
                      <th className="px-4 py-3 text-right">ΔP</th>
                      <th className="px-4 py-3 text-right">Révisé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {priceRevisionCalculations.monthlyData.map((mRev, mIdx) => (
                      <tr key={mIdx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{mRev.month}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="any"
                            value={mRev.indexValue}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || priceRevisionCalculations.i0;
                              setProject(prev => {
                                const newIdxs = [...(prev.priceRevision?.monthlyIndexes || [])];
                                newIdxs[mIdx] = val;
                                return { ...prev, priceRevision: { ...prev.priceRevision, monthlyIndexes: newIdxs } };
                              });
                            }}
                            className="w-28 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-xs outline-none focus:border-indigo-400"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-800">{mRev.kCoeff.toFixed(4)}</td>
                        <td className={`px-4 py-3 text-center font-semibold ${mRev.revisionRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {(mRev.revisionRate * 100).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{mRev.baseBilling.toLocaleString('fr-FR')} €</td>
                        <td className={`px-4 py-3 text-right font-semibold ${mRev.revisionAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          +{mRev.revisionAmount.toLocaleString('fr-FR')} €
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{mRev.revisedBilling.toLocaleString('fr-FR')} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {showAiAssistant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Bot className="h-5 w-5 text-indigo-600" />
                Assistant IA
              </div>
              <button onClick={() => setShowAiAssistant(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
              {aiDiagnostics.length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
                  Aucune incohérence détectée.
                </div>
              ) : (
                aiDiagnostics.map((diag) => (
                  <div key={diag.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">{diag.title}</div>
                      <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">{diag.code}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{diag.message}</p>
                    <p className="mt-2 text-xs font-medium text-indigo-700">Solution conseillée : {diag.action}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-sm font-semibold text-slate-900">Ajouter un code</h3>
              <button onClick={() => setShowCodeModal(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAddCode} className="mt-4 space-y-4 text-sm">
              <Field label="Famille">
                <select
                  value={newCode.family}
                  onChange={(e) => {
                    const fam = e.target.value;
                    const defaultTrade = TRADE_CODES_DICTIONARY[fam]?.[0]?.code || '';
                    setNewCode(c => ({ ...c, family: fam, tradeKey: defaultTrade }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                >
                  <option value="Sous-traitance">Sous-traitance</option>
                  <option value="Matériaux">Matériaux</option>
                  <option value="Location">Location</option>
                  <option value="Main-d’œuvre">Main-d’œuvre</option>
                  <option value="Encadrement">Encadrement</option>
                  <option value="Frais divers">Frais divers</option>
                </select>
              </Field>

              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!newCode.useCustomCode} onChange={e => setNewCode(v => ({ ...v, useCustomCode: e.target.checked }))} /> Créer un code personnalisé dans cette famille</label>
              {!newCode.useCustomCode && TRADE_CODES_DICTIONARY[newCode.family] ? (
                <Field label="Code normalisé">
                  <select
                    value={newCode.tradeKey}
                    onChange={(e) => {
                      const tk = e.target.value;
                      const found = TRADE_CODES_DICTIONARY[newCode.family].find(t => t.code === tk);
                      setNewCode(c => ({ ...c, tradeKey: tk, label: found?.label || '' }));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                  >
                    {TRADE_CODES_DICTIONARY[newCode.family].map(t => <option key={t.code} value={t.code}>{t.code} - {t.label}</option>)}
                  </select>
                </Field>
              ) : (
                <Field label="Code personnalisé">
                  <input
                    value={newCode.customCode}
                    onChange={(e) => setNewCode(c => ({ ...c, customCode: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 uppercase outline-none focus:border-indigo-400"
                  />
                </Field>
              )}

              <Field label="Libellé">
                <input
                  value={newCode.label}
                  onChange={(e) => setNewCode(c => ({ ...c, label: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Unité">
                  <input
                    value={newCode.unit}
                    onChange={(e) => setNewCode(c => ({ ...c, unit: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                  />
                </Field>
                <Field label="Budget total HT">
                  <input
                    type="number"
                    step="any"
                    value={newCode.totalBudget || ''}
                    onChange={(e) => setNewCode(c => ({ ...c, totalBudget: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCodeModal(false)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  Annuler
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                  Créer le code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-sm font-semibold text-slate-900">Nouveau transfert</h3>
              <button onClick={() => setShowTransferModal(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAddTransfer} className="mt-4 space-y-4 text-sm">
              <Field label="Poste donneur">
                <select
                  value={newTransfer.fromCode}
                  onChange={(e) => setNewTransfer(t => ({ ...t, fromCode: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                >
                  <option value="">Sélectionner</option>
                  {project.imputationCodes.filter(c => c.code !== 'PRORATA').map(c => <option key={c.code} value={c.code}>{c.code} - {c.label}</option>)}
                </select>
              </Field>
              <Field label="Poste bénéficiaire">
                <select
                  value={newTransfer.toCode}
                  onChange={(e) => setNewTransfer(t => ({ ...t, toCode: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                >
                  <option value="">Sélectionner</option>
                  {project.imputationCodes.filter(c => c.code !== 'PRORATA').map(c => <option key={c.code} value={c.code}>{c.code} - {c.label}</option>)}
                </select>
              </Field>
              <Field label="Montant HT">
                <input
                  type="number"
                  step="any"
                  value={newTransfer.amount}
                  onChange={(e) => setNewTransfer(t => ({ ...t, amount: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                />
              </Field>
              <Field label="Motif">
                <input
                  value={newTransfer.reason}
                  onChange={(e) => setNewTransfer(t => ({ ...t, reason: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowTransferModal(false)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  Annuler
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-sm font-semibold text-slate-900">{editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}</h3>
              <button onClick={() => setShowExpenseModal(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="mt-4 space-y-4 text-sm">
              <Field label="Fournisseur">
                <input
                  value={newExpense.supplier}
                  onChange={(e) => setNewExpense(ex => ({ ...ex, supplier: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                />
              </Field>
              <Field label="Code">
                <select
                  value={newExpense.subCode}
                  onChange={(e) => setNewExpense(ex => ({ ...ex, subCode: e.target.value, stId: '' }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                >
                  <option value="">Sélectionner</option>
                  {project.imputationCodes.map(c => <option key={c.code} value={c.code}>{c.code} - {c.label}</option>)}
                </select>
              </Field>
              {project.imputationCodes.find(c => c.code === newExpense.subCode)?.family === 'Sous-traitance' && (
                <Field label="Marché sous-traitant concerné (rapprochement obligatoire)">
                  <select value={newExpense.stId || ''} required
                    onChange={e => setNewExpense(ex => ({ ...ex, stId: e.target.value }))}
                    className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
                    <option value="">Sélectionner le sous-traitant</option>
                    {project.subContractors.filter(st => st.code === newExpense.subCode).map(st =>
                      <option key={st.id} value={String(st.id)}>{st.company} — {st.code}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-amber-800">La facture ou l’avoir est comptabilisé en réel (montant ST net de prorata). Ajustez manuellement les mensualités ST : leur total doit égaler le marché net de prorata moins les factures et avoirs, au centime.</p>
                </Field>
              )}
              <Field label="Description">
                <input
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(ex => ({ ...ex, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Période">
                  <select
                    value={newExpense.period}
                    onChange={(e) => setNewExpense(ex => ({ ...ex, period: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                  >
                    {project.months.map((m, i) => <option key={i} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Montant HT">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newExpense.invoiceAmount}
                    onChange={(e) => setNewExpense(ex => ({ ...ex, invoiceAmount: e.target.value }))}
                    className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400 ${signedAmountClass(newExpense.invoiceAmount)}`}
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  Annuler
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSTModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-sm font-semibold text-slate-900">Nouveau marché ST</h3>
              <button onClick={() => setShowSTModal(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAddST} className="mt-4 space-y-4 text-sm">
              <Field label="Code ST">
                <select
                  value={newST.code}
                  onChange={(e) => setNewST(st => ({ ...st, code: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                >
                  <option value="">Sélectionner</option>
                  {project.imputationCodes.filter(c => c.code.startsWith('ST')).map(c => <option key={c.code} value={c.code}>{c.code} - {c.label}</option>)}
                </select>
              </Field>
              <Field label="Entreprise">
                <input
                  value={newST.company}
                  onChange={(e) => setNewST(st => ({ ...st, company: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Marché sous-traité initial HT (distinct du budget études)">
                  <input
                    type="number"
                    step="any"
                    value={newST.initialMarket}
                    onChange={(e) => setNewST(st => ({ ...st, initialMarket: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
                  />
                </Field>

              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prorata ST (%) – 2 % par défaut">
                  <input type="number" min="0" max="100" step="0.01" value={newST.prorataRate}
                    onChange={e => setNewST(st => ({ ...st, prorataRate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ordres modificatifs initiaux HT">
                  <input type="number" step="0.01" value={newST.modifications} onChange={e => setNewST(st => ({ ...st, modifications: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                </Field>
                <Field label="À régulariser HT">
                  <input type="number" step="0.01" value={newST.toRegularize} onChange={e => setNewST(st => ({ ...st, toRegularize: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                </Field>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowSTModal(false)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  Annuler
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <footer className="border-t border-slate-700 py-5 text-center text-xs font-semibold tracking-widest text-slate-400">Made by WB</footer>
    </div>
  );
}