'use client';

import { jsPDF } from 'jspdf';
import { buildColumnConfig, calculateBillTotals } from './pdf-column-builder';
import { DEFAULT_SELECTED_COLUMNS } from './print-column-selector';

export const generateBillMasterPDF = async (billMaster, billDetails, returnBlob = false, selectedColumns = DEFAULT_SELECTED_COLUMNS) => {
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

      // Display only non-zero rates from bulk rates
      pdf.setFontSize(9);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 0, 0);
      
      // Show Labour Rate Per Package (if > 0)
      const labourRatePerPackage = bulkRates.labourRatePerPackage || 0;
      if (labourRatePerPackage > 0) {
        pdf.text(`Labour Rate (Per Package): Rs.${labourRatePerPackage}`, margin + 5, yPosition);
        yPosition += 5;
      }
      
      // Show Labour Rate Per KG (if > 0)
      const labourRatePerKg = bulkRates.labourRatePerKg || 0;
      if (labourRatePerKg > 0) {
        pdf.text(`Labour Rate (Per KG): Rs.${labourRatePerKg}`, margin + 5, yPosition);
        yPosition += 5;
      }
      
      // Show Bill Charge per Bilty (if > 0)
      const billCharge = bulkRates.billChargePerBilty || 0;
      if (billCharge > 0) {
        pdf.text(`Bill Charge: Rs.${billCharge} per bilty`, margin + 5, yPosition);
        yPosition += 5;
      }
      
      // Show Toll Charge per Bilty (if > 0)
      const tollCharge = bulkRates.tollChargePerBilty || 0;
      if (tollCharge > 0) {
        pdf.text(`Toll Charge: Rs.${tollCharge} per bilty`, margin + 5, yPosition);
        yPosition += 5;
      }

      pdf.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      pdf.line(margin + 2, yPosition, pageWidth - margin - 2, yPosition);
      yPosition += 6;
    }

    // Table Headers
    const tableStartY = yPosition;
    const tableStartX = margin + 2;
    const totalTableWidth = contentWidth - 4;
    
    // Build column configuration based on selected columns
    const columnConfig = buildColumnConfig(selectedColumns, totalTableWidth);
    const { columnWidths: colWidths, headers, dataAccessors, totalCalculators } = columnConfig;

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

    billDetails.forEach((detail, detailIndex) => {
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
      
      // Render each column dynamically using data accessors
      dataAccessors.forEach((accessor, idx) => {
        const value = accessor(detail, detailIndex);
        pdf.text(value, currentX, yPosition + 4);
        currentX += colWidths[idx];
      });

      // Row border
      pdf.rect(tableStartX, yPosition, totalWidth, rowHeight, 'S');
      drawColumnDividers(tableStartX, yPosition, rowHeight, colWidths);
      
      yPosition += rowHeight;
      serialNumber++;
    });

    // Total Row - dynamically render using total calculators
    pdf.setFont('times', 'bold');
    pdf.setFillColor(summaryFillColor.r, summaryFillColor.g, summaryFillColor.b);
    pdf.rect(tableStartX, yPosition, totalWidth, rowHeight, 'FD');
    drawColumnDividers(tableStartX, yPosition, rowHeight, colWidths);
    
    currentX = tableStartX + 1;
    totalCalculators.forEach((calculator, idx) => {
      const value = calculator(billDetails);
      pdf.text(value, currentX, yPosition + 4);
      currentX += colWidths[idx];
    });

    yPosition += rowHeight + 8;

    // Summary Section
    if (yPosition > maxPageHeight - 60) {
      pdf.addPage();
      drawPageBorder();
      yPosition = 15;
    }

    // Calculate totals using the helper function
    const billTotals = calculateBillTotals(billDetails);

    // Get previous balance from metadata
    const previousBalance = parseFloat(billMaster.metadata?.previousBalance || 0);
    
    // Calculate other charges from metadata
    let otherChargesTotal = 0;
    const otherChargesArray = [];
    if (billMaster.metadata?.otherCharges && Array.isArray(billMaster.metadata.otherCharges)) {
      billMaster.metadata.otherCharges.forEach(charge => {
        const amount = parseFloat(charge.amount || 0);
        otherChargesTotal += amount;
        otherChargesArray.push({ name: charge.name, amount });
      });
    }
    
    const grandTotalWithPrevious = billTotals.total + previousBalance + otherChargesTotal;

    // Summary Box (adjusted for previous balance and other charges)
    const summaryBoxX = tableStartX;
    const summaryBoxY = yPosition;
    const summaryBoxWidth = 95;
    const summaryBoxHeight = 38 + (previousBalance > 0 ? 8 : 0) + (otherChargesArray.length > 0 ? (otherChargesArray.length * 7 + 18) : 0);

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

    summaryY += 7;
    pdf.text('Current Bill Total:', summaryBoxX + 4, summaryY);
    pdf.text('Rs.' + formatCurrency(billTotals.total), summaryBoxX + summaryBoxWidth - 4, summaryY, { align: 'right' });

    // Show previous balance if exists
    if (previousBalance > 0) {
      summaryY += 7;
      pdf.setTextColor(180, 83, 9); // Orange color for previous balance
      pdf.text('Previous Balance:', summaryBoxX + 4, summaryY);
      pdf.text('Rs.' + formatCurrency(previousBalance), summaryBoxX + summaryBoxWidth - 4, summaryY, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
    }

    // Show other charges if exist
    if (otherChargesArray.length > 0) {
      summaryY += 7;
      pdf.setFont('times', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(220, 38, 38); // Red color for additional charges header
      pdf.text('ADD. CHARGES:', summaryBoxX + 4, summaryY);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('times', 'normal');
      
      otherChargesArray.forEach((charge) => {
        summaryY += 6.5;
        pdf.setFontSize(8);
        pdf.text(charge.name + ':', summaryBoxX + 6, summaryY);
        pdf.text('Rs.' + formatCurrency(charge.amount), summaryBoxX + summaryBoxWidth - 4, summaryY, { align: 'right' });
      });
      
      summaryY += 7;
      pdf.setFont('times', 'bold');
      pdf.text('Total Add. Charges:', summaryBoxX + 4, summaryY);
      pdf.text('Rs.' + formatCurrency(otherChargesTotal), summaryBoxX + summaryBoxWidth - 4, summaryY, { align: 'right' });
      pdf.setFont('times', 'normal');
    }

    // Grand total
    summaryY += 8;
    pdf.setTextColor(220, 38, 38); // Red color for grand total
    pdf.setFont('times', 'bold');
    pdf.setFontSize(9);
    pdf.text('GRAND TOTAL:', summaryBoxX + 4, summaryY);
    pdf.text('Rs.' + formatCurrency(grandTotalWithPrevious), summaryBoxX + summaryBoxWidth - 4, summaryY, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('times', 'normal');

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
