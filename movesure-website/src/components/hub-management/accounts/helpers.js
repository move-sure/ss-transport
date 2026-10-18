// Local-date string (YYYY-MM-DD) — never round-trip through toISOString(),
// which shifts to UTC and can land on the wrong day for evening IST users.
export function todayLocalDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatINR(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function isOverdue(dueDate, isSettled) {
  if (!dueDate || isSettled) return false;
  return dueDate < todayLocalDate();
}

// Accounting Dr/Cr labels (the API sends/receives 'dr'/'cr').
// FLOW_LABEL = column / entry side, OWES_* = which side a balance is on.
export const FLOW_LABEL = { dr: 'Debit (Dr)', cr: 'Credit (Cr)' };
export const OWES_LABEL = { dr: 'Dr', cr: 'Cr' };
export const OWES_SHORT = { dr: 'Dr', cr: 'Cr' };

export const NATURE_BADGE = {
  asset: 'bg-blue-50 text-blue-700 border-blue-200',
  liability: 'bg-rose-50 text-rose-700 border-rose-200',
  income: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expense: 'bg-amber-50 text-amber-700 border-amber-200',
  equity: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function flattenGroups(tree, depth = 0, out = []) {
  for (const node of tree || []) {
    out.push({ ...node, depth });
    if (node.children?.length) flattenGroups(node.children, depth + 1, out);
  }
  return out;
}
