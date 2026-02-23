'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// ============================================================
// PDF CONFIGURATION
// ============================================================
const PDF_CONFIG = {
  margins: { left: 8, right: 8, top: 8, bottom: 15 },
  colors: {
    emerald: [16, 185, 129],
    emeraldDark: [5, 150, 105],
    purple: [139, 92, 246],
    blue: [59, 130, 246],
    gray: [120, 120, 120],
    darkGray: [55, 55, 55],
    lightGray: [160, 160, 160],
    black: [30, 30, 30],
    white: [255, 255, 255],
    altRow: [248, 250, 252],
    headerBg: [15, 118, 110],
    headerText: [255, 255, 255],
    borderColor: [209, 213, 219]
  }
};

// ============================================================
// COLUMN DEFINITIONS  -  order matters
// ============================================================
const ALL_COLUMNS = {
  sr:          { header: 'Sr.',            width: 10, halign: 'center', bodyStyle: { fontStyle: 'bold', textColor: [120,120,120] } },
  transport:   { header: 'Transport Name', width: 60, halign: 'left',   bodyStyle: { fontStyle: 'bold' } },
  gst:         { header: 'GST Number',     width: 40, halign: 'left',   bodyStyle: { fontSize: 6.5, font: 'courier' } },
  mobile:      { header: 'Mobile',         width: 28, halign: 'center', bodyStyle: { fontSize: 7 } },
  destination: { header: 'Destination',    width: 35, halign: 'center', bodyStyle: { fontStyle: 'bold' } },
  pricing:     { header: 'Pricing',        width: 22, halign: 'center', bodyStyle: { fontSize: 7 } },
  rate:        { header: 'Rate',           width: 30, halign: 'right',  bodyStyle: { fontStyle: 'bold', textColor: [5,100,80] } },
  minCharge:   { header: 'Min Charge',     width: 27, halign: 'right',  bodyStyle: { fontSize: 7 } },
  remarks:     { header: 'Remarks',        width: 57, halign: 'left',   bodyStyle: { fontSize: 7, textColor: [160,160,160] } }
};

/** Build active column keys from settings */
const getActiveColumns = (settings) => {
  const active = ['sr'];
  if (settings.showTransportName !== false) active.push('transport');
  if (settings.showGst !== false)           active.push('gst');
  if (settings.showMobile === true)         active.push('mobile');
  active.push('destination', 'pricing', 'rate', 'minCharge');
  if (settings.showRemarks !== false)       active.push('remarks');
  return active;
};

/** Redistribute widths to fill 281 mm */
const getColumnWidths = (activeCols) => {
  const total = 281;
  const base = activeCols.reduce((s, k) => s + ALL_COLUMNS[k].width, 0);
  const scale = total / base;
  return activeCols.map(k => Math.round(ALL_COLUMNS[k].width * scale * 10) / 10);
};

// ============================================================
// HELPER  -  single row object (all fields)
// ============================================================
const buildRowData = (serialNo, transportName, gstNumber, mobileNumber, cityName, cityCode, rate) => {
  let pricingMode = '-';
  let rateDetails = '-';
  let minCharge   = '-';
  let remarks     = '';

  if (rate) {
    if (rate.pricing_mode === 'per_kg') {
      pricingMode = 'PER KG';
      rateDetails = `Rs. ${parseFloat(rate.rate_per_kg || 0).toFixed(2)} /kg`;
    } else if (rate.pricing_mode === 'per_pkg') {
      pricingMode = 'PER PKG';
      rateDetails = `Rs. ${parseFloat(rate.rate_per_pkg || 0).toFixed(2)} /pkg`;
    } else {
      pricingMode = 'HYBRID';
      rateDetails = `Rs. ${parseFloat(rate.rate_per_kg || 0).toFixed(2)}/kg\nRs. ${parseFloat(rate.rate_per_pkg || 0).toFixed(2)}/pkg`;
    }
    minCharge = `Rs. ${parseFloat(rate.min_charge || 0).toLocaleString('en-IN')}`;

    const parts = [];
    if (rate.bilty_chrg  && parseFloat(rate.bilty_chrg)  > 0) parts.push(`B: Rs.${parseFloat(rate.bilty_chrg).toFixed(0)}`);
    if (rate.ewb_chrg    && parseFloat(rate.ewb_chrg)    > 0) parts.push(`E: Rs.${parseFloat(rate.ewb_chrg).toFixed(0)}`);
    if (rate.labour_chrg && parseFloat(rate.labour_chrg) > 0) parts.push(`L: Rs.${parseFloat(rate.labour_chrg).toFixed(0)}`);
    if (rate.other_chrg  && parseFloat(rate.other_chrg)  > 0) parts.push(`O: Rs.${parseFloat(rate.other_chrg).toFixed(0)}`);
    if (parts.length > 0) remarks = parts.join(' | ');
  }

  const destination = cityCode ? `${cityName || '-'} (${cityCode})` : (cityName || '-');

  return {
    sr: String(serialNo),
    transport: (transportName || '-').toUpperCase(),
    gst: gstNumber || '-',
    mobile: mobileNumber || '-',
    destination: destination.toUpperCase(),
    pricing: pricingMode,
    rate: rateDetails,
    minCharge,
    remarks
  };
};

