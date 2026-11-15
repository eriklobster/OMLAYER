// Read-only allocation previews. Percentages are configured privately, not inferred.
// Nothing in this module changes balances or creates ledger entries.
export function parseAllocationPlan(raw) {
  let plan;
  try { plan = typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { throw new Error('Invalid allocation JSON'); }
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new Error('Allocation plan must be an object');
  }
  const pairs = Object.entries(plan);
  if (pairs.length < 1 || pairs.length > 12) throw new Error('Expected 1–12 banks');
  const banks = pairs.map(([name, percentage], index) => {
    if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]{0,31}$/u.test(name)) {
      throw new Error('Invalid bank name');
    }
    if (typeof percentage !== 'number' || !Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new Error('Invalid percentage');
    }
    const basisPoints = Math.round(percentage * 100);
    if (Math.abs(basisPoints - percentage * 100) > 1e-7) {
      throw new Error('Percentages must have at most two decimal places');
    }
    return {name, basisPoints, index};
  });
  if (banks.reduce((sum, bank) => sum + bank.basisPoints, 0) !== 10000) {
    throw new Error('Percentages must total exactly 100%');
  }
  return banks;
}

export function previewAllocation(amountCents, rawPlan) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 100000000000) {
    throw new Error('Invalid amount in cents');
  }
  const rows = parseAllocationPlan(rawPlan).map(bank => {
    const numerator = amountCents * bank.basisPoints;
    return {...bank, cents:Math.floor(numerator / 10000), remainder:numerator % 10000};
  });
  const outstanding = amountCents - rows.reduce((sum, bank) => sum + bank.cents, 0);
  const remainderOrder = [...rows].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i=0; i<outstanding; i++) remainderOrder[i].cents++;
  return rows.map(({name,basisPoints,cents}) => ({name, percentage:basisPoints / 100, cents}));
}

export function parseAmountCents(text) {
  if (typeof text !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Invalid amount');
  const [whole, decimal=''] = text.split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2,'0'));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000000) throw new Error('Invalid amount');
  return cents;
}
