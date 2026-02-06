'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// ============================================================
// PDF CONFIGURATION
// ============================================================
const PDF_CONFIG = {
  margins: { left: 8, right: 8, top: 8, bottom: 8 },
  colors: {
    primary: [79, 70, 229],      // Indigo
    secondary: [16, 185, 129],   // Emerald
    purple: [139, 92, 246],
    blue: [59, 130, 246],
    gray: [100, 100, 100],
    darkGray: [60, 60, 60],
    black: [0, 0, 0],
    white: [255, 255, 255],
    altRow: [245, 247, 250],
    lightGray: [240, 240, 240]
  }
};

// ============================================================
// HELPER: Format payment/delivery
// ============================================================
const formatPaymentDelivery = (paymentMode, deliveryType, paymentStatus) => {
  const delivery = deliveryType || '';
  
  if (paymentMode) {
    const payment = paymentMode.toUpperCase();
    const suffix = delivery.toLowerCase().includes('door') ? '/DD' : '';
    return payment + suffix;
  }
  if (paymentStatus) {
    const payment = paymentStatus.toUpperCase().replace('-', ' ');
    const suffix = delivery.toLowerCase().includes('door') ? '/DD' : '';
    return payment + suffix;
  }
  return 'N/A';
};

// ============================================================
// HELPER: Calculate kaat amount
// ============================================================
const calculateKaatAmount = (kaat, weight, packages) => {
  if (!kaat) return 0;
  
  const rateKg = parseFloat(kaat.rate_per_kg) || 0;
  const ratePkg = parseFloat(kaat.rate_per_pkg) || 0;
  
  // Apply 50kg minimum for per_kg rate type
  const effectiveWeight = Math.max(weight, 50);
  
  if (kaat.rate_type === 'per_kg') {
    return effectiveWeight * rateKg;
  } else if (kaat.rate_type === 'per_pkg') {
    return packages * ratePkg;
  } else if (kaat.rate_type === 'hybrid') {
    return (effectiveWeight * rateKg) + (packages * ratePkg);
  }
  return 0;
};

// ============================================================
// HELPER: Add first page header (full header)
// ============================================================
const addFirstPageHeader = (doc, settings) => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = PDF_CONFIG.margins.left;
  
  // Header background
  doc.setFillColor(...PDF_CONFIG.colors.primary);
  doc.rect(0, 0, pageWidth, 42, 'F');
  
  // Company name
  doc.setTextColor(...PDF_CONFIG.colors.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('S. S. TRANSPORT CORPORATION', pageWidth / 2, 10, { align: 'center' });
  
  // Title
  doc.setFontSize(12);
  doc.text('CONSOLIDATED KAAT BILL', pageWidth / 2, 18, { align: 'center' });
  
  // GST and Customer Care
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('GSTIN: 09COVPS5556J1ZT', margin + 5, 26);
  doc.text('CUSTOMER CARE: 9690293140', pageWidth - margin - 5, 26, { align: 'right' });
  
  // Date range if provided
  if (settings.fromDate || settings.toDate) {
    const fromStr = settings.fromDate ? format(new Date(settings.fromDate), 'dd/MM/yyyy') : '-';
    const toStr = settings.toDate ? format(new Date(settings.toDate), 'dd/MM/yyyy') : '-';
    doc.setFontSize(8);
    doc.text(`Period: ${fromStr} to ${toStr}`, pageWidth / 2, 32, { align: 'center' });
  }
  
  // Subtitle (transport name / custom)
  if (settings.subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.subtitle, pageWidth / 2, 38, { align: 'center' });
  }
  
  doc.setTextColor(...PDF_CONFIG.colors.black);
  
  return 46; // Return Y position after header
};

// ============================================================
// HELPER: Add subsequent page header (minimal)
// ============================================================
const addSubsequentPageHeader = (doc, pageNum) => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = PDF_CONFIG.margins.left;
  
  // Simple header line
  doc.setFillColor(...PDF_CONFIG.colors.primary);
  doc.rect(0, 0, pageWidth, 10, 'F');
  
  doc.setTextColor(...PDF_CONFIG.colors.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNum}`, margin, 7);
  doc.text(`${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin, 7, { align: 'right' });
  
  doc.setTextColor(...PDF_CONFIG.colors.black);
  
  return 14; // Return Y position after header
};

