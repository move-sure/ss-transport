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
  },
  // Landscape A4 = 297 x 210 mm
  // Table width = 297 - 8 - 8 = 281mm
  columns: {
    sr:          10,
    transport:   60,
    gst:         40,
    destination: 35,
    pricing:     22,
    rate:        30,
    minCharge:   27,
    remarks:     57
  }
};

// ============================================================
// HELPER: Build a single table row
// ============================================================
const buildTableRow = (serialNo, transportName, gstNumber, cityName, cityCode, rate) => {
  let pricingMode = '-';
  let rateDetails = '-';
  let minCharge = '-';
  let remarks = '';

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

    // Build remarks from per-bilty charges
    const chrgParts = [];
    if (rate.bilty_chrg && parseFloat(rate.bilty_chrg) > 0) chrgParts.push(`Bilty: Rs.${parseFloat(rate.bilty_chrg).toFixed(0)}`);
    if (rate.ewb_chrg && parseFloat(rate.ewb_chrg) > 0) chrgParts.push(`EWB: Rs.${parseFloat(rate.ewb_chrg).toFixed(0)}`);
    if (rate.labour_chrg && parseFloat(rate.labour_chrg) > 0) chrgParts.push(`Labour: Rs.${parseFloat(rate.labour_chrg).toFixed(0)}`);
    if (rate.other_chrg && parseFloat(rate.other_chrg) > 0) chrgParts.push(`Other: Rs.${parseFloat(rate.other_chrg).toFixed(0)}`);
    if (chrgParts.length > 0) remarks = chrgParts.join(' | ');
  }

  const destination = cityCode
    ? `${cityName || '-'} (${cityCode})`
    : (cityName || '-');

  return [
    String(serialNo),
    (transportName || '-').toUpperCase(),
    gstNumber || '-',
    destination.toUpperCase(),
    pricingMode,
    rateDetails,
    minCharge,
    remarks
  ];
};

// ============================================================
// HELPERS: Find transport / city
// ============================================================
const findTransport = (transports, transportId) => {
  if (!transportId || !transports) return null;
  return transports.find(t => String(t.id) === String(transportId));
};

const findCity = (cities, cityId) => {
  if (!cityId || !cities) return null;
  return cities.find(c => String(c.id) === String(cityId));
};

const findCityByName = (cities, cityName) => {
  if (!cityName || !cities) return null;
  return cities.find(c => c.city_name?.toLowerCase() === cityName?.toLowerCase());
};

// ============================================================
// DATA BUILDER: Include All Transports mode
// ============================================================
const buildDataForAllTransports = (kaatRates, cities, transports, includeInactive) => {
  const tableData = [];
  let serialNo = 1;

  transports?.forEach((transport) => {
    const transportRates = kaatRates?.filter(r =>
      r.transport_id && String(r.transport_id) === String(transport.id)
    ) || [];

    if (transportRates.length > 0) {
      transportRates.forEach(rate => {
        if (!includeInactive && !rate.is_active) return;
        const destCity = findCity(cities, rate.destination_city_id);
        tableData.push(buildTableRow(
          serialNo++, transport.transport_name, transport.gst_number,
          destCity?.city_name, destCity?.city_code, rate
        ));
      });
    } else {
      let transportCityObj = null;
      if (transport.city_id) transportCityObj = findCity(cities, transport.city_id);
      if (!transportCityObj && transport.city_name) transportCityObj = findCityByName(cities, transport.city_name);
      tableData.push(buildTableRow(
        serialNo++, transport.transport_name, transport.gst_number,
        transportCityObj?.city_name || transport.city_name, transportCityObj?.city_code || null, null
      ));
    }
  });

  return tableData;
};

// ============================================================
// DATA BUILDER: Include All Cities mode
// ============================================================
const buildDataForAllCities = (kaatRates, cities, transports, includeInactive) => {
  const tableData = [];
  let serialNo = 1;

  cities?.forEach((city) => {
    const cityRates = kaatRates?.filter(r =>
      String(r.destination_city_id) === String(city.id)
    ) || [];

    if (cityRates.length > 0) {
      cityRates.forEach(rate => {
        if (!includeInactive && !rate.is_active) return;
        const transport = findTransport(transports, rate.transport_id);
        tableData.push(buildTableRow(
          serialNo++, transport?.transport_name || rate.transport_name,
          transport?.gst_number || null, city.city_name, city.city_code, rate
        ));
      });
    } else {
      const transportsInCity = transports?.filter(t => {
        if (t.city_id && String(t.city_id) === String(city.id)) return true;
        if (t.city_name?.toLowerCase() === city.city_name?.toLowerCase()) return true;
        return false;
      }) || [];

      if (transportsInCity.length > 0) {
        transportsInCity.forEach(transport => {
          tableData.push(buildTableRow(
            serialNo++, transport.transport_name, transport.gst_number,
            city.city_name, city.city_code, null
          ));
        });
      } else {
        tableData.push(buildTableRow(serialNo++, null, null, city.city_name, city.city_code, null));
      }
    }
  });

  return tableData;
};