const rowToArray = (obj, cols) => cols.map(k => obj[k]);

// ============================================================
// HELPERS  -  find transport / city
// ============================================================
const findTransport = (transports, id) => {
  if (!id || !transports) return null;
  return transports.find(t => String(t.id) === String(id));
};
const findCity = (cities, id) => {
  if (!id || !cities) return null;
  return cities.find(c => String(c.id) === String(id));
};
const findCityByName = (cities, name) => {
  if (!name || !cities) return null;
  return cities.find(c => c.city_name?.toLowerCase() === name?.toLowerCase());
};

// ============================================================
// DATA BUILDERS
// ============================================================
const buildDataAllTransports = (kaatRates, cities, transports, includeInactive) => {
  const rows = [];  let sn = 1;
  transports?.forEach(tr => {
    const rates = kaatRates?.filter(r => r.transport_id && String(r.transport_id) === String(tr.id)) || [];
    if (rates.length > 0) {
      rates.forEach(rate => {
        if (!includeInactive && !rate.is_active) return;
        const dc = findCity(cities, rate.destination_city_id);
        rows.push(buildRowData(sn++, tr.transport_name, tr.gst_number, tr.mob_number, dc?.city_name, dc?.city_code, rate));
      });
    } else {
      let co = null;
      if (tr.city_id) co = findCity(cities, tr.city_id);
      if (!co && tr.city_name) co = findCityByName(cities, tr.city_name);
      rows.push(buildRowData(sn++, tr.transport_name, tr.gst_number, tr.mob_number, co?.city_name || tr.city_name, co?.city_code || null, null));
    }
  });
  return rows;
};

const buildDataAllCities = (kaatRates, cities, transports, includeInactive) => {
  const rows = [];  let sn = 1;
  cities?.forEach(city => {
    const rates = kaatRates?.filter(r => String(r.destination_city_id) === String(city.id)) || [];
    if (rates.length > 0) {
      rates.forEach(rate => {
        if (!includeInactive && !rate.is_active) return;
        const tr = findTransport(transports, rate.transport_id);
        rows.push(buildRowData(sn++, tr?.transport_name || rate.transport_name, tr?.gst_number || null, tr?.mob_number || null, city.city_name, city.city_code, rate));
      });
    } else {
      const inCity = transports?.filter(t => {
        if (t.city_id && String(t.city_id) === String(city.id)) return true;
        if (t.city_name?.toLowerCase() === city.city_name?.toLowerCase()) return true;
        return false;
      }) || [];
      if (inCity.length > 0) {
        inCity.forEach(tr => rows.push(buildRowData(sn++, tr.transport_name, tr.gst_number, tr.mob_number, city.city_name, city.city_code, null)));
      } else {
        rows.push(buildRowData(sn++, null, null, null, city.city_name, city.city_code, null));
      }
    }
  });
  return rows;
};

const buildFilteredData = (kaatRates, cities, transports, settings) => {
  let filtered = [...(kaatRates || [])];
  if (settings.filterType === 'transport' && settings.selectedTransport) {
    const tid = String(settings.selectedTransport);
    filtered = filtered.filter(r => r.transport_id && String(r.transport_id) === tid);
  }
  if (settings.filterType === 'city' && settings.selectedCity) {
    const cid = String(settings.selectedCity);
    filtered = filtered.filter(r => String(r.destination_city_id) === cid);
  }
  if (!settings.includeInactive) filtered = filtered.filter(r => r.is_active === true);

  filtered.sort((a, b) => {
    if (settings.sortBy === 'transport') return (a.transport_name || '').toLowerCase().localeCompare((b.transport_name || '').toLowerCase());
    if (settings.sortBy === 'city') {
      const ca = findCity(cities, a.destination_city_id);
      const cb = findCity(cities, b.destination_city_id);
      return (ca?.city_name || '').toLowerCase().localeCompare((cb?.city_name || '').toLowerCase());
    }
    if (settings.sortBy === 'rate') return parseFloat(a.rate_per_kg || a.rate_per_pkg || 0) - parseFloat(b.rate_per_kg || b.rate_per_pkg || 0);
    return 0;
  });

  return filtered.map((rate, i) => {
    const tr = findTransport(transports, rate.transport_id);
    const ci = findCity(cities, rate.destination_city_id);
    return buildRowData(i + 1, tr?.transport_name || rate.transport_name, tr?.gst_number, tr?.mob_number || null, ci?.city_name, ci?.city_code, rate);
  });
};

