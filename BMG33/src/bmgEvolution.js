// Montants financiers figés en centimes pour éviter les erreurs d'arrondi.
const cents = n => Math.round((Number(n) || 0) * 100);
const sum = arr => arr.reduce((a, b) => a + cents(b), 0);
export const euroBmg = n => (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
export function captureBmg(project, adjustedBudgets) {
  const codes = new Map((project.imputationCodes || []).map(c => [c.code, c]));
  const real = {};
  for (const e of project.expenses || []) real[e.subCode] = (real[e.subCode] || 0) + cents(e.invoiceAmount);
  const rad = {};
  for (const [code, months] of Object.entries(project.radNonST || {})) rad[code] = sum(months);
  for (const st of project.subContractors || []) rad[st.code] = (rad[st.code] || 0) + sum(st.radMonthly || []);
  rad.PRORATA = (project.prorataItems || []).reduce((n, item) => n + sum(item.monthly || []), 0);
  const allCodes = new Set([...codes.keys(), ...Object.keys(real), ...Object.keys(rad), ...Object.keys(adjustedBudgets || {})]);
  const rows = [...allCodes].sort().map(code => {
    const budget = cents(adjustedBudgets?.[code] || 0), actual = real[code] || 0, remaining = rad[code] || 0;
    return { code, label: codes.get(code)?.label || code, budget: budget / 100, actual: actual / 100, rad: remaining / 100, cost: (actual + remaining) / 100, gain: (budget - actual - remaining) / 100 };
  });
  const totalBudget = rows.reduce((n, r) => n + cents(r.budget), 0) / 100;
  const totalCost = rows.reduce((n, r) => n + cents(r.cost), 0) / 100;
  return { rows, totalBudget, totalCost, totalGain: Math.round((totalBudget - totalCost) * 100) / 100 };
}
export function compareBmg(previous, current) {
  const p = new Map(previous.rows.map(r => [r.code, r]));
  const c = new Map(current.rows.map(r => [r.code, r]));
  const rows = [...new Set([...p.keys(), ...c.keys()])].sort().map(code => {
    const a = p.get(code), b = c.get(code);
    const previousGain = a?.gain || 0, currentGain = b?.gain || 0;
    return { code, label: b?.label || a?.label || code, budget: b?.budget || 0, previousGain, currentGain, delta: (cents(currentGain) - cents(previousGain)) / 100 };
  });
  return { previous, current, rows, totalDelta: (cents(current.totalGain) - cents(previous.totalGain)) / 100 };
}
