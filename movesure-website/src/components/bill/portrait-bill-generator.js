'use client';

import { jsPDF } from 'jspdf';

export const generatePortraitBillPDF = async (selectedBilties, cities, filterDates, billOptions, returnBlob = false) => {
  try {
    if (!selectedBilties || selectedBilties.length === 0) {
      throw new Error('No bilties selected for PDF generation');
    }

    const primaryColor = { r: 13, g: 71, b: 161 };

    const getCityName = (cityId) => {
      const city = cities?.find(c => c.id?.toString() === cityId?.toString());
      return city ? city.city_name : 'N/A';
    };

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

    const calculateTotals = () => {
      let totalAmount = 0;
      let paidAmount = 0;
      let toPayAmount = 0;

      selectedBilties.forEach(bilty => {
        const amount = parseFloat(bilty.total || bilty.amount || 0);
        totalAmount += amount;
        
        const paymentStatus = bilty.payment_mode || bilty.payment_status || '';
        
        if (paymentStatus.toLowerCase() === 'paid') {
          paidAmount += amount;
        } else if (paymentStatus.toLowerCase() === 'to-pay') {
          toPayAmount += amount;
        }
      });

      return { totalAmount, paidAmount, toPayAmount };
    };

    console.log('Starting Portrait PDF generation for bilties:', selectedBilties.length);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
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
      console.log('Logo not loaded');
    }

    if (!logoDataUrl) {
      pdf.setFontSize(8);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(200, 200, 200);
      pdf.text('LOGO', 23, 26, { align: 'center' });
    }

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

    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    pdf.text('Monthly Consignment Statement', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;

    const billTypeLabel = billOptions?.customName || 
      (billOptions?.billType === 'consignor' ? 'CONSIGNOR' : 
       billOptions?.billType === 'consignee' ? 'CONSIGNEE' : 'TRANSPORT');

    pdf.setFontSize(11);
    pdf.text(`Bill Type: ${billTypeLabel}`, pageWidth / 2, yPosition, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    yPosition += 10;

    const fromDate = filterDates?.dateFrom ? new Date(filterDates.dateFrom).toLocaleDateString('en-IN') : 
      (selectedBilties[0]?.bilty_date ? formatDate(selectedBilties[0].bilty_date) : 'N/A');
    const toDate = filterDates?.dateTo ? new Date(filterDates.dateTo).toLocaleDateString('en-IN') : 
      (selectedBilties[selectedBilties.length - 1]?.bilty_date ? formatDate(selectedBilties[selectedBilties.length - 1].bilty_date) : 'N/A');
    
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.text(`Period: ${fromDate} to ${toDate}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    const tableStartY = yPosition;
    // Dynamic column widths based on content width
    const tableStartX = margin;
    const totalTableWidth = contentWidth;
    const colWidths = [
      totalTableWidth * 0.06,  // S.No (6%)
      totalTableWidth * 0.11,  // Date (11%)
      totalTableWidth * 0.12,  // GR No (12%)
      totalTableWidth * 0.21,  // Consignee (21%)
      totalTableWidth * 0.18,  // City (18%)
      totalTableWidth * 0.12,  // Pvt Marks (12%)
      totalTableWidth * 0.09,  // No. of Pkg (9%)
      totalTableWidth * 0.11   // Amount (11%)
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

    const headerFillColor = { r: 220, g: 233, b: 255 };
    const summaryFillColor = { r: 235, g: 242, b: 255 };

    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.setFillColor(headerFillColor.r, headerFillColor.g, headerFillColor.b);
    pdf.rect(tableStartX, tableStartY, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
    drawColumnDividers(tableStartX, tableStartY, 8, colWidths);

    let currentX = tableStartX + 2;
    pdf.text('S.No', currentX, tableStartY + 6);
    currentX += colWidths[0];
    pdf.text('Date', currentX, tableStartY + 6);
    currentX += colWidths[1];
    pdf.text('GR No', currentX, tableStartY + 6);
    currentX += colWidths[2];
    pdf.text('Consignee', currentX, tableStartY + 6);
    currentX += colWidths[3];
    pdf.text('City', currentX, tableStartY + 6);
    currentX += colWidths[4];
    pdf.text('Pvt Marks', currentX, tableStartY + 6);
    currentX += colWidths[5];
    pdf.text('No. Pkg', currentX, tableStartY + 6);
    currentX += colWidths[6];
    pdf.text('Amount', currentX, tableStartY + 6);

    yPosition = tableStartY + 8;

    const totals = calculateTotals();
    let serialNumber = 1;
    const rowHeight = 7;
    const maxPageHeight = pageHeight - 30;

    pdf.setFont('times', 'normal');

    selectedBilties.forEach((bilty) => {
      if (yPosition > maxPageHeight) {
  pdf.addPage();
  drawPageBorder();
        yPosition = 10;
        
        // Re-add header on new page (no logo on subsequent pages)
  pdf.setFontSize(9);
  pdf.setFont('times', 'bold');
  pdf.setFillColor(headerFillColor.r, headerFillColor.g, headerFillColor.b);
        pdf.rect(tableStartX, yPosition, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
  drawColumnDividers(tableStartX, yPosition, 8, colWidths);
        
        currentX = tableStartX + 2;
        pdf.text('S.No', currentX, yPosition + 6);
        currentX += colWidths[0];
        pdf.text('Date', currentX, yPosition + 6);
        currentX += colWidths[1];
        pdf.text('GR No', currentX, yPosition + 6);
        currentX += colWidths[2];
        pdf.text('Consignee', currentX, yPosition + 6);
        currentX += colWidths[3];
        pdf.text('City', currentX, yPosition + 6);
        currentX += colWidths[4];
        pdf.text('Pvt Marks', currentX, yPosition + 6);
        currentX += colWidths[5];
        pdf.text('No. Pkg', currentX, yPosition + 6);
        currentX += colWidths[6];
        pdf.text('Amount', currentX, yPosition + 6);
        
        yPosition += 8;
        pdf.setFont('times', 'normal');
      }

      currentX = tableStartX + 2;
      
      pdf.text(serialNumber.toString(), currentX, yPosition + 5);
      currentX += colWidths[0];
      
      const date = formatDate(bilty.bilty_date || bilty.created_at);
      pdf.text(date, currentX, yPosition + 5);
      currentX += colWidths[1];
      
      pdf.text(bilty.gr_no || 'N/A', currentX, yPosition + 5);
      currentX += colWidths[2];
      
      const consignee = bilty.consignee_name || bilty.consignee || 'N/A';
      pdf.text(consignee.substring(0, 18), currentX, yPosition + 5);
      currentX += colWidths[3];
      
      const city = bilty.to_city_name || bilty.station_city_name || getCityName(bilty.to_city) || 'N/A';
      pdf.text(city.substring(0, 15), currentX, yPosition + 5);
      currentX += colWidths[4];
      
      const pvtMarks = bilty.pvt_marks || bilty.private_marks || '-';
      pdf.text(pvtMarks.substring(0, 10), currentX, yPosition + 5);
      currentX += colWidths[5];
      
      const noPkg = (bilty.no_of_pkg || bilty.no_of_packets || '0').toString();
      pdf.text(noPkg, currentX, yPosition + 5);
      currentX += colWidths[6];
      
      const amount = formatCurrency(bilty.total || bilty.amount);
      pdf.text(amount, currentX, yPosition + 5);

  pdf.rect(tableStartX, yPosition, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'S');
  drawColumnDividers(tableStartX, yPosition, rowHeight, colWidths);
      
  yPosition += rowHeight;
      serialNumber++;
    });

    // Check if we need a new page for summary
    yPosition += 5;
    if (yPosition > maxPageHeight - 80) {
      pdf.addPage();
      yPosition = 15;
    }

    // Summary Box (Centered)
    const summaryBoxWidth = 100;
    const summaryBoxX = (pageWidth - summaryBoxWidth) / 2;
    const summaryBoxY = yPosition;
    const summaryBoxHeight = 55;

    // Draw summary box with border
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight);

    // Summary Title
  pdf.setFillColor(summaryFillColor.r, summaryFillColor.g, summaryFillColor.b);
    pdf.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, 10, 'F');
    pdf.setFont('times', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text('CONSIGNMENT SUMMARY', summaryBoxX + summaryBoxWidth / 2, summaryBoxY + 7, { align: 'center' });

    // Summary Content
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    let summaryY = summaryBoxY + 18;

    pdf.text('Total Consignments:', summaryBoxX + 5, summaryY);
    pdf.text(selectedBilties.length.toString(), summaryBoxX + summaryBoxWidth - 5, summaryY, { align: 'right' });

    summaryY += 10;
    pdf.text('Total Amount:', summaryBoxX + 5, summaryY);
    pdf.text('Rs.' + formatCurrency(totals.totalAmount), summaryBoxX + summaryBoxWidth - 5, summaryY, { align: 'right' });

    summaryY += 10;
    pdf.text('Paid Amount:', summaryBoxX + 5, summaryY);
    pdf.text('Rs.' + formatCurrency(totals.paidAmount), summaryBoxX + summaryBoxWidth - 5, summaryY, { align: 'right' });

    summaryY += 10;
    pdf.text('To Pay Amount:', summaryBoxX + 5, summaryY);
    pdf.text('Rs.' + formatCurrency(totals.toPayAmount), summaryBoxX + summaryBoxWidth - 5, summaryY, { align: 'right' });

    // Signature Section
    yPosition = summaryBoxY + summaryBoxHeight + 10;

    // Company Seal & Signature Box (Left side)
    const sealBoxX = margin + 5;
    const sealBoxY = yPosition;
    const boxWidth = (contentWidth / 2) - 10;
    const boxHeight = 40;

    pdf.rect(sealBoxX, sealBoxY, boxWidth, boxHeight);
    
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('Company Seal & Signature', sealBoxX + boxWidth / 2, sealBoxY + boxHeight - 8, { align: 'center' });

    // Owner Signature Box (Right side)
    const ownerBoxX = sealBoxX + boxWidth + 10;
    const ownerBoxY = sealBoxY;

    pdf.rect(ownerBoxX, ownerBoxY, boxWidth, boxHeight);
    
    pdf.setFont('times', 'bold');
    pdf.setFontSize(11);
    pdf.text('Rajeev Singh', ownerBoxX + boxWidth / 2, ownerBoxY + 12, { align: 'center' });
    
    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    pdf.text('Owner - S S TRANSPORT CORPORATION', ownerBoxX + boxWidth / 2, ownerBoxY + 20, { align: 'center' });
    pdf.text('Mobile: 8077834769', ownerBoxX + boxWidth / 2, ownerBoxY + 27, { align: 'center' });

    const pageCount = pdf.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Add logo only on first page
      if (i === 1 && logoDataUrl) {
        pdf.addImage(logoDataUrl, 'PNG', 8, 15, 30, 20);
      }
      
      // Page number
      pdf.setFontSize(9);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Page ' + i + ' of ' + pageCount, pageWidth - 25, 12);
      
      // Footer text
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text('Thank you for your business!', pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    
    console.log('Portrait PDF generated successfully!');
    
    if (returnBlob) {
      return { url, blob: pdfBlob };
    }
    return url;
    
  } catch (error) {
    console.error('Error in Portrait PDF generation:', error);
    throw error;
  }
};
