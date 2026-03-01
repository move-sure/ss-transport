/* Shared utility functions for Hub Management */

export const kTotal = (k) =>
  !k ? 0 : ['kaat','pf','dd_chrg','bilty_chrg','ewb_chrg','labour_chrg','other_chrg']
    .reduce((s, f) => s + (parseFloat(k[f]) || 0), 0);

export const getStatus = (t) => {
  if (t.is_delivered_at_destination) return { l: 'Delivered', c: 'green' };
  if (t.out_for_door_delivery) return { l: 'Door Dlvry', c: 'blue' };
  if (t.is_out_of_delivery_from_branch2) return { l: 'Out B2', c: 'cyan' };
  if (t.is_delivered_at_branch2) return { l: 'At B2', c: 'purple' };
  if (t.is_out_of_delivery_from_branch1) return { l: 'Transit', c: 'amber' };
  return { l: 'Pending', c: 'gray' };
};

export const stClr = {
  green: 'bg-green-100 text-green-700 border-green-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const payBadge = (p) => {
  const pm = (p || '').toLowerCase();
  if (pm === 'paid') return 'bg-green-100 text-green-700';
  if (pm.includes('to') && pm.includes('pay')) return 'bg-red-100 text-red-700';
  if (pm === 'foc') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
};

export const getHubRateForTransport = (hubRatesByTransport, transportId, cityId) => {
  if (!transportId || !cityId) return null;
  const rates = hubRatesByTransport[transportId]?.[cityId];
  return rates?.[0] || null;
};