// ============================================================
// DATA BUILDER: Standard filtered mode
// ============================================================
const buildDataForFilteredRates = (kaatRates, cities, transports, settings) => {
  const tableData = [];
  let filteredRates = [...(kaatRates || [])];

  if (settings.filterType === 'transport' && settings.selectedTransport) {
    const transportId = String(settings.selectedTransport);
    filteredRates = filteredRates.filter(r => r.transport_id && String(r.transport_id) === transportId);
  }

  if (settings.filterType === 'city' && settings.selectedCity) {
    const cityId = String(settings.selectedCity);
    filteredRates = filteredRates.filter(r => String(r.destination_city_id) === cityId);
  }

  if (!settings.includeInactive) {
    filteredRates = filteredRates.filter(r => r.is_active === true);
  }

  filteredRates.sort((a, b) => {
    if (settings.sortBy === 'transport') {
      return (a.transport_name || '').toLowerCase().localeCompare((b.transport_name || '').toLowerCase());
    } else if (settings.sortBy === 'city') {
      const cityA = findCity(cities, a.destination_city_id);
      const cityB = findCity(cities, b.destination_city_id);
      return (cityA?.city_name || '').toLowerCase().localeCompare((cityB?.city_name || '').toLowerCase());
    } else if (settings.sortBy === 'rate') {
      return parseFloat(a.rate_per_kg || a.rate_per_pkg || 0) - parseFloat(b.rate_per_kg || b.rate_per_pkg || 0);
    }
    return 0;
  });

  filteredRates.forEach((rate, index) => {
    const transport = findTransport(transports, rate.transport_id);
    const city = findCity(cities, rate.destination_city_id);
    tableData.push(buildTableRow(
      index + 1, transport?.transport_name || rate.transport_name,
      transport?.gst_number, city?.city_name, city?.city_code, rate
    ));
  });

  return tableData;
};

// ============================================================
// PDF BUILDER: Add header
// ============================================================
const addPDFHeader = (doc, subtitle, filterInfo) => {
  const pageWidth = doc.internal.pageSize.width;
  const centerX = pageWidth / 2;
  const { left: mL, right: mR } = PDF_CONFIG.margins;

  // Company name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_CONFIG.colors.black);
  doc.text('SS TRANSPORT CORPORATION', centerX, 16, { align: 'center' });

  // Subtitle
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_CONFIG.colors.headerBg);
  doc.text(subtitle || 'KAAT RATE LIST', centerX, 24, { align: 'center' });

  // Date - right aligned
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_CONFIG.colors.lightGray);
  doc.text(
    `Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`,
    pageWidth - mR, 30, { align: 'right' }
  );

  // Filter info - left aligned
  if (filterInfo) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_CONFIG.colors.purple);
    doc.text(filterInfo, mL, 30);
  }

  // Separator line
  doc.setDrawColor(...PDF_CONFIG.colors.headerBg);
  doc.setLineWidth(0.8);
  doc.line(mL, 33, pageWidth - mR, 33);

  // Thin accent line
  doc.setDrawColor(...PDF_CONFIG.colors.emerald);
  doc.setLineWidth(0.3);
  doc.line(mL, 34, pageWidth - mR, 34);
};

// ============================================================
// PDF BUILDER: Add footer to all pages
// ============================================================
const addPDFFooter = (doc, totalEntries) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const { left: mL, right: mR } = PDF_CONFIG.margins;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 8;

    // Thin line above footer
    doc.setDrawColor(...PDF_CONFIG.colors.borderColor);
    doc.setLineWidth(0.2);
    doc.line(mL, footerY - 3, pageWidth - mR, footerY - 3);

    // Left: page number
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_CONFIG.colors.lightGray);
    doc.text(`Page ${i} of ${pageCount}`, mL, footerY);

    // Center: brand
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_CONFIG.colors.gray);
    doc.text('Generated by MoveSure', pageWidth / 2, footerY, { align: 'center' });

    // Right: total entries
    if (totalEntries) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_CONFIG.colors.lightGray);
      doc.text(`Total: ${totalEntries} entries`, pageWidth - mR, footerY, { align: 'right' });
    }
  }
};