// ============================================================
// PDF HEADER
// ============================================================
const addPDFHeader = (doc, subtitle, filterInfo) => {
  const pw = doc.internal.pageSize.width;
  const cx = pw / 2;
  const { left: mL, right: mR } = PDF_CONFIG.margins;

  doc.setFontSize(20);  doc.setFont('helvetica','bold');  doc.setTextColor(...PDF_CONFIG.colors.black);
  doc.text('SS TRANSPORT CORPORATION', cx, 16, { align: 'center' });

  doc.setFontSize(13);  doc.setFont('helvetica','bold');  doc.setTextColor(...PDF_CONFIG.colors.headerBg);
  doc.text(subtitle || 'KAAT RATE LIST', cx, 24, { align: 'center' });

  doc.setFontSize(8);  doc.setFont('helvetica','normal');  doc.setTextColor(...PDF_CONFIG.colors.lightGray);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pw - mR, 30, { align: 'right' });

  if (filterInfo) {
    doc.setFontSize(8);  doc.setFont('helvetica','bold');  doc.setTextColor(...PDF_CONFIG.colors.purple);
    doc.text(filterInfo, mL, 30);
  }

  doc.setDrawColor(...PDF_CONFIG.colors.headerBg);  doc.setLineWidth(0.8);
  doc.line(mL, 33, pw - mR, 33);
  doc.setDrawColor(...PDF_CONFIG.colors.emerald);  doc.setLineWidth(0.3);
  doc.line(mL, 34, pw - mR, 34);
};

// ============================================================
// PDF FOOTER
// ============================================================
const addPDFFooter = (doc, totalEntries) => {
  const pc = doc.internal.getNumberOfPages();
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;
  const { left: mL, right: mR } = PDF_CONFIG.margins;

  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);
    const fy = ph - 8;
    doc.setDrawColor(...PDF_CONFIG.colors.borderColor);  doc.setLineWidth(0.2);
    doc.line(mL, fy - 3, pw - mR, fy - 3);

    doc.setFontSize(7);  doc.setFont('helvetica','normal');  doc.setTextColor(...PDF_CONFIG.colors.lightGray);
    doc.text(`Page ${i} of ${pc}`, mL, fy);

    doc.setFontSize(7);  doc.setFont('helvetica','bold');  doc.setTextColor(...PDF_CONFIG.colors.gray);
    doc.text('Generated by MoveSure', pw / 2, fy, { align: 'center' });

    if (totalEntries) {
      doc.setFontSize(7);  doc.setFont('helvetica','normal');  doc.setTextColor(...PDF_CONFIG.colors.lightGray);
      doc.text(`Total: ${totalEntries} entries`, pw - mR, fy, { align: 'right' });
    }
  }
};