// ============================================================
// HELPER: Add challan section header
// ============================================================
const addChallanHeader = (doc, yPos, kaatBill, challanInfo) => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = PDF_CONFIG.margins.left;
  
  // Challan header background
  doc.setFillColor(...PDF_CONFIG.colors.secondary);
  doc.rect(margin, yPos, pageWidth - margin * 2, 10, 'F');
  
  // Format dispatch date
  let dispatchDateStr = 'Not Dispatched';
  if (challanInfo?.dispatch_date) {
    dispatchDateStr = format(new Date(challanInfo.dispatch_date), 'dd/MM/yyyy');
  } else if (challanInfo?.date) {
    dispatchDateStr = format(new Date(challanInfo.date), 'dd/MM/yyyy');
  }
  
  // Challan info - NO transport name/GST, WITH dispatch date
  doc.setTextColor(...PDF_CONFIG.colors.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Challan: ${kaatBill.challan_no}`, margin + 3, yPos + 6);
  doc.text(`Bilties: ${kaatBill.total_bilty_count}`, margin + 55, yPos + 6);
  doc.text(`Dispatch: ${dispatchDateStr}`, pageWidth - margin - 3, yPos + 6, { align: 'right' });
  
  doc.setTextColor(...PDF_CONFIG.colors.black);
  
  return yPos + 13;
};

// ============================================================
// MAIN: Generate Consolidated PDF
// ============================================================
export const generateConsolidatedKaatPDF = (selectedBills, enrichedBillsData, settings, challanDetailsMap = {}, previewMode = false) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 CONSOLIDATED KAAT PDF GENERATION STARTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Selected Bills:', selectedBills.length);
    console.log('📊 Settings:', settings);
    console.log('📊 Challan Details:', challanDetailsMap);

    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = PDF_CONFIG.margins.left;
    
    let currentPage = 1;
    let yPosition = 0;
    
    // Grand totals
    let grandTotalBilties = 0;
    let grandTotalPackages = 0;
    let grandTotalWeight = 0;
    let grandTotalAmount = 0;
    let grandTotalKaat = 0;
    let grandTotalProfit = 0;
    
    // Sort bills by challan number (ascending)
    const sortedBills = [...selectedBills].sort((a, b) => {
      // Extract numeric part from challan_no for proper sorting
      const numA = parseInt(a.challan_no?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.challan_no?.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
    
    console.log('📊 Bills sorted by challan number:', sortedBills.map(b => b.challan_no));
    
    // Add first page header (full header with company name, title, GST, customer care)
    yPosition = addFirstPageHeader(doc, settings);
    
    // Process each selected bill (now sorted)
    sortedBills.forEach((kaatBill, billIndex) => {
      const billData = enrichedBillsData[kaatBill.id];
      if (!billData) return;
      
      const { details } = billData;
      if (!details || details.length === 0) return;
      
      // Get challan details for dispatch date
      const challanInfo = challanDetailsMap[kaatBill.challan_no] || {};
      
      // Check if we need a new page for challan header
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        currentPage++;
        yPosition = addSubsequentPageHeader(doc, currentPage);
      }
      
      // Add challan header (without transport name/GST, with dispatch date)
      yPosition = addChallanHeader(doc, yPosition, kaatBill, challanInfo);
      
      // Calculate totals for this bill
      let billTotalPackages = 0;
      let billTotalWeight = 0;
      let billTotalAmount = 0;
      let billTotalKaat = 0;
      
      // Build table data for this bill
      const tableData = details.map((item, index) => {
        const bilty = item.bilty;
        const station = item.station;
        const kaat = item.kaat;
        
        const weight = parseFloat(bilty?.wt || station?.weight || 0);
        const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
        const total = parseFloat(bilty?.total || station?.amount || 0);
        const kaatAmount = calculateKaatAmount(kaat, weight, packages);
        const profit = kaat ? total - kaatAmount : 0;
        
        // Accumulate bill totals
        billTotalPackages += packages;
        billTotalWeight += weight;
        billTotalAmount += total;
        billTotalKaat += kaatAmount;
        
        const paymentDelivery = formatPaymentDelivery(
          bilty?.payment_mode,
          bilty?.delivery_type || station?.delivery_type,
          station?.payment_status
        );
        
        return [
          (index + 1).toString(),
          item.gr_no || 'N/A',
          bilty?.bilty_date ? format(new Date(bilty.bilty_date), 'dd/MM') : 
            station?.created_at ? format(new Date(station.created_at), 'dd/MM') : '-',
          (bilty?.consignor_name || station?.consignor || 'N/A').substring(0, 14),
          (bilty?.consignee_name || station?.consignee || 'N/A').substring(0, 14),
          paymentDelivery,
          packages.toString(),
          weight.toFixed(1),
          total.toFixed(0),
          kaatAmount.toFixed(0),
          profit.toFixed(0)
        ];
      });
      
      // Accumulate grand totals
      grandTotalBilties += details.length;
      grandTotalPackages += billTotalPackages;
      grandTotalWeight += billTotalWeight;
      grandTotalAmount += billTotalAmount;
      grandTotalKaat += billTotalKaat;
      grandTotalProfit += (billTotalAmount - billTotalKaat);
      
      // Table headers
      const headers = ['#', 'GR No.', 'Date', 'Consignor', 'Consignee', 'Pay', 'Pkg', 'Wt', 'Amt', 'Kaat', 'PF'];
      
      // Column styles
      const columnStyles = {
        0: { halign: 'center', cellWidth: 7 },
        1: { halign: 'center', cellWidth: 17 },
        2: { halign: 'center', cellWidth: 13 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 'auto' },
        5: { halign: 'center', cellWidth: 14 },
        6: { halign: 'center', cellWidth: 10 },
        7: { halign: 'right', cellWidth: 12 },
        8: { halign: 'right', cellWidth: 14 },
        9: { halign: 'right', cellWidth: 14 },
        10: { halign: 'right', cellWidth: 14, fontStyle: 'bold' }
      };
      
      // Generate table
      autoTable(doc, {
        startY: yPosition,
        head: [headers],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: PDF_CONFIG.colors.primary,
          textColor: PDF_CONFIG.colors.white,
          fontSize: 6.5,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 1
        },
        styles: {
          fontSize: 6,
          cellPadding: 1
        },
        columnStyles: columnStyles,
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          // Add minimal header on new pages
          if (data.pageNumber > currentPage) {
            currentPage = data.pageNumber;
            addSubsequentPageHeader(doc, currentPage);
          }
        }
      });
      
      yPosition = doc.lastAutoTable.finalY;
      
      // Add challan subtotal row
      doc.setFillColor(...PDF_CONFIG.colors.lightGray);
      doc.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_CONFIG.colors.darkGray);
      
      const subtotalY = yPosition + 5.5;
      doc.text(`Challan ${kaatBill.challan_no} Total:`, margin + 3, subtotalY);
      doc.text(`Pkg: ${Math.round(billTotalPackages)}`, margin + 55, subtotalY);
      doc.text(`Wt: ${billTotalWeight.toFixed(1)}`, margin + 80, subtotalY);
      doc.text(`Amt: ${billTotalAmount.toFixed(0)}`, margin + 105, subtotalY);
      doc.text(`Kaat: ${billTotalKaat.toFixed(0)}`, margin + 135, subtotalY);
      doc.setTextColor(...PDF_CONFIG.colors.primary);
      doc.text(`PF: ${(billTotalAmount - billTotalKaat).toFixed(0)}`, pageWidth - margin - 3, subtotalY, { align: 'right' });
      
      doc.setTextColor(...PDF_CONFIG.colors.black);
      yPosition += 12;
    });
    
    // Add Grand Total section
    if (yPosition > pageHeight - 55) {
      doc.addPage();
      currentPage++;
      yPosition = addSubsequentPageHeader(doc, currentPage);
      yPosition += 5;
    }
    
    // Grand Total Box
    doc.setFillColor(...PDF_CONFIG.colors.primary);
    doc.rect(margin, yPosition, pageWidth - margin * 2, 32, 'F');
    
    doc.setTextColor(...PDF_CONFIG.colors.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('GRAND TOTAL', margin + 5, yPosition + 8);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Grand total details - Row 1
    const col1X = margin + 5;
    const col2X = margin + 55;
    const col3X = margin + 105;
    const col4X = pageWidth - margin - 5;
    
    doc.text(`Challans: ${sortedBills.length}`, col1X, yPosition + 15);
    doc.text(`Bilties: ${grandTotalBilties}`, col2X, yPosition + 15);
    doc.text(`Packages: ${Math.round(grandTotalPackages)}`, col3X, yPosition + 15);
    
    doc.text(`Weight: ${grandTotalWeight.toFixed(2)} kg`, col1X, yPosition + 21);
    doc.text(`Total Amount: Rs.${grandTotalAmount.toFixed(2)}`, col2X, yPosition + 21);
    doc.text(`Total Kaat: Rs.${grandTotalKaat.toFixed(2)}`, col3X, yPosition + 21);
    
    // Net Profit with T&C note
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 100);
    doc.text(`Net Profit: Rs.${grandTotalProfit.toFixed(2)}`, col4X, yPosition + 15, { align: 'right' });
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(255, 255, 255);
    doc.text('*T&C Apply', col4X, yPosition + 21, { align: 'right' });
    
    // Terms note in box
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Amount may vary based on bilty circumstances and applicable terms & conditions.', margin + 5, yPosition + 28);
    
    yPosition += 38;
    
    // Footer - Position at bottom of page
    const footerY = pageHeight - 12;
    
    doc.setTextColor(...PDF_CONFIG.colors.gray);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, margin, footerY);
    doc.text('For S. S. TRANSPORT CORPORATION', pageWidth - margin, footerY, { align: 'right' });
    
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Generated by MoveSure.io', pageWidth / 2, footerY + 5, { align: 'center' });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CONSOLIDATED PDF GENERATED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (previewMode) {
      return doc.output('bloburl');
    } else {
      const filename = `Consolidated_Kaat_Bill_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(filename);
      return null;
    }
    
  } catch (error) {
    console.error('❌ PDF Generation Error:', error);
    throw error;
  }
};
