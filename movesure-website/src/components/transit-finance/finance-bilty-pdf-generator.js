'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import supabase from '../../app/utils/supabase';

export const generateFinanceBiltyPDF = async (filteredTransits, selectedChallan, cities, getCityName) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 8;

  // Fetch kaat data for all GR numbers
  const grNumbers = filteredTransits.map(t => t.gr_no);
  const { data: kaatData, error: kaatError } = await supabase
    .from('bilty_wise_kaat')
    .select('*')
    .in('gr_no', grNumbers);

  if (kaatError) {
    console.error('Error fetching kaat data:', kaatError);
  }

  // Create a map for quick kaat lookup
  const kaatMap = {};
  (kaatData || []).forEach(kaat => {
    kaatMap[kaat.gr_no] = kaat;
  });

  // Calculate totals
  const totalPackages = filteredTransits.reduce((sum, t) => sum + (t.bilty?.no_of_pkg || t.station?.no_of_packets || 0), 0);
  const totalWeight = filteredTransits.reduce((sum, t) => sum + (t.bilty?.wt || t.station?.weight || 0), 0);
  const totalFreight = filteredTransits.reduce((sum, t) => sum + (t.bilty?.freight_amount || 0), 0);
  const totalAmount = filteredTransits.reduce((sum, t) => sum + (t.bilty?.total || t.station?.amount || 0), 0);
  const totalLabour = filteredTransits.reduce((sum, t) => sum + (t.bilty?.labour_charge || 0), 0);
  const totalOther = filteredTransits.reduce((sum, t) => {
    const bilty = t.bilty;
    return sum + (bilty ? 
      parseFloat(bilty.other_charge || 0) + 
      parseFloat(bilty.toll_charge || 0) + 
      parseFloat(bilty.dd_charge || 0) + 
      parseFloat(bilty.bill_charge || 0) : 0);
  }, 0);
  
  // Calculate total kaat (will be fetched from bilty_wise_kaat table)
  let totalKaat = 0;

  // Add header function
  const addHeader = (pageNum) => {
    // Header background
    doc.setFillColor(79, 70, 229); // Indigo
    doc.rect(0, 0, pageWidth, 32, 'F');

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('S. S. TRANSPORT CORPORATION', pageWidth / 2, 10, { align: 'center' });

    // Document title
    doc.setFontSize(11);
    doc.text('Finance Bilty Report', pageWidth / 2, 17, { align: 'center' });

    // Challan info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Challan: ${selectedChallan.challan_no}`, margin, 25);
    doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, 25, { align: 'center' });
    doc.text(`Page: ${pageNum}`, pageWidth - margin, 25, { align: 'right' });

    // Reset text color
    doc.setTextColor(0, 0, 0);
  };

  // Add first page header
  addHeader(1);

  // Prepare table data with kaat information
  const tableData = filteredTransits.map((transit, index) => {
    const bilty = transit.bilty;
    const station = transit.station;
    const data = bilty || station;

    const otherCharges = bilty 
      ? parseFloat(bilty.other_charge || 0) + 
        parseFloat(bilty.toll_charge || 0) + 
        parseFloat(bilty.dd_charge || 0) + 
        parseFloat(bilty.bill_charge || 0)
      : 0;

    // Get kaat data for this GR number
    const kaat = kaatMap[transit.gr_no];
    let kaatAmount = 0;

    if (kaat) {
      const weight = parseFloat(bilty?.wt || station?.weight || 0);
      const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
      const rateKg = parseFloat(kaat.rate_per_kg) || 0;
      const ratePkg = parseFloat(kaat.rate_per_pkg) || 0;

      if (kaat.rate_type === 'per_kg') {
        kaatAmount = weight * rateKg;
      } else if (kaat.rate_type === 'per_pkg') {
        kaatAmount = packages * ratePkg;
      } else if (kaat.rate_type === 'hybrid') {
        kaatAmount = (weight * rateKg) + (packages * ratePkg);
      }
    }

    totalKaat += kaatAmount;

    return [
      (index + 1).toString(),
      transit.gr_no || '',
      data?.bilty_date || data?.created_at 
        ? format(new Date(data.bilty_date || data.created_at), 'dd/MM/yy')
        : '-',
      (bilty?.consignor_name || station?.consignor || 'N/A').substring(0, 15),
      (bilty?.consignee_name || station?.consignee || 'N/A').substring(0, 15),
      bilty ? getCityName(bilty.to_city_id).substring(0, 12) : (station?.station || '').substring(0, 12),
      (bilty?.no_of_pkg || station?.no_of_packets || 0).toString(),
      Math.round(bilty?.wt || station?.weight || 0).toString(),
      bilty?.freight_amount ? Math.round(bilty.freight_amount).toString() : '-',
      bilty?.labour_charge ? Math.round(bilty.labour_charge).toString() : '-',
      otherCharges > 0 ? Math.round(otherCharges).toString() : '-',
      kaatAmount > 0 ? Math.round(kaatAmount).toString() : '-',
      Math.round(bilty?.total || station?.amount || 0).toString(),
      (bilty?.payment_mode || station?.payment_status || 'N/A').toUpperCase()
    ];
  });

  // Create main table
  autoTable(doc, {
    startY: 36,
    head: [['S.No', 'GR No.', 'Date', 'Consignor', 'Consignee', 'Dest.', 'Pkg', 'Wt', 'Frgt', 'Lab', 'Oth', 'Kaat', 'Total', 'Pmt']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 1,
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    styles: { 
      fontSize: 6,
      cellPadding: 0.8,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      minCellHeight: 5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 'auto', fontStyle: 'bold', fontSize: 7 },
      2: { halign: 'center', cellWidth: 'auto' },
      3: { cellWidth: 'auto', fontSize: 5.5 },
      4: { cellWidth: 'auto', fontSize: 5.5 },
      5: { halign: 'center', cellWidth: 'auto', fontSize: 6 },
      6: { halign: 'center', cellWidth: 'auto' },
      7: { halign: 'center', cellWidth: 'auto' },
      8: { halign: 'right', cellWidth: 'auto' },
      9: { halign: 'right', cellWidth: 'auto' },
      10: { halign: 'right', cellWidth: 'auto' },
      11: { halign: 'right', cellWidth: 'auto' },
      12: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      13: { halign: 'center', cellWidth: 'auto', fontSize: 5.5 }
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto',
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        addHeader(data.pageNumber);
      }
    }
  });

  // Add totals row - merged with main table
  const tableEndY = doc.lastAutoTable.finalY;

  autoTable(doc, {
    startY: tableEndY,
    body: [['', '', '', 'TOTAL', '', '', totalPackages.toString(), Math.round(totalWeight).toString(), Math.round(totalFreight).toString(), Math.round(totalLabour).toString(), Math.round(totalOther).toString(), Math.round(totalKaat).toString(), Math.round(totalAmount).toString(), '']],
    theme: 'grid',
    styles: { 
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: 1.5,
      textColor: [0, 0, 0],
      fillColor: [240, 240, 240],
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 'auto' },
      3: { halign: 'left', cellWidth: 'auto', fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 'auto' },
      5: { halign: 'center', cellWidth: 'auto' },
      6: { halign: 'center', cellWidth: 'auto', fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 'auto', fontStyle: 'bold' },
      8: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      9: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      10: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      11: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      12: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      13: { halign: 'center', cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto'
  });

  // Add signature area
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Bilties: ' + filteredTransits.length, margin, finalY);
  doc.text('Authorized Signatory: ____________________', pageWidth - margin - 60, finalY);

  // Download the PDF
  return doc.save(`Finance_Bilty_${selectedChallan.challan_no}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
