'use client';

import { jsPDF } from 'jspdf';

export const generateLandscapeBillPDF = async (selectedBilties, cities, filterDates, billOptions) => {
  try {
    if (!selectedBilties || selectedBilties.length === 0) {
      throw new Error('No bilties selected for PDF generation');
    }

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

    console.log('Starting Landscape PDF generation for bilties:', selectedBilties.length);
    
    const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 5;
    const contentWidth = pageWidth - (2 * margin);
    let yPosition = 15;

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
    pdf.setTextColor(0, 0, 0);
    pdf.text('S S TRANSPORT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;

    // Address
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.text('Gandhi Park, GT. ROAD, ALIGARH-202001', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;

    // Contact info
    pdf.setFontSize(9);
    pdf.text('Phone: 9414081901, 9252253901 | Customer Care: 9690293140', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.text('GST No: 08AALPN9411A1ZL', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;

    // Monthly Statement Title
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    const billTypeLabel = billOptions?.customName || 
      (billOptions?.billType === 'consignor' ? 'CONSIGNOR' : 
       billOptions?.billType === 'consignee' ? 'CONSIGNEE' : 'TRANSPORT');
    pdf.text(`Monthly ${billTypeLabel} Statement`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Period
    const fromDate = filterDates?.dateFrom ? new Date(filterDates.dateFrom).toLocaleDateString('en-IN') : 
      (selectedBilties[0]?.bilty_date ? formatDate(selectedBilties[0].bilty_date) : 'N/A');
    const toDate = filterDates?.dateTo ? new Date(filterDates.dateTo).toLocaleDateString('en-IN') : 
      (selectedBilties[selectedBilties.length - 1]?.bilty_date ? formatDate(selectedBilties[selectedBilties.length - 1].bilty_date) : 'N/A');
    
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.text(`Period: ${fromDate} to ${toDate}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Table Headers (Landscape - with Consignor AND Private Marks columns)
    const tableStartY = yPosition;
    // Dynamic column widths based on content width
    const tableStartX = margin;
    const totalTableWidth = contentWidth;
    const colWidths = [
      totalTableWidth * 0.05,  // S.No (5%)
      totalTableWidth * 0.08,  // Date (8%)
      totalTableWidth * 0.10,  // GR No (10%)
      totalTableWidth * 0.20,  // Consignor (20%)
      totalTableWidth * 0.20,  // Consignee (20%)
      totalTableWidth * 0.17,  // City (17%)
      totalTableWidth * 0.10,  // Pvt Marks (10%)
      totalTableWidth * 0.10   // Amount (10%)
    ];

    pdf.setFontSize(8);
    pdf.setFont('times', 'bold');
    pdf.setFillColor(200, 200, 200);
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    pdf.rect(tableStartX, tableStartY, totalWidth, 8, 'F');

    let currentX = tableStartX + 2;
    pdf.text('S.No', currentX, tableStartY + 6);
    currentX += colWidths[0];
    pdf.text('Date', currentX, tableStartY + 6);
    currentX += colWidths[1];
    pdf.text('GR No', currentX, tableStartY + 6);
    currentX += colWidths[2];
    pdf.text('Consignor', currentX, tableStartY + 6);
    currentX += colWidths[3];
    pdf.text('Consignee', currentX, tableStartY + 6);
    currentX += colWidths[4];
    pdf.text('City', currentX, tableStartY + 6);
    currentX += colWidths[5];
    pdf.text('Pvt Marks', currentX, tableStartY + 6);
    currentX += colWidths[6];
    pdf.text('Amount', currentX, tableStartY + 6);

    yPosition = tableStartY + 8;

    // Table Rows
    const totals = calculateTotals();
    let serialNumber = 1;
    const rowHeight = 7;
    const maxPageHeight = pageHeight - 25;

    pdf.setFont('times', 'normal');

    selectedBilties.forEach((bilty) => {
      if (yPosition > maxPageHeight) {
        pdf.addPage();
        yPosition = 10;
        
        // Re-add header on new page (no logo on subsequent pages)
        pdf.setFontSize(8);
        pdf.setFont('times', 'bold');
        pdf.setFillColor(200, 200, 200);
        pdf.rect(tableStartX, yPosition, totalWidth, 8, 'F');
        
        currentX = tableStartX + 2;
        pdf.text('S.No', currentX, yPosition + 6);
        currentX += colWidths[0];
        pdf.text('Date', currentX, yPosition + 6);
        currentX += colWidths[1];
        pdf.text('GR No', currentX, yPosition + 6);
        currentX += colWidths[2];
        pdf.text('Consignor', currentX, yPosition + 6);
        currentX += colWidths[3];
        pdf.text('Consignee', currentX, yPosition + 6);
        currentX += colWidths[4];
        pdf.text('City', currentX, yPosition + 6);
        currentX += colWidths[5];
        pdf.text('Pvt Marks', currentX, yPosition + 6);
        currentX += colWidths[6];
        pdf.text('Amount', currentX, yPosition + 6);
        
        yPosition += 8;
        pdf.setFont('times', 'normal');
      }

      currentX = tableStartX + 2;
      
      // S.No
      pdf.text(serialNumber.toString(), currentX, yPosition + 5);
      currentX += colWidths[0];
      
      // Date
      const date = formatDate(bilty.bilty_date || bilty.created_at);
      pdf.text(date, currentX, yPosition + 5);
      currentX += colWidths[1];
      
      // GR No
      pdf.text(bilty.gr_no || 'N/A', currentX, yPosition + 5);
      currentX += colWidths[2];
      
      // Consignor
      const consignor = bilty.consignor_name || bilty.consignor || 'N/A';
      pdf.text(consignor.substring(0, 22), currentX, yPosition + 5);
      currentX += colWidths[3];
      
      // Consignee
      const consignee = bilty.consignee_name || bilty.consignee || 'N/A';
      pdf.text(consignee.substring(0, 18), currentX, yPosition + 5);
      currentX += colWidths[4];
      
      // City
      const city = bilty.to_city_name || bilty.station_city_name || getCityName(bilty.to_city) || 'N/A';
      pdf.text(city.substring(0, 20), currentX, yPosition + 5);
      currentX += colWidths[5];
      
      // Private Marks (NEW COLUMN)
      const pvtMarks = bilty.pvt_marks || bilty.private_marks || '-';
      pdf.text(pvtMarks.substring(0, 10), currentX, yPosition + 5);
      currentX += colWidths[6];
      
      // Amount
      const amount = formatCurrency(bilty.total || bilty.amount);
      pdf.text(amount, currentX, yPosition + 5);

      // Row border
      pdf.rect(tableStartX, yPosition, totalWidth, rowHeight, 'S');
      
      yPosition += rowHeight;
      serialNumber++;
    });

    // Total Row
    yPosition += 3;
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('Total Amount:', tableStartX + totalWidth - 50, yPosition + 5);
    pdf.text(formatCurrency(totals.totalAmount), tableStartX + totalWidth - 20, yPosition + 5);

    // Signature Section
    yPosition += 15;
    if (yPosition > maxPageHeight - 30) {
      pdf.addPage();
      yPosition = 15;
    }
    
    pdf.setFont('times', 'normal');
    pdf.setFontSize(10);
    
    // Signature line and name
    const signatureX = tableStartX + totalWidth - 60;
    pdf.line(signatureX, yPosition, signatureX + 50, yPosition);
    yPosition += 6;
    pdf.setFont('times', 'bold');
    pdf.text('Rajeev Singh', signatureX + 25, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    pdf.text('Authorized Signatory', signatureX + 25, yPosition, { align: 'center' });

    // Add page numbers and logo only on first page
    const pageCount = pdf.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Add logo only on first page
      if (i === 1 && logoDataUrl) {
        pdf.addImage(logoDataUrl, 'PNG', 8, 15, 30, 20);
      }
      
      pdf.setFontSize(9);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Page ' + i + ' of ' + pageCount, pageWidth - 25, 12);
    }

    // Generate PDF
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);

    console.log('Landscape PDF generated successfully!');
    return url;
    
  } catch (error) {
    console.error('Error generating landscape PDF:', error);
    throw error;
  }
};
