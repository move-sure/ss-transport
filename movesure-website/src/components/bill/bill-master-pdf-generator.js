'use client';

import { jsPDF } from 'jspdf';

export const generateBillMasterPDF = async (billMaster, billDetails, returnBlob = false) => {
  try {
    if (!billMaster || !billDetails || billDetails.length === 0) {
      throw new Error('Bill master or bill details are missing');
    }

    const primaryColor = { r: 13, g: 71, b: 161 };
    const headerFillColor = { r: 220, g: 233, b: 255 };
    const summaryFillColor = { r: 235, g: 242, b: 255 };

    const formatCurrency = (amount) => {
      if (!amount || amount === 0) return '0';
      const num = Math.round(parseFloat(amount));
      return num.toString();
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        return new Date(dateString).toLocaleDateString('en-IN');
      } catch {
        return 'N/A';
      }
    };

    console.log('Starting Bill Master PDF generation...');
    
    const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 5;
    const contentWidth = pageWidth - (2 * margin);
    let yPosition = 15;

    const drawPageBorder = () => {
      pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      pdf.setLineWidth(0.8);
      pdf.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
    };

    drawPageBorder();

    // Add logo
    let logoDataUrl = null;
    try {
      const response = await fetch('/logo.png');
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = function() {
            logoDataUrl = reader.result;
            pdf.addImage(logoDataUrl, 'PNG', 8, 15, 30, 20);
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.log('Logo not added');
    }

    // Company Name
    pdf.setFontSize(20);
    pdf.setFont('times', 'bold');
    pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    pdf.text('S S TRANSPORT CORPORATION', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;

    // Address
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Gandhi Park, GT. ROAD, ALIGARH-202001', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;

    // Contact info
    pdf.setFontSize(9);
    pdf.text('Phone: 8077834769, 7668291228 | Customer Care: 9690293140', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.text('GST No: 09COVPS5556J1ZT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 4;

    pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    pdf.setLineWidth(0.4);
    pdf.line(margin + 2, yPosition, pageWidth - margin - 2, yPosition);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.2);
    yPosition += 6;

    // Bill Title
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    pdf.text('Monthly Bill Statement', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Bill Master Details
    pdf.setFontSize(10);
    pdf.setFont('times', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Bill No: ${billMaster.bill_number || 'N/A'}`, margin + 5, yPosition);
    pdf.text(`Bill Date: ${formatDate(billMaster.bill_date)}`, pageWidth / 2 - 30, yPosition);
    pdf.text(`Party Name: ${billMaster.party_name || 'N/A'}`, pageWidth - 80, yPosition);
    yPosition += 6;
    pdf.text(`Billing Type: ${billMaster.billing_type || 'N/A'}`, margin + 5, yPosition);
    pdf.text(`Status: ${billMaster.status || 'Draft'}`, pageWidth - 80, yPosition);
    yPosition += 6;
    
    // Date Range if available
    if (billMaster.metadata?.dateRange?.fromDate || billMaster.metadata?.dateRange?.toDate) {
      const fromDate = billMaster.metadata.dateRange.fromDate ? formatDate(billMaster.metadata.dateRange.fromDate) : 'N/A';
      const toDate = billMaster.metadata.dateRange.toDate ? formatDate(billMaster.metadata.dateRange.toDate) : 'N/A';
      
      // Draw highlighted box for period
      pdf.setFillColor(255, 251, 235); // Light yellow background
      pdf.setDrawColor(251, 191, 36); // Amber border
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin + 3, yPosition - 2, 90, 7, 2, 2, 'FD');
      
      pdf.setFontSize(10);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(180, 83, 9); // Amber-700 color
      pdf.text(`Period: ${fromDate} to ${toDate}`, margin + 6, yPosition + 3);
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 0, 0);
    } else {
      yPosition += 2;
    }

    // Bulk Rate Settings Section (if metadata exists)
    if (billMaster.metadata && billMaster.metadata.bulkRates) {
      const bulkRates = billMaster.metadata.bulkRates;
      
      pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 2, yPosition, pageWidth - margin - 2, yPosition);
      yPosition += 5;

      pdf.setFontSize(11);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      pdf.text('RATE LIST', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;

      // Common Charges Only - Vertical Layout
      pdf.setFontSize(9);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 0, 0);
      const rateType = bulkRates.commonRateType === 'per-package' ? 'Package' : 'KG';
      
      // Line 1: Common Labour Rate
      pdf.text(`Common Labour Rate: Rs.${bulkRates.commonLabourRate || 0} / ${rateType}`, margin + 5, yPosition);
      yPosition += 5;
      
      // Line 2: Bilty Charge
      pdf.text(`Bilty Charge: Rs.${bulkRates.commonBillCharge || 0} per bilty`, margin + 5, yPosition);
      yPosition += 5;
      
      // Line 3: Toll Charge
      pdf.text(`Toll Charge: Rs.${bulkRates.commonTollCharge || 0} per bilty`, margin + 5, yPosition);
      yPosition += 3;

      pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      pdf.line(margin + 2, yPosition, pageWidth - margin - 2, yPosition);
      yPosition += 6;
    }

    // Table Headers
    const tableStartY = yPosition;
    const tableStartX = margin + 2;
    const totalTableWidth = contentWidth - 4;
    
    // Column widths (optimized to use full width)
    const colWidths = [
      totalTableWidth * 0.03,  // S.No (3%)
      totalTableWidth * 0.06,  // Date (6%)
      totalTableWidth * 0.07,  // GR No (7%)
      totalTableWidth * 0.11,  // Consignor (11%)
      totalTableWidth * 0.11,  // Consignee (11%)
      totalTableWidth * 0.08,  // City (8%)
      totalTableWidth * 0.05,  // Pvt Marks (5%)
      totalTableWidth * 0.04,  // Pkgs (4%)
      totalTableWidth * 0.04,  // Wt (4%)
      totalTableWidth * 0.04,  // Del.Type (4%)
      totalTableWidth * 0.04,  // Pay Mode (4%)
      totalTableWidth * 0.07,  // Freight (7%)
      totalTableWidth * 0.05,  // Labour (5%)
      totalTableWidth * 0.06,  // Bilty Charge (6%)
      totalTableWidth * 0.05,  // Toll (5%)
      totalTableWidth * 0.05,  // DD (5%)
      totalTableWidth * 0.07   // Total (7%)
    ];

    const drawColumnDividers = (startX, startY, height, widths) => {
      let dividerX = startX;
      pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      widths.slice(0, -1).forEach(width => {
        dividerX += width;
        pdf.line(dividerX, startY, dividerX, startY + height);
      });
      pdf.setDrawColor(0, 0, 0);
    };

    // Header Row
    pdf.setFontSize(7);
    pdf.setFont('times', 'bold');
    pdf.setFillColor(headerFillColor.r, headerFillColor.g, headerFillColor.b);
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    pdf.rect(tableStartX, tableStartY, totalWidth, 8, 'F');
    drawColumnDividers(tableStartX, tableStartY, 8, colWidths);

    let currentX = tableStartX + 1;
    const headers = ['S.No', 'Date', 'GR No', 'Consignor', 'Consignee', 'City', 'Pvt Marks', 'Pkgs', 'Wt', 'Del', 'Pay', 'Freight', 'Labour', 'Bilty Charge', 'Toll', 'DD', 'Total'];
    headers.forEach((header, idx) => {
      pdf.text(header, currentX, tableStartY + 5.5);
      currentX += colWidths[idx];
    });

    yPosition = tableStartY + 8;

    // Table Rows
    let serialNumber = 1;
    const rowHeight = 6;
    const maxPageHeight = pageHeight - 15;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(7);

    let totalFreight = 0;
    let totalLabour = 0;
    let totalBillCharge = 0;
    let totalToll = 0;
    let totalDD = 0;
    let totalBiltyAmount = 0;
    let totalPackages = 0;
    let totalWeight = 0;

    billDetails.forEach((detail) => {
      if (yPosition > maxPageHeight) {
        pdf.addPage();
        drawPageBorder();
        yPosition = 10;
        
        // Re-add header
        pdf.setFontSize(7);
        pdf.setFont('times', 'bold');
        pdf.setFillColor(headerFillColor.r, headerFillColor.g, headerFillColor.b);
        pdf.rect(tableStartX, yPosition, totalWidth, 8, 'F');
        drawColumnDividers(tableStartX, yPosition, 8, colWidths);
        
        currentX = tableStartX + 1;
        headers.forEach((header, idx) => {
          pdf.text(header, currentX, yPosition + 5.5);
          currentX += colWidths[idx];
        });
        
        yPosition += 8;
        pdf.setFont('times', 'normal');
      }

      currentX = tableStartX + 1;
      
      // S.No
      pdf.text(serialNumber.toString(), currentX, yPosition + 4);
      currentX += colWidths[0];
      
      // Date
      pdf.text(formatDate(detail.date), currentX, yPosition + 4);
      currentX += colWidths[1];
      
      // GR No
      pdf.text((detail.grno || 'N/A').substring(0, 10), currentX, yPosition + 4);
      currentX += colWidths[2];
      
      // Consignor
      pdf.text((detail.consignor || 'N/A').substring(0, 15), currentX, yPosition + 4);
      currentX += colWidths[3];
      
      // Consignee
      pdf.text((detail.consignee || 'N/A').substring(0, 15), currentX, yPosition + 4);
      currentX += colWidths[4];
      
      // City
      pdf.text((detail.city || 'N/A').substring(0, 12), currentX, yPosition + 4);
      currentX += colWidths[5];
      
      // Private Marks (moved after city)
      pdf.text((detail.pvt_marks || '-').substring(0, 8), currentX, yPosition + 4);
      currentX += colWidths[6];
      
      // Packages
      const pkgs = parseInt(detail.no_of_pckg || 0);
      totalPackages += pkgs;
      pdf.text(pkgs.toString(), currentX, yPosition + 4);
      currentX += colWidths[7];
      
      // Weight
      const wt = parseFloat(detail.wt || 0);
      totalWeight += wt;
      pdf.text(wt.toFixed(1), currentX, yPosition + 4);
      currentX += colWidths[8];
      
      // Delivery Type
      const delType = detail.delivery_type || 'N/A';
      const delText = delType === 'door-delivery' ? 'DD' : delType === 'godown' ? 'GD' : delType.substring(0, 3).toUpperCase();
      pdf.text(delText, currentX, yPosition + 4);
      currentX += colWidths[9];
      
      // Payment Mode
      const payMode = detail.pay_mode || 'N/A';
      const payText = payMode === 'to-pay' ? 'ToPay' : payMode === 'paid' ? 'Paid' : payMode.substring(0, 5);
      pdf.text(payText, currentX, yPosition + 4);
      currentX += colWidths[10];
      
      // Freight
      const freight = parseFloat(detail.freight_amount || 0);
      totalFreight += freight;
      pdf.text(formatCurrency(freight), currentX, yPosition + 4);
      currentX += colWidths[11];
      
      // Labour
      const labour = parseFloat(detail.labour_charge || 0);
      totalLabour += labour;
      pdf.text(formatCurrency(labour), currentX, yPosition + 4);
      currentX += colWidths[12];
      
      // Bill Charge
      const billCharge = parseFloat(detail.bill_charge || 0);
      totalBillCharge += billCharge;
      pdf.text(formatCurrency(billCharge), currentX, yPosition + 4);
      currentX += colWidths[13];
      
      // Toll
      const toll = parseFloat(detail.toll_charge || 0);
      totalToll += toll;
      pdf.text(formatCurrency(toll), currentX, yPosition + 4);
      currentX += colWidths[14];
      
      // DD Charge
      const dd = parseFloat(detail.dd_charge || 0);
      totalDD += dd;
      pdf.text(formatCurrency(dd), currentX, yPosition + 4);
      currentX += colWidths[15];
      
      // Bilty Total
      const biltyTotal = parseFloat(detail.bilty_total || 0);
      totalBiltyAmount += biltyTotal;
      pdf.text(formatCurrency(biltyTotal), currentX, yPosition + 4);

      // Row border
      pdf.rect(tableStartX, yPosition, totalWidth, rowHeight, 'S');
      drawColumnDividers(tableStartX, yPosition, rowHeight, colWidths);
      
      yPosition += rowHeight;
      serialNumber++;
    });

    // Total Row
    pdf.setFont('times', 'bold');
    pdf.setFillColor(summaryFillColor.r, summaryFillColor.g, summaryFillColor.b);
    pdf.rect(tableStartX, yPosition, totalWidth, rowHeight, 'FD');
    drawColumnDividers(tableStartX, yPosition, rowHeight, colWidths);
    
    currentX = tableStartX + 1;
    pdf.text('TOTAL', currentX, yPosition + 4);
    currentX += colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + colWidths[6];
    
    // Total Packages
    pdf.text(totalPackages.toString(), currentX, yPosition + 4);
    currentX += colWidths[7];
    
    // Total Weight
    pdf.text(totalWeight.toFixed(1), currentX, yPosition + 4);
    currentX += colWidths[8] + colWidths[9] + colWidths[10];
    
    // Total Freight
    pdf.text(formatCurrency(totalFreight), currentX, yPosition + 4);
    currentX += colWidths[11];
    
    // Total Labour
    pdf.text(formatCurrency(totalLabour), currentX, yPosition + 4);
    currentX += colWidths[12];
    
    // Total Bill Charge
    pdf.text(formatCurrency(totalBillCharge), currentX, yPosition + 4);
    currentX += colWidths[13];
    
    // Total Toll
    pdf.text(formatCurrency(totalToll), currentX, yPosition + 4);
    currentX += colWidths[14];
    
    // Total DD
    pdf.text(formatCurrency(totalDD), currentX, yPosition + 4);
    currentX += colWidths[15];
    
    // Grand Total
    pdf.text(formatCurrency(totalBiltyAmount), currentX, yPosition + 4);

    yPosition += rowHeight + 8;

    // Summary Section
    if (yPosition > maxPageHeight - 60) {
      pdf.addPage();
      drawPageBorder();
      yPosition = 15;
    }

    // Calculate paid/to-pay
    let paidAmount = 0;
    let toPayAmount = 0;
    billDetails.forEach(detail => {
      const amount = parseFloat(detail.bilty_total || 0);
      if (detail.pay_mode?.toLowerCase() === 'paid') {
        paidAmount += amount;
      } else if (detail.pay_mode?.toLowerCase() === 'to-pay') {
        toPayAmount += amount;
      }
    });

    // Summary Box (smaller)
    const summaryBoxX = tableStartX;
    const summaryBoxY = yPosition;
    const summaryBoxWidth = 85;
    const summaryBoxHeight = 42;

    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight);

    pdf.setFillColor(summaryFillColor.r, summaryFillColor.g, summaryFillColor.b);
    pdf.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, 8, 'F');
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('BILL SUMMARY', summaryBoxX + summaryBoxWidth / 2, summaryBoxY + 5.5, { align: 'center' });

    pdf.setFontSize(9);
    let summaryY = summaryBoxY + 14;

    pdf.text('Total Bilties:', summaryBoxX + 4, summaryY);
    pdf.text(billDetails.length.toString(), summaryBoxX + summaryBoxWidth - 4, summaryY, { align: 'right' });

    summaryY += 8;
    pdf.text('Grand Total:', summaryBoxX + 4, summaryY);
    pdf.text('Rs.' + formatCurrency(totalBiltyAmount), summaryBoxX + summaryBoxWidth - 4, summaryY, { align: 'right' });

    summaryY += 8;
    pdf.text('Paid Amount:', summaryBoxX + 4, summaryY);
    pdf.text('Rs.' + formatCurrency(paidAmount), summaryBoxX + summaryBoxWidth - 4, summaryY, { align: 'right' });

    summaryY += 8;
    pdf.text('To Pay Amount:', summaryBoxX + 4, summaryY);
    pdf.text('Rs.' + formatCurrency(toPayAmount), summaryBoxX + summaryBoxWidth - 4, summaryY, { align: 'right' });

    // Bank Account Details
    const bankBoxY = summaryBoxY + summaryBoxHeight + 8;
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    pdf.text('BANK ACCOUNT DETAILS', summaryBoxX, bankBoxY);
    
    pdf.setFontSize(8);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text('PNB BANK - A/C No: 0010002100076368 | IFSC: PUNB0001000', summaryBoxX, bankBoxY + 6);
    pdf.text('AXIS BANK - A/C No: 923020052306488 | IFSC: UTIB0001837', summaryBoxX, bankBoxY + 12);

    // Signature Boxes (smaller)
    const sealBoxX = summaryBoxX;
    const sealBoxY = bankBoxY + 20;
    const sealBoxWidth = (contentWidth / 2) - 5;
    const sealBoxHeight = 32;

    pdf.rect(sealBoxX, sealBoxY, sealBoxWidth, sealBoxHeight);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(9);
    pdf.text('Company Seal & Signature', sealBoxX + sealBoxWidth / 2, sealBoxY + sealBoxHeight - 6, { align: 'center' });

    const ownerBoxX = sealBoxX + sealBoxWidth + 10;
    pdf.rect(ownerBoxX, sealBoxY, sealBoxWidth, sealBoxHeight);
    pdf.setFontSize(10);
    pdf.text('Rajeev Singh', ownerBoxX + sealBoxWidth / 2, sealBoxY + 10, { align: 'center' });
    pdf.setFont('times', 'normal');
    pdf.setFontSize(8);
    pdf.text('Owner - S S TRANSPORT CORPORATION', ownerBoxX + sealBoxWidth / 2, sealBoxY + 17, { align: 'center' });
    pdf.text('Mobile: 8077834769', ownerBoxX + sealBoxWidth / 2, sealBoxY + 23, { align: 'center' });

    // Page numbers and footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      if (i === 1 && logoDataUrl) {
        pdf.addImage(logoDataUrl, 'PNG', 8, 15, 30, 20);
      }
      
      pdf.setFontSize(9);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Page ' + i + ' of ' + pageCount, pageWidth - 25, 12);
      
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text('Thank you for your business!', pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);

    console.log('Bill Master PDF generated successfully!');
    
    if (returnBlob) {
      return { url, blob: pdfBlob };
    }
    return url;
    
  } catch (error) {
    console.error('Error generating Bill Master PDF:', error);
    throw error;
  }
};
