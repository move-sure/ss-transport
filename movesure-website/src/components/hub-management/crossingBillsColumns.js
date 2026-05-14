import { fmtN } from './transportReportUtils';

const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '';

export const ALL_COLS = [
  {
    id: 'gr_no',
    label: 'GR No',
    required: true,
    defaultOn: true,
    baseWidth: 22,
    halign: 'left',
    fontStyle: 'bold',
    fontSize: 9,
    getPdfValue: (b) => b.gr_no || '',
  },
  {
    id: 'pohonch_no',
    label: 'Pohonch No',
    required: true,
    defaultOn: true,
    baseWidth: 42,
    halign: 'left',
    fontStyle: 'bold',
    fontSize: 8,
    getPdfValue: (b) => b.dest_pohonch_no || b.bilty_number || 'Not Provided Yet',
  },
  {
    id: 'bilty_date',
    label: 'Bilty Date',
    required: false,
    defaultOn: true,
    baseWidth: 22,
    halign: 'left',
    fontSize: 7.5,
    getPdfValue: (b) => fmtDate(b.bilty_date),
  },
  {
    id: 'station',
    label: 'Station',
    required: false,
    defaultOn: true,
    baseWidth: 25,
    halign: 'left',
    fontSize: 7.5,
    getPdfValue: (b) => b.destination || b.to_city || '',
  },
  {
    id: 'consignor',
    label: 'Consignor',
    required: false,
    defaultOn: false,
    baseWidth: 30,
    halign: 'left',
    fontSize: 7,
    getPdfValue: (b) => b.consignor_name || '',
  },
  {
    id: 'consignee',
    label: 'Consignee',
    required: false,
    defaultOn: false,
    baseWidth: 30,
    halign: 'left',
    fontSize: 7,
    getPdfValue: (b) => b.consignee_name || '',
  },
  {
    id: 'pkgs',
    label: 'Pkgs',
    required: false,
    defaultOn: true,
    baseWidth: 13,
    halign: 'center',
    fontStyle: 'bold',
    fontSize: 8,
    getPdfValue: (b) => b.no_of_pkg != null ? String(b.no_of_pkg) : '',
  },
  {
    id: 'wt',
    label: 'Wt',
    required: false,
    defaultOn: true,
    baseWidth: 18,
    halign: 'right',
    fontStyle: 'bold',
    fontSize: 8,
    getPdfValue: (b) => b.wt != null ? String(b.wt) : '',
  },
  {
    id: 'dd',
    label: 'DD',
    required: false,
    defaultOn: true,
    baseWidth: 18,
    halign: 'right',
    fontStyle: 'bold',
    fontSize: 8,
    getPdfValue: (b) => {
      const dd = Number(b.kaat_dd) || 0;
      return dd !== 0 ? fmtN(dd) : '';
    },
  },
  {
    id: 'rate',
    label: 'Rate',
    required: false,
    defaultOn: false,
    baseWidth: 15,
    halign: 'right',
    fontSize: 7.5,
    getPdfValue: (b) => b.kaat_rate != null ? String(b.kaat_rate) : '',
  },
  {
    id: 'total',
    label: 'Total',
    required: false,
    defaultOn: false,
    baseWidth: 22,
    halign: 'right',
    fontStyle: 'bold',
    fontSize: 8,
    getPdfValue: (b) => {
      const isPaid = b.payment_mode === 'paid' || b.payment_mode === 'foc';
      return isPaid ? 'PAID' : (b.total != null ? fmtN(Number(b.total)) : '');
    },
  },
  {
    id: 'to_pay_pf',
    label: 'To-Pay (PF)',
    required: false,
    defaultOn: true,
    baseWidth: 60,
    halign: 'right',
    fontStyle: 'bold',
    fontSize: 9,
    getPdfValue: (b) => {
      const isPaid = b.payment_mode === 'paid' || b.payment_mode === 'foc';
      return !isPaid ? fmtN(Number(b.kaat_pf) || 0) : '';
    },
  },
  {
    id: 'paid_kaat',
    label: 'Paid (KAAT)',
    required: false,
    defaultOn: true,
    baseWidth: 60,
    halign: 'right',
    fontStyle: 'bold',
    fontSize: 9,
    getPdfValue: (b) => {
      const isPaid = b.payment_mode === 'paid' || b.payment_mode === 'foc';
      const dd = Number(b.kaat_dd) || 0;
      const kaat = Number(b.kaat) || 0;
      return isPaid ? fmtN(dd + kaat) : '';
    },
  },
];

export const DEFAULT_SELECTED_COLS = ALL_COLS.filter(c => c.defaultOn).map(c => c.id);

export const computeColStyles = (activeCols) => {
  const totalWeight = activeCols.reduce((s, c) => s + c.baseWidth, 0);
  const availWidth = 291;
  const styles = {};
  activeCols.forEach((col, i) => {
    styles[i] = {
      cellWidth: availWidth * col.baseWidth / totalWeight,
      halign: col.halign,
      ...(col.fontStyle && { fontStyle: col.fontStyle }),
      fontSize: col.fontSize || 8,
      textColor: [0, 0, 0],
    };
  });
  return styles;
};
