// Shared data helpers for the Bilty Crossing Bill transport-wise pages.
import { MONTHS } from './billPdf';

export const API = 'https://api.movesure.io';
export const Rs = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
export const periodLabel = (b) => `${MONTHS[(b.bill_month || 1) - 1]} ${b.bill_year || ''}`;
export const periodKey = (b) => (Number(b.bill_year) || 0) * 100 + (Number(b.bill_month) || 0);

// One transporter = its GSTIN, or its name when it has no GSTIN
export const transportKey = (b) => (b.transport_gstin ? b.transport_gstin.toUpperCase() : `NAME:${(b.transport_name || '').toUpperCase()}`);

// Every active bill (100 per page). `extra` adds filters such as { transport_gstin }.
export async function fetchAllBills(headers, extra = {}) {
  const rows = [];
  for (let page = 1; page <= 50; page++) {
    const params = new URLSearchParams({ is_active: 'true', page: String(page), page_size: '100', ...extra });
    const res = await fetch(`${API}/api/bilty-crossing-bill?${params}`, { headers });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j.status === 'error') throw new Error(j.message || `Failed to load bills (${res.status})`);
    rows.push(...(j.data?.rows || []));
    if (!j.data?.has_more) break;
  }
  return rows;
}

const sumOf = (bills, k) => bills.reduce((t, b) => t + (Number(b[k]) || 0), 0);

// net payable = total pf - total paid kaat (computed by the API; recomputed here if missing)
export const netOf = (b) => (b.net_payable != null ? Number(b.net_payable) : (Number(b.total_pf) || 0) - (Number(b.total_paid_kaat) || 0));

export function totalsOf(bills) {
  return {
    bills: bills.length,
    bilties: sumOf(bills, 'total_bilties'),
    kaat: sumOf(bills, 'total_kaat'),
    pf: sumOf(bills, 'total_pf'),
    paidKaat: sumOf(bills, 'total_paid_kaat'),
    amount: sumOf(bills, 'total_amount'),
    net: bills.reduce((t, b) => t + netOf(b), 0)
  };
}

export function groupByTransport(bills) {
  const map = new Map();
  bills.forEach((b) => {
    const key = transportKey(b);
    if (!map.has(key)) map.set(key, { key, transport_name: b.transport_name, transport_gstin: b.transport_gstin || null, bills: [] });
    map.get(key).bills.push(b);
  });
  return [...map.values()].map((g) => {
    g.bills.sort((a, b) => periodKey(a) - periodKey(b) || String(a.bill_no).localeCompare(String(b.bill_no)));
    const last = g.bills[g.bills.length - 1];
    return { ...g, totals: totalsOf(g.bills), lastPeriod: last ? periodLabel(last) : '' };
  });
}
