// Rapprochement en centimes pour éviter les écarts d'arrondi flottants.
export const cents = value => Math.round((Number(value) || 0) * 100);
export const euros = value => value / 100;
export const contractCents = st => cents(st.initialMarket) + cents(st.modifications) + cents(st.toRegularize);
export const prorataCents = st => Math.round(contractCents(st) * (Number(st.prorataRate ?? 2) || 0) / 100);
export const netContractCents = st => contractCents(st) - prorataCents(st);
export const invoiceST = (expense, contractors) => {
  if (expense.stId !== undefined && expense.stId !== null && expense.stId !== '') {
    return contractors.find(st => String(st.id) === String(expense.stId)) || null;
  }
  const matches = contractors.filter(st => st.code === expense.subCode);
  return matches.length === 1 ? matches[0] : null;
};
export const stBalance = (st, expenses, contractors) => {
  const invoices = expenses.filter(exp => invoiceST(exp, contractors)?.id === st.id);
  const billedCents = invoices.reduce((total, exp) => total + cents(exp.invoiceAmount), 0);
  const marketCents = contractCents(st);
  const withheldCents = prorataCents(st);
  const netMarketCents = netContractCents(st);
  const remainingCents = netMarketCents - billedCents;
  const radCents = (st.radMonthly || []).reduce((total, amount) => total + cents(amount), 0);
  return { invoices, billedCents, marketCents, withheldCents, netMarketCents, remainingCents, radCents, differenceCents: radCents - remainingCents };
};