// ============================================================
// MAIN  -  Generate Kaat Rates PDF
// ============================================================
export const generateKaatRatesPDF = (kaatRates, cities, transports, settings, previewMode = false) => {
  try {
    console.log('PDF GENERATION STARTED');
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const { left: mL, right: mR } = PDF_CONFIG.margins;

    // Active columns
    const activeCols = getActiveColumns(settings);
    const colWidths  = getColumnWidths(activeCols);

    // Filter info
    let filterInfo = null;
    if (settings.filterType === 'transport' && settings.selectedTransport) {
      const t = findTransport(transports, settings.selectedTransport);
      filterInfo = `Transport: ${t?.transport_name || 'Unknown'}`;
    } else if (settings.filterType === 'city' && settings.selectedCity) {
      const c = findCity(cities, settings.selectedCity);
      filterInfo = `Destination: ${c?.city_name || 'Unknown'}`;
    } else if (settings.includeAllTransports) {
      filterInfo = 'All Transports (with & without rates)';
    } else if (settings.includeAllCities) {
      filterInfo = 'All Cities (with & without rates)';
    }

    addPDFHeader(doc, settings.subtitle, filterInfo);

    // Build data
    let rowObjects = [];
    if (settings.includeAllTransports)    rowObjects = buildDataAllTransports(kaatRates, cities, transports, settings.includeInactive);
    else if (settings.includeAllCities)   rowObjects = buildDataAllCities(kaatRates, cities, transports, settings.includeInactive);
    else                                  rowObjects = buildFilteredData(kaatRates, cities, transports, settings);

    const tableData = rowObjects.map(r => rowToArray(r, activeCols));
    console.log('Table rows:', tableData.length, '| Cols:', activeCols.length);

    // Head row
    const headRow = activeCols.map(k => ({ content: ALL_COLUMNS[k].header, styles: { halign: ALL_COLUMNS[k].halign } }));

    // Column styles
    const columnStyles = {};
    activeCols.forEach((k, i) => { columnStyles[i] = { cellWidth: colWidths[i], halign: ALL_COLUMNS[k].halign, ...(ALL_COLUMNS[k].bodyStyle || {}) }; });

    const pricingIdx = activeCols.indexOf('pricing');
    const rateIdx    = activeCols.indexOf('rate');

    autoTable(doc, {
      startY: 37,
      margin: { left: mL, right: mR, top: 37, bottom: PDF_CONFIG.margins.bottom },
      tableWidth: 'auto',
      head: [headRow],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_CONFIG.colors.headerBg, textColor: PDF_CONFIG.colors.white,
        fontStyle: 'bold', fontSize: 8.5,
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
        lineWidth: 0.2, lineColor: [255,255,255], minCellHeight: 10
      },
      bodyStyles: {
        fontSize: 7.5, textColor: PDF_CONFIG.colors.darkGray,
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        lineWidth: 0.15, lineColor: PDF_CONFIG.colors.borderColor,
        minCellHeight: 8, valign: 'middle'
      },
      columnStyles,
      alternateRowStyles: { fillColor: PDF_CONFIG.colors.altRow },

      didParseCell(data) {
        if (data.section === 'body' && pricingIdx >= 0 && data.column.index === pricingIdx) {
          const v = data.cell.raw;
          if (v === 'PER KG')  { data.cell.styles.textColor = [5,150,105]; data.cell.styles.fontStyle = 'bold'; }
          if (v === 'PER PKG') { data.cell.styles.textColor = [139,92,246]; data.cell.styles.fontStyle = 'bold'; }
          if (v === 'HYBRID')  { data.cell.styles.textColor = [59,130,246]; data.cell.styles.fontStyle = 'bold'; }
        }
        if (data.section === 'body' && rateIdx >= 0 && data.column.index === rateIdx) {
          if (data.cell.raw === '-') data.cell.styles.textColor = [200,200,200];
        }
      },

      didDrawPage(data) {
        if (data.pageNumber > 1) addPDFHeader(doc, settings.subtitle, filterInfo);
      }
    });

    // Summary
    const finalY = doc.lastAutoTable.finalY || 100;
    const ph = doc.internal.pageSize.height;
    if (finalY + 12 < ph - PDF_CONFIG.margins.bottom) {
      doc.setDrawColor(...PDF_CONFIG.colors.headerBg);  doc.setLineWidth(0.4);
      doc.line(mL, finalY + 3, mL + 60, finalY + 3);
      doc.setFontSize(8);  doc.setFont('helvetica','bold');  doc.setTextColor(...PDF_CONFIG.colors.darkGray);
      doc.text(`Total Entries: ${tableData.length}`, mL, finalY + 8);
      doc.setFont('helvetica','normal');  doc.setTextColor(...PDF_CONFIG.colors.gray);
      doc.text(`|  Generated on ${format(new Date(), 'dd MMM yyyy')}`, mL + 32, finalY + 8);
    }

    addPDFFooter(doc, tableData.length);
    console.log('PDF GENERATED SUCCESSFULLY');

    if (previewMode) {
      return doc.output('bloburl');
    } else {
      let fn = 'kaat-rates';
      if (settings.filterType === 'transport' && settings.selectedTransport) {
        const t = findTransport(transports, settings.selectedTransport);
        fn = `kaat-${(t?.transport_name || 'transport').toLowerCase().replace(/\s+/g, '-')}`;
      } else if (settings.filterType === 'city' && settings.selectedCity) {
        const c = findCity(cities, settings.selectedCity);
        fn = `kaat-${(c?.city_name || 'city').toLowerCase().replace(/\s+/g, '-')}`;
      }
      fn += `-${format(new Date(), 'dd-MMM-yyyy')}.pdf`;
      doc.save(fn);
      return null;
    }
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};
