'use client';

import { jsPDF } from 'jspdf';

export const generatePortraitBillPDF = async (selectedBilties, cities, filterDates, billOptions) => {
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

    console.log('Starting Portrait PDF generation for bilties:', selectedBilties.length);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 5;
    const contentWidth = pageWidth - (2 * margin);
    let yPosition = 15;

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
    yPosition += 8;

    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    const billTypeLabel = billOptions?.customName || 
      (billOptions?.billType === 'consignor' ? 'CONSIGNOR' : 
       billOptions?.billType === 'consignee' ? 'CONSIGNEE' : 'TRANSPORT');
    pdf.text(`Monthly ${billTypeLabel} Statement`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

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
      totalTableWidth * 0.07,  // S.No (7%)
      totalTableWidth * 0.12,  // Date (12%)
      totalTableWidth * 0.13,  // GR No (13%)
      totalTableWidth * 0.23,  // Consignee (23%)
      totalTableWidth * 0.20,  // City (20%)
      totalTableWidth * 0.13,  // Pvt Marks (13%)
      totalTableWidth * 0.12   // Amount (12%)
    ];

    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.setFillColor(200, 200, 200);
    pdf.rect(tableStartX, tableStartY, colWidths.reduce((a, b) => a + b, 0), 8, 'F');

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
        yPosition = 10;
        
        // Re-add header on new page (no logo on subsequent pages)
        pdf.setFontSize(9);
        pdf.setFont('times', 'bold');
        pdf.setFillColor(200, 200, 200);
        pdf.rect(tableStartX, yPosition, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
        
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
      
      const amount = formatCurrency(bilty.total || bilty.amount);
      pdf.text(amount, currentX, yPosition + 5);

      pdf.rect(tableStartX, yPosition, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'S');
      
      yPosition += rowHeight;
      serialNumber++;
    });

    yPosition += 3;
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('Total Amount:', tableStartX + 2, yPosition + 5);
    pdf.text(formatCurrency(totals.totalAmount), tableStartX + 150, yPosition + 5);

    // Signature Section
    yPosition += 15;
    if (yPosition > maxPageHeight - 30) {
      pdf.addPage();
      yPosition = 15;
    }
    
    pdf.setFont('times', 'normal');
    pdf.setFontSize(10);
    
    // Signature line and name
    const signatureX = pageWidth - 70;
    pdf.line(signatureX, yPosition, signatureX + 50, yPosition);
    yPosition += 6;
    pdf.setFont('times', 'bold');
    pdf.text('Rajeev Singh', signatureX + 25, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    pdf.text('Authorized Signatory', signatureX + 25, yPosition, { align: 'center' });

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

    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    
    console.log('Portrait PDF generated successfully!');
    return url;
    
  } catch (error) {
    console.error('Error in Portrait PDF generation:', error);
    throw error;
  }
};