// ============================================================
// MAIN: Generate Kaat Rates PDF
// ============================================================
export const generateKaatRatesPDF = (kaatRates, cities, transports, settings, previewMode = false) => {
  try {
    console.log('PDF GENERATION STARTED');

    // Landscape A4
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const { left: mL, right: mR } = PDF_CONFIG.margins;
    const cols = PDF_CONFIG.columns;

    // Build filter info text
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

    // Header
    addPDFHeader(doc, settings.subtitle, filterInfo);

    // Build table data
    let tableData = [];
    if (settings.includeAllTransports) {
      tableData = buildDataForAllTransports(kaatRates, cities, transports, settings.includeInactive);
    } else if (settings.includeAllCities) {
      tableData = buildDataForAllCities(kaatRates, cities, transports, settings.includeInactive);
    } else {
      tableData = buildDataForFilteredRates(kaatRates, cities, transports, settings);
    }

    console.log('Table rows:', tableData.length);

    // Table
    const startY = 37;

    autoTable(doc, {
      startY,
      margin: { left: mL, right: mR, top: 37, bottom: PDF_CONFIG.margins.bottom },
      tableWidth: 'auto',

      head: [[
        { content: 'Sr.', styles: { halign: 'center' } },
        { content: 'Transport Name', styles: { halign: 'left' } },
        { content: 'GST Number', styles: { halign: 'left' } },
        { content: 'Destination', styles: { halign: 'center' } },
        { content: 'Pricing', styles: { halign: 'center' } },
        { content: 'Rate', styles: { halign: 'right' } },
        { content: 'Min Charge', styles: { halign: 'right' } },
        { content: 'Remarks', styles: { halign: 'center' } }
      ]],
      body: tableData,

      theme: 'grid',

      headStyles: {
        fillColor: PDF_CONFIG.colors.headerBg,
        textColor: PDF_CONFIG.colors.white,
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
        lineWidth: 0.2,
        lineColor: [255, 255, 255],
        minCellHeight: 10
      },

      bodyStyles: {
        fontSize: 7.5,
        textColor: PDF_CONFIG.colors.darkGray,
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        lineWidth: 0.15,
        lineColor: PDF_CONFIG.colors.borderColor,
        minCellHeight: 8,
        valign: 'middle'
      },

      columnStyles: {
        0: { cellWidth: cols.sr, halign: 'center', fontStyle: 'bold', textColor: PDF_CONFIG.colors.gray },
        1: { cellWidth: cols.transport, fontStyle: 'bold' },
        2: { cellWidth: cols.gst, fontSize: 6.5, font: 'courier' },
        3: { cellWidth: cols.destination, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: cols.pricing, halign: 'center', fontSize: 7 },
        5: { cellWidth: cols.rate, halign: 'right', fontStyle: 'bold', textColor: [5, 100, 80] },
        6: { cellWidth: cols.minCharge, halign: 'right', fontSize: 7 },
        7: { cellWidth: cols.remarks, halign: 'left', fontSize: 7, textColor: PDF_CONFIG.colors.lightGray }
      },

      alternateRowStyles: {
        fillColor: PDF_CONFIG.colors.altRow
      },

      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
          const val = data.cell.raw;
          if (val === 'PER KG') {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'PER PKG') {
            data.cell.styles.textColor = [139, 92, 246];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'HYBRID') {
            data.cell.styles.textColor = [59, 130, 246];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === '-') {
            data.cell.styles.textColor = [200, 200, 200];
          }
        }
      },

      didDrawPage: function(data) {
        if (data.pageNumber > 1) {
          addPDFHeader(doc, settings.subtitle, filterInfo);
        }
      }
    });

    // Summary below table
    const finalY = doc.lastAutoTable.finalY || 100;
    const pageHeight = doc.internal.pageSize.height;

    if (finalY + 12 < pageHeight - PDF_CONFIG.margins.bottom) {
      doc.setDrawColor(...PDF_CONFIG.colors.headerBg);
      doc.setLineWidth(0.4);
      doc.line(mL, finalY + 3, mL + 60, finalY + 3);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_CONFIG.colors.darkGray);
      doc.text(`Total Entries: ${tableData.length}`, mL, finalY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_CONFIG.colors.gray);
      doc.text(`|  Generated on ${format(new Date(), 'dd MMM yyyy')}`, mL + 32, finalY + 8);
    }

    // Footer
    addPDFFooter(doc, tableData.length);

    console.log('PDF GENERATED SUCCESSFULLY');

    if (previewMode) {
      return doc.output('bloburl');
    } else {
      let filename = 'kaat-rates';
      if (settings.filterType === 'transport' && settings.selectedTransport) {
        const t = findTransport(transports, settings.selectedTransport);
        filename = `kaat-${(t?.transport_name || 'transport').toLowerCase().replace(/\s+/g, '-')}`;
      } else if (settings.filterType === 'city' && settings.selectedCity) {
        const c = findCity(cities, settings.selectedCity);
        filename = `kaat-${(c?.city_name || 'city').toLowerCase().replace(/\s+/g, '-')}`;
      }
      filename += `-${format(new Date(), 'dd-MMM-yyyy')}.pdf`;
      doc.save(filename);
      return null;
    }

  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};
