'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// ============================================================
// PDF CONFIGURATION
// ============================================================
const PDF_CONFIG = {
  margins: { left: 10, right: 10 },
  colors: {
    emerald: [16, 185, 129],
    purple: [139, 92, 246],
    blue: [59, 130, 246],
    gray: [100, 100, 100],
    darkGray: [60, 60, 60],
    black: [0, 0, 0],
    white: [255, 255, 255],
    altRow: [245, 247, 250]
  }
};

// ============================================================
// HELPER: Build a single table row
// ============================================================
const buildTableRow = (serialNo, transportName, gstNumber, cityName, cityCode, rate) => {
  // Pricing mode
  let pricingMode = '-';
  let rateDetails = '-';
  let minCharge = '-';
  
  if (rate) {
    // Pricing mode
    if (rate.pricing_mode === 'per_kg') {
      pricingMode = 'PER KG';
      rateDetails = `Rs.${parseFloat(rate.rate_per_kg || 0).toFixed(2)}/kg`;
    } else if (rate.pricing_mode === 'per_pkg') {
      pricingMode = 'PER PKG';
      rateDetails = `Rs.${parseFloat(rate.rate_per_pkg || 0).toFixed(2)}/pkg`;
    } else {
      pricingMode = 'HYBRID';
      rateDetails = `KG: Rs.${parseFloat(rate.rate_per_kg || 0).toFixed(2)}\nPKG: Rs.${parseFloat(rate.rate_per_pkg || 0).toFixed(2)}`;
    }
    minCharge = `Rs.${parseFloat(rate.min_charge || 0).toFixed(0)}`;
  }
  
  return [
    serialNo,
    transportName || '-',
    gstNumber || '-',
    `${cityName || '-'}\n(${cityCode || '-'})`,
    pricingMode,
    rateDetails,
    minCharge,
    '' // Remarks - empty for manual notes
  ];
};

// ============================================================
// HELPER: Find transport by ID from transports array
// ============================================================
const findTransport = (transports, transportId) => {
  if (!transportId || !transports) return null;
  return transports.find(t => String(t.id) === String(transportId));
};

// ============================================================
// HELPER: Find city by ID from cities array
// ============================================================
const findCity = (cities, cityId) => {
  if (!cityId || !cities) return null;
  return cities.find(c => String(c.id) === String(cityId));
};

