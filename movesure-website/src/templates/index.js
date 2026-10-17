// Bilty print template registry.
// The template is chosen per series: bill_books.print_template must match a key here
// (the file name without .js). The header comes from permanent_details (branch + company).
//
// Adding a layout:
//   1. Create templates/template3.js (same input as template1, returns a jsPDF) and register it below.
//   2. INSERT INTO public.print_templates (code, name, sort_order) VALUES ('template3', 'Template 3', 3);

import template1 from './template1';
import template2 from './template2';

export const TEMPLATES = { template1, template2 };
export const DEFAULT_TEMPLATE = 'template1';

// Per-template assets, loaded by print-data.loadTemplateAssets() and passed to the template.
//   logo         - image in /public drawn in the header
//   logoGrayscale - convert the logo to grey tones (black & white layouts)
//   qrLight      - QR code background colour (template1 matches its lemon sheet)
export const TEMPLATE_ASSETS = {
  template1: { qrLight: '#fafad2' },
  template2: { qrLight: '#ffffff', logo: '/ss-movesecure-logo-transparent.png', logoGrayscale: true }
};

// Unknown / missing code -> Classic layout
export function getTemplate(code) {
  return TEMPLATES[code] || TEMPLATES[DEFAULT_TEMPLATE];
}

export function getTemplateAssetConfig(code) {
  return TEMPLATE_ASSETS[TEMPLATES[code] ? code : DEFAULT_TEMPLATE] || {};
}

// Pick the permanent_details header for a bilty: the branch's row for that company,
// else the branch default row (company_id null).
export function pickHeader(rows = [], branchId, companyId) {
  const branchRows = rows.filter(r => r.branch_id === branchId);
  return (companyId && branchRows.find(r => r.company_id === companyId))
    || branchRows.find(r => !r.company_id)
    || null;
}