// ============================================================
// HELPER: Find city by name from cities array
// ============================================================
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
  
  console.log('📦 Building data for ALL TRANSPORTS mode');
  console.log('📦 Transports count:', transports?.length || 0);
  
  transports?.forEach((transport) => {
    // Find all rates for this transport
    const transportRates = kaatRates?.filter(r => 
      r.transport_id && String(r.transport_id) === String(transport.id)
    ) || [];
    
    console.log(`📦 Transport: ${transport.transport_name}, Rates: ${transportRates.length}`);
    
    if (transportRates.length > 0) {
      // Transport has kaat rates - add each rate as a row
      transportRates.forEach(rate => {
        // Skip inactive if not included
        if (!includeInactive && !rate.is_active) return;
        
        // Find destination city for this rate
        const destCity = findCity(cities, rate.destination_city_id);
        
        tableData.push(buildTableRow(
          serialNo++,
          transport.transport_name,
          transport.gst_number,
          destCity?.city_name,
          destCity?.city_code,
          rate
        ));
      });
    } else {
      // Transport has NO kaat rates - show transport with its own city
      // The transport's city_name is where the transport is based
      let transportCityObj = null;
      
      // Try to find city by city_id first
      if (transport.city_id) {
        transportCityObj = findCity(cities, transport.city_id);
      }
      
      // If not found, try by city_name
      if (!transportCityObj && transport.city_name) {
        transportCityObj = findCityByName(cities, transport.city_name);
      }
      
      // Build the row - use city object if found, else use transport's city_name directly
      const cityName = transportCityObj?.city_name || transport.city_name;
      const cityCode = transportCityObj?.city_code || null;
      
      console.log(`📦 No rates for ${transport.transport_name}, showing city: ${cityName}`);
      
      tableData.push(buildTableRow(
        serialNo++,
        transport.transport_name,
        transport.gst_number,
        cityName,
        cityCode,
        null // No rate
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
  
  console.log('🏙️ Building data for ALL CITIES mode');
  console.log('🏙️ Cities count:', cities?.length || 0);
  
  cities?.forEach((city) => {
    // Find all rates for this destination city
    const cityRates = kaatRates?.filter(r => 
      String(r.destination_city_id) === String(city.id)
    ) || [];
    
    console.log(`🏙️ City: ${city.city_name}, Rates: ${cityRates.length}`);
    
    if (cityRates.length > 0) {
      // City has kaat rates - add each transport serving this city
      cityRates.forEach(rate => {
        // Skip inactive if not included
        if (!includeInactive && !rate.is_active) return;
        
        // Find transport for this rate
        const transport = findTransport(transports, rate.transport_id);
        
        // Use transport from lookup or fallback to rate's transport_name
        const transportName = transport?.transport_name || rate.transport_name;
        const gstNumber = transport?.gst_number || null;
        
        tableData.push(buildTableRow(
          serialNo++,
          transportName,
          gstNumber,
          city.city_name,
          city.city_code,
          rate
        ));
      });
    } else {
      // City has NO kaat rates - find transports based in this city
      const transportsInCity = transports?.filter(t => {
        // Match by city_id
        if (t.city_id && String(t.city_id) === String(city.id)) return true;
        // Match by city_name
        if (t.city_name?.toLowerCase() === city.city_name?.toLowerCase()) return true;
        return false;
      }) || [];
      
      console.log(`🏙️ No rates for ${city.city_name}, transports in city: ${transportsInCity.length}`);
      
      if (transportsInCity.length > 0) {
        // Show each transport based in this city
        transportsInCity.forEach(transport => {
          tableData.push(buildTableRow(
            serialNo++,
            transport.transport_name,
            transport.gst_number,
            city.city_name,
            city.city_code,
            null // No rate
          ));
        });
      } else {
        // No transports in this city - show city row with empty transport
        tableData.push(buildTableRow(
          serialNo++,
          null,
          null,
          city.city_name,
          city.city_code,
          null // No rate
        ));
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
  
  console.log('📋 Building data for FILTERED mode');
  console.log('📋 Initial rates count:', filteredRates.length);
  
  // Filter by transport
  if (settings.filterType === 'transport' && settings.selectedTransport) {
    const transportId = String(settings.selectedTransport);
    filteredRates = filteredRates.filter(r => 
      r.transport_id && String(r.transport_id) === transportId
    );
    console.log('📋 After transport filter:', filteredRates.length);
  }
  
  // Filter by city
  if (settings.filterType === 'city' && settings.selectedCity) {
    const cityId = String(settings.selectedCity);
    filteredRates = filteredRates.filter(r => 
      String(r.destination_city_id) === cityId
    );
    console.log('📋 After city filter:', filteredRates.length);
  }
  
  // Filter by status
  if (!settings.includeInactive) {
    filteredRates = filteredRates.filter(r => r.is_active === true);
    console.log('📋 After active filter:', filteredRates.length);
  }
  
  // Sort rates
  filteredRates.sort((a, b) => {
    if (settings.sortBy === 'transport') {
      return (a.transport_name || '').toLowerCase().localeCompare((b.transport_name || '').toLowerCase());
    } else if (settings.sortBy === 'city') {
      const cityA = findCity(cities, a.destination_city_id);
      const cityB = findCity(cities, b.destination_city_id);
      return (cityA?.city_name || '').toLowerCase().localeCompare((cityB?.city_name || '').toLowerCase());
    } else if (settings.sortBy === 'rate') {
      const rateA = parseFloat(a.rate_per_kg || a.rate_per_pkg || 0);
      const rateB = parseFloat(b.rate_per_kg || b.rate_per_pkg || 0);
      return rateA - rateB;
    }
    return 0;
  });
  
  // Build table data
  filteredRates.forEach((rate, index) => {
    const transport = findTransport(transports, rate.transport_id);
    const city = findCity(cities, rate.destination_city_id);
    
    tableData.push(buildTableRow(
      index + 1,
      transport?.transport_name || rate.transport_name,
      transport?.gst_number,
      city?.city_name,
      city?.city_code,
      rate
    ));
  });
  
  return tableData;
};

// ============================================================
// PDF BUILDER: Add header
// ============================================================
const addPDFHeader = (doc, subtitle) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Company name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_CONFIG.colors.black);
  doc.text('SS TRANSPORT CORPORATION', pageWidth / 2, 15, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_CONFIG.colors.emerald);
  doc.text(subtitle || 'KAAT RATE LIST', pageWidth / 2, 25, { align: 'center' });
  
  // Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_CONFIG.colors.gray);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth / 2, 32, { align: 'center' });
  
  // Line
  doc.setDrawColor(...PDF_CONFIG.colors.emerald);
  doc.setLineWidth(0.5);
  doc.line(10, 35, pageWidth - 10, 35);
};

// ============================================================
// PDF BUILDER: Add footer
// ============================================================
const addPDFFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Page number
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_CONFIG.colors.gray);
    doc.text(`Page ${i} of ${pageCount}`, 20, pageHeight - 10);
    
    // Generated by
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_CONFIG.colors.darkGray);
    doc.text('Generated by MoveSure', pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
};

// ============================================================
// MAIN: Generate Kaat Rates PDF
// ============================================================
export const generateKaatRatesPDF = (kaatRates, cities, transports, settings, previewMode = false) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 PDF GENERATION STARTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Data Summary:', {
      rates: kaatRates?.length || 0,
      cities: cities?.length || 0,
      transports: transports?.length || 0
    });
    console.log('📊 Settings:', settings);

    // Create PDF document (landscape A4)
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width; // 297mm
    const { left: marginLeft, right: marginRight } = PDF_CONFIG.margins;
    const tableWidth = pageWidth - marginLeft - marginRight; // 277mm
    
    // Add header
    addPDFHeader(doc, settings.subtitle);
    
    // Build table data based on settings
    let tableData = [];
    
    if (settings.includeAllTransports) {
      console.log('📊 Mode: INCLUDE ALL TRANSPORTS');
      tableData = buildDataForAllTransports(kaatRates, cities, transports, settings.includeInactive);
    } else if (settings.includeAllCities) {
      console.log('📊 Mode: INCLUDE ALL CITIES');
      tableData = buildDataForAllCities(kaatRates, cities, transports, settings.includeInactive);
    } else {
      console.log('📊 Mode: STANDARD FILTERED');
      tableData = buildDataForFilteredRates(kaatRates, cities, transports, settings);
    }
    
    console.log('📊 Table rows built:', tableData.length);
    
    // Add filter info
    let yPosition = 40;
    if (settings.filterType === 'transport' && settings.selectedTransport) {
      const transport = findTransport(transports, settings.selectedTransport);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_CONFIG.colors.purple);
      doc.text(`Filtered by Transport: ${transport?.transport_name || 'Unknown'}`, marginLeft, yPosition);
      yPosition += 5;
    }
    
    if (settings.filterType === 'city' && settings.selectedCity) {
      const city = findCity(cities, settings.selectedCity);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_CONFIG.colors.blue);
      doc.text(`Filtered by Destination: ${city?.city_name || 'Unknown'}`, marginLeft, yPosition);
      yPosition += 5;
    }
    
    // Column widths
    const serialColWidth = 12;
    const remainingWidth = tableWidth - serialColWidth;
    
    const colWidths = {
      serial: serialColWidth,
      transport: remainingWidth * 0.27,
      gst: remainingWidth * 0.20,
      destination: remainingWidth * 0.18,
      pricing: remainingWidth * 0.11,
      rate: remainingWidth * 0.14,
      minCharge: remainingWidth * 0.08,
      remarks: remainingWidth * 0.02
    };
    
    // Generate table
    autoTable(doc, {
      startY: yPosition + 3,
      margin: { left: marginLeft, right: marginRight },
      tableWidth: tableWidth,
      head: [[
        'Sr.',
        'Transport Name',
        'GST Number',
        'Destination',
        'Pricing',
        'Rate',
        'Min Charge',
        'Remarks'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_CONFIG.colors.emerald,
        textColor: PDF_CONFIG.colors.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: 1.5,
        minCellHeight: 6
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 1.2,
        minCellHeight: 5
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: colWidths.serial },
        1: { cellWidth: colWidths.transport },
        2: { cellWidth: colWidths.gst, fontSize: 7 },
        3: { cellWidth: colWidths.destination },
        4: { halign: 'center', cellWidth: colWidths.pricing },
        5: { halign: 'right', cellWidth: colWidths.rate },
        6: { halign: 'right', cellWidth: colWidths.minCharge },
        7: { cellWidth: colWidths.remarks, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: PDF_CONFIG.colors.altRow
      }
    });
    
    // Summary
    const finalY = doc.lastAutoTable.finalY || 100;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_CONFIG.colors.black);
    doc.text('Summary:', marginLeft, finalY + 10);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_CONFIG.colors.darkGray);
    doc.text(`Total Entries: ${tableData.length}`, marginLeft, finalY + 16);
    
    // Footer
    addPDFFooter(doc);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PDF GENERATED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Return or save
    if (previewMode) {
      return doc.output('bloburl');
    } else {
      let filename = 'kaat-rates';
      if (settings.filterType === 'transport' && settings.selectedTransport) {
        const transport = findTransport(transports, settings.selectedTransport);
        filename = `kaat-${(transport?.transport_name || 'transport').toLowerCase().replace(/\s+/g, '-')}`;
      } else if (settings.filterType === 'city' && settings.selectedCity) {
        const city = findCity(cities, settings.selectedCity);
        filename = `kaat-${(city?.city_name || 'city').toLowerCase().replace(/\s+/g, '-')}`;
      }
      filename += `-${format(new Date(), 'dd-MMM-yyyy')}.pdf`;
      doc.save(filename);
      return null;
    }
    
  } catch (error) {
    console.error('❌ PDF Generation Error:', error);
    throw error;
  }
};
