'use client';

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { X, Printer, Download } from 'lucide-react';

// Base64 encoded logo - you can replace this with your actual logo's base64 string
// To convert your logo to base64: https://base64.guru/converter/encode/image
const LOGO_BASE64 = null; // Set this to your logo's base64 string if needed

// Helper function to get embedded logo
const getEmbeddedLogo = () => {
  // If you have a base64 logo, return it here
  if (LOGO_BASE64) {
    return LOGO_BASE64;
  }
  return null;
};

const BillGenerator = ({ selectedBilties = [], onClose, cities = [], filterDates = null }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  // Get city name by ID
  const getCityName = (cityId) => {
    const city = cities?.find(c => c.id?.toString() === cityId?.toString());
    return city ? city.city_name : 'N/A';
  };

  // Format currency - integer only, no decimals, no superscript
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '0';
    const num = Math.round(parseFloat(amount)); // Round to nearest integer
    return num.toString(); // Simple string conversion, no formatting
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch {
      return 'N/A';
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalAmount = 0;
    let paidAmount = 0;
    let toPayAmount = 0;

    selectedBilties.forEach(bilty => {
      // Handle both regular and station bilty amount fields
      const amount = parseFloat(bilty.total || bilty.amount || 0);
      totalAmount += amount;
      
      // Handle both payment_mode and payment_status fields
      const paymentStatus = bilty.payment_mode || bilty.payment_status || '';
      
      if (paymentStatus.toLowerCase() === 'paid') {
        paidAmount += amount;
      } else if (paymentStatus.toLowerCase() === 'to-pay') {
        toPayAmount += amount;
      }
    });

    return { totalAmount, paidAmount, toPayAmount };
  };

  const generateBillPDF = async () => {
    setIsGenerating(true);
    
    try {
      // Safety checks
      if (!selectedBilties || selectedBilties.length === 0) {
        throw new Error('No bilties selected for PDF generation');
      }

      console.log('Starting PDF generation for bilties:', selectedBilties.length);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      let yPosition = 15;

      // Page border
      pdf.setLineWidth(1);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');

      // Add logo on top left - use base64 embedded logo or fetch from public
      let logoAdded = false;
      try {
        // Method 1: Try to fetch logo from public folder
        const response = await fetch('/logo.png');
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          
          await new Promise((resolve, reject) => {
            reader.onload = function() {
              try {
                const logoDataUrl = reader.result;
                pdf.addImage(logoDataUrl, 'PNG', 8, 15, 30, 20); // Moved more left: x=8 instead of 15
                logoAdded = true;
                console.log('Logo loaded successfully from public folder');
                resolve();
              } catch (err) {
                console.log('Error processing logo:', err);
                reject(err);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.log('Logo fetch error:', error);
      }
      
      // Method 2: If logo not loaded, try with Image object
      if (!logoAdded) {
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            logoImg.onload = function() {
              try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = logoImg.width;
                canvas.height = logoImg.height;
                ctx.drawImage(logoImg, 0, 0);
                const logoDataUrl = canvas.toDataURL('image/png');
                pdf.addImage(logoDataUrl, 'PNG', 8, 15, 30, 20); // Moved more left: x=8 instead of 15
                logoAdded = true;
                console.log('Logo loaded successfully via Image object');
                resolve();
              } catch (err) {
                console.log('Error processing logo via Image:', err);
                reject(err);
              }
            };
            logoImg.onerror = () => {
              console.log('Logo not found at /logo.png');
              reject(new Error('Logo not found'));
            };
            logoImg.src = '/logo.png';
          });
        } catch (error) {
          console.log('Image object logo loading error:', error);
        }
      }
      
      // Fallback: Show placeholder if no logo loaded (no background, no border)
      if (!logoAdded) {
        pdf.setFontSize(8);
        pdf.setFont('times', 'normal');
        pdf.setTextColor(200, 200, 200); // Very light gray text
        pdf.text('LOGO', 23, 26, { align: 'center' }); // Adjusted position for moved logo
        console.log('Using logo placeholder - logo.png not found in public folder');
      }

      // Header - SS TRANSPORT CORPORATION with professional styling
      pdf.setFontSize(24);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 51, 102); // Professional dark blue
      pdf.text('SS TRANSPORT CORPORATION', pageWidth / 2, yPosition + 5, { align: 'center' });
      
      // GST Number below company name
      yPosition += 12;
      pdf.setFontSize(12);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text('GST NO: 09COVPS5556J1ZT', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 8;
      pdf.setFontSize(13);
      pdf.setTextColor(60, 60, 60);
      pdf.text('HO : DUBE PARAO, GT ROAD, ALIGARH-202001, INDIA', pageWidth / 2, yPosition, { align: 'center' });
      
      // Customer care and website below HO address
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Customer Care: +91-7668291228 | Website: console.movesure.io/sstransport', pageWidth / 2, yPosition, { align: 'center' });
      
      // Double horizontal line with professional styling
      yPosition += 15;
      pdf.setLineWidth(1.2);
      pdf.setDrawColor(0, 51, 102); // Professional dark blue
      pdf.line(10, yPosition, pageWidth - 10, yPosition);
      pdf.setLineWidth(0.4);
      pdf.setDrawColor(150, 150, 150);
      pdf.line(10, yPosition + 2, pageWidth - 10, yPosition + 2);
      yPosition += 15;

      // Monthly Consignment Statement Title with professional styling (smaller size)
      pdf.setFontSize(16); // Made smaller from 20
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 51, 102); // Professional dark blue
      pdf.text('MONTHLY CONSIGNMENT STATEMENT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6; // Reduced spacing
      
      pdf.setFontSize(11); // Made smaller from 12
      pdf.setFont('times', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text('Consignment Details for Payment Processing', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10; // Reduced spacing

      // Get first consignor name (since all bills are for one client)
      const firstBilty = selectedBilties[0];
      const consignorName = firstBilty.type === 'station' ? 
        (firstBilty.consignor || 'N/A') : 
        (firstBilty.consignor_name || 'N/A');

      // Consignor details box with professional styling
      pdf.setFillColor(245, 248, 252); // Light blue-gray background
      pdf.rect(15, yPosition - 3, pageWidth - 30, 22, 'F');
      pdf.setLineWidth(0.8);
      pdf.setDrawColor(0, 51, 102);
      pdf.rect(15, yPosition - 3, pageWidth - 30, 22, 'S');
      
      pdf.setFontSize(13);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 51, 102);
      pdf.text('CONSIGNOR: ', 20, yPosition + 6);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(40, 40, 40);
      pdf.text(consignorName, 55, yPosition + 6);
      
      // Date range with better formatting - Use filter dates if provided, otherwise use bilty dates
      let minDate, maxDate;
      
      if (filterDates && filterDates.dateFrom && filterDates.dateTo) {
        // Use filter dates from search filters
        minDate = new Date(filterDates.dateFrom);
        maxDate = new Date(filterDates.dateTo);
      } else {
        // Fallback to bilty dates
        const dates = selectedBilties.map(b => new Date(b.bilty_date || b.created_at)).filter(d => !isNaN(d));
        minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
        maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();
      }
      
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text('Statement Period: ' + minDate.toLocaleDateString('en-IN') + ' to ' + maxDate.toLocaleDateString('en-IN'), 20, yPosition + 14);
      
      const currentDate = new Date().toLocaleDateString('en-IN');
      const currentTime = new Date().toLocaleTimeString('en-IN');
      pdf.text('Generated: ' + currentDate + ' at ' + currentTime, pageWidth - 20, yPosition + 14, { align: 'right' });
      
      yPosition += 28;

      // Table data preparation (without consignor column)
      const tableData = selectedBilties.map((bilty, index) => {
        const consigneeName = bilty.type === 'station' ? (bilty.consignee || 'N/A') : (bilty.consignee_name || 'N/A');
        const destination = bilty.type === 'regular' ? getCityName(bilty.to_city_id) : (bilty.station_name || bilty.station || 'N/A');
        const amount = bilty.total || bilty.amount || 0;
        const date = bilty.bilty_date || bilty.created_at || bilty.date;
        const deliveryType = (bilty.delivery_type === 'door-delivery' || bilty.delivery_type === 'door') ? 'DD' : 'Godown';
        
        return [
          (index + 1).toString(),
          bilty.gr_no || 'N/A',
          formatDate(date),
          consigneeName,
          destination,
          deliveryType,
          (bilty.payment_mode || bilty.payment_status || 'N/A').toString().toUpperCase(),
          formatCurrency(amount), // Removed rupee symbol to avoid font issues
          bilty.pvt_marks || 'N/A'
        ];
      });

      // Table headers (without consignor) - with proper wrapping
      const tableHeaders = [
        'S.No',
        'GR Number',
        'Date',
        'Consignee',
        'Destination',
        'Delivery\nType',
        'Payment\nMode',
        'Amount\n(Rs.)',
        'Private\nMarks'
      ];

      // Compact table creation with smaller row heights for more rows per page
      const baseCellHeight = 8; // Reduced from 12 to 8 for smaller rows
      const cellPadding = 2; // Reduced from 3 to 2
      const startX = 10;
      const tableWidth = pageWidth - 20;
      const columnWidths = [10, 22, 18, 45, 30, 15, 18, 22, 12]; // Optimized column widths
      
      // Adjust column widths to fit page
      const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
      const scaleFactor = tableWidth / totalWidth;
      const adjustedWidths = columnWidths.map(w => w * scaleFactor);
      
      // Calculate dynamic row heights based on text wrapping needs
      const minRowHeight = 10; // Minimum row height
      const rowHeights = tableData.map((row) => {
        let maxHeight = minRowHeight;
        
        // Check consignee name (column 3) and destination (column 4) for wrapping
        [3, 4].forEach(colIndex => {
          const text = String(row[colIndex] || '');
          const maxWidth = adjustedWidths[colIndex] - (2 * cellPadding);
          
          pdf.setFontSize(8);
          const words = text.split(' ');
          let lines = 1;
          let currentLine = '';
          
          words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = pdf.getTextWidth(testLine);
            
            if (testWidth > maxWidth && currentLine) {
              lines++;
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          });
          
          const requiredHeight = Math.max(minRowHeight, lines * 4 + 2); // 4mm per line + padding
          maxHeight = Math.max(maxHeight, requiredHeight);
        });
        
        return Math.min(maxHeight, 20); // Cap at 20mm max height
      });
      
      // Draw table headers with compact professional styling
      pdf.setFillColor(0, 51, 102); // Professional dark blue
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9); // Reduced from 10 to 9
      pdf.setFont('times', 'bold');
      
      // Header background with border (use compact height for headers)
      const headerHeight = baseCellHeight + 2; // Reduced from +4 to +2
      pdf.rect(startX, yPosition, tableWidth, headerHeight, 'F');
      pdf.setLineWidth(0.8);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(startX, yPosition, tableWidth, headerHeight, 'S');
      
      // Header vertical borders
      let headerX = startX;
      adjustedWidths.forEach((width, index) => {
        if (index > 0) {
          pdf.setDrawColor(255, 255, 255);
          pdf.setLineWidth(0.3);
          pdf.line(headerX, yPosition, headerX, yPosition + headerHeight);
        }
        headerX += width;
      });
      
      // Header text with compact wrapping support
      headerX = startX;
      tableHeaders.forEach((header, index) => {
        const textX = headerX + adjustedWidths[index] / 2;
        const baseTextY = yPosition + headerHeight / 2;
        
        // Handle multi-line headers with compact spacing
        if (header.includes('\n')) {
          const lines = header.split('\n');
          const lineHeight = 2.5; // Reduced from 3 to 2.5
          const startY = baseTextY - ((lines.length - 1) * lineHeight / 2);
          
          lines.forEach((line, lineIndex) => {
            pdf.text(line, textX, startY + (lineIndex * lineHeight), { align: 'center' });
          });
        } else {
          pdf.text(header, textX, baseTextY + 1, { align: 'center' });
        }
        
        headerX += adjustedWidths[index];
      });
      
      yPosition += headerHeight;
      
      // Draw table data with compact rows for maximum density
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8); // Reduced from 9 to 8 for more compact rows
      pdf.setFont('times', 'normal');
      
      tableData.forEach((row, rowIndex) => {
        const currentRowHeight = rowHeights[rowIndex];
        
        // Check if we need a new page (optimized for 15+ rows per page)
        if (yPosition + currentRowHeight > pageHeight - 40) { // Reduced from 50 to 40 for more rows
          pdf.addPage();
          
          // Add logo to new page immediately (no background/border)
          pdf.setFontSize(8);
          pdf.setFont('times', 'normal');
          pdf.setTextColor(200, 200, 200); // Very light gray text
          pdf.text('LOGO', 23, 26, { align: 'center' }); // Adjusted position for moved logo
          
          // Add page border on new page
          pdf.setLineWidth(1);
          pdf.setDrawColor(0, 0, 0);
          pdf.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');
          
          // Reset PDF styling for table after logo
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(8); // Keep compact font size
          pdf.setFont('times', 'normal');
          
          yPosition = 45; // Start closer to top for more rows
        }
        
        // Alternate row colors
        if (rowIndex % 2 === 0) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(startX, yPosition, tableWidth, currentRowHeight, 'F');
        }
        
        // Row border
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.rect(startX, yPosition, tableWidth, currentRowHeight, 'S');
        
        // Cell vertical borders
        let cellX = startX;
        adjustedWidths.forEach((width, index) => {
          if (index > 0) {
            pdf.line(cellX, yPosition, cellX, yPosition + currentRowHeight);
          }
          cellX += width;
        });
        
        // Cell text with full name display using text wrapping
        cellX = startX;
        row.forEach((cell, cellIndex) => {
          let textX, align;
          
          // Enhanced alignment based on column
          if (cellIndex === 0 || cellIndex === 2 || cellIndex === 5) {
            // Center align for S.No, Date, Delivery Type
            align = 'center';
            textX = cellX + adjustedWidths[cellIndex] / 2;
          } else if (cellIndex === 7) { // Amount column
            // Right align for Amount
            align = 'right';
            textX = cellX + adjustedWidths[cellIndex] - cellPadding;
            pdf.setFont('times', 'bold'); // Bold for amounts
          } else {
            // Left align for names and other text
            align = 'left';
            textX = cellX + cellPadding;
          }
          
          // Full text display with wrapping for consignee (column 3) and destination (column 4)
          let displayText = String(cell || '');
          const maxWidth = adjustedWidths[cellIndex] - (2 * cellPadding);
          
          // Set font before measuring
          pdf.setFont(cellIndex === 7 ? 'times' : 'times', cellIndex === 7 ? 'bold' : 'normal');
          pdf.setFontSize(8);
          
          // For consignee (column 3) and destination (column 4) - use text wrapping to show full names
          if (cellIndex === 3 || cellIndex === 4) {
            const words = displayText.split(' ');
            const lines = [];
            let currentLine = '';
            
            words.forEach(word => {
              const testLine = currentLine + (currentLine ? ' ' : '') + word;
              const testWidth = pdf.getTextWidth(testLine);
              
              if (testWidth <= maxWidth) {
                currentLine = testLine;
              } else {
                if (currentLine) {
                  lines.push(currentLine);
                  currentLine = word;
                } else {
                  // Single word too long, keep it as is
                  lines.push(word);
                }
              }
            });
            
            if (currentLine) {
              lines.push(currentLine);
            }
            
            // Draw multiple lines for full name display
            const lineHeight = 4;
            const startY = yPosition + cellPadding + 2;
            lines.forEach((line, lineIndex) => {
              const lineY = startY + (lineIndex * lineHeight);
              if (lineY < yPosition + currentRowHeight - 2) { // Stay within row bounds
                pdf.text(line, textX, lineY, { align: align });
              }
            });
            
          } else {
            // For other columns, truncate only if absolutely necessary
            while (pdf.getTextWidth(displayText) > maxWidth && displayText.length > 5) {
              displayText = displayText.slice(0, -1);
            }
            if (displayText.length < String(cell || '').length && displayText.length > 3) {
              displayText = displayText.slice(0, -3) + '...';
            }
            
            // Draw single line text
            const textY = yPosition + currentRowHeight / 2 + 1.5;
            pdf.text(displayText, textX, textY, { align: align });
          }
          
          // Reset font for next cell
          if (cellIndex === 7) {
            pdf.setFont('times', 'normal');
          }
          
          cellX += adjustedWidths[cellIndex];
        });
        
        yPosition += currentRowHeight;
      });
      
      yPosition += 20;

      // Enhanced totals section
      const { totalAmount, paidAmount, toPayAmount } = calculateTotals();

      // Check if we need a new page for totals
      if (yPosition > pageHeight - 90) { // Reduced space needed for totals
        pdf.addPage();
        
        // Add logo to new page (no background/border)
        pdf.setFontSize(8);
        pdf.setFont('times', 'normal');
        pdf.setTextColor(200, 200, 200); // Very light gray text
        pdf.text('LOGO', 23, 26, { align: 'center' }); // Adjusted position for moved logo
        
        // Add page border on new page
        pdf.setLineWidth(1);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');
        
        // Reset PDF styling after logo
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(11);
        pdf.setFont('times', 'normal');
        
        yPosition = 55; // Start below larger logo
      }

      // Enhanced totals section with professional layout - positioned on left
      const totalsBoxWidth = 90; // Slightly increased width for better layout
      const totalsX = 20; // Left side positioning instead of right
      
      // Totals box with enhanced professional styling
      pdf.setFillColor(25, 25, 112); // Midnight blue background
      pdf.rect(totalsX - 3, yPosition - 5, totalsBoxWidth, 52, 'F');
      
      pdf.setFillColor(248, 250, 252); // Very light blue-gray
      pdf.rect(totalsX - 1, yPosition - 3, totalsBoxWidth - 4, 48, 'F');
      
      pdf.setLineWidth(1.2);
      pdf.setDrawColor(25, 25, 112); // Midnight blue border
      pdf.rect(totalsX - 3, yPosition - 5, totalsBoxWidth, 52, 'S');
      
      // Summary title with enhanced professional styling
      pdf.setFontSize(12);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(25, 25, 112); // Midnight blue text
      pdf.text('CONSIGNMENT SUMMARY', totalsX + totalsBoxWidth/2 - 2, yPosition + 6, { align: 'center' });
      
      // Add a decorative underline
      pdf.setLineWidth(0.8);
      pdf.setDrawColor(220, 53, 69); // Professional red accent
      pdf.line(totalsX + 8, yPosition + 8, totalsX + totalsBoxWidth - 12, yPosition + 8);
      
      yPosition += 14; // Adjusted spacing
      
      pdf.setFontSize(10);
      pdf.setTextColor(52, 58, 64); // Dark gray
      pdf.setFont('times', 'normal');
      pdf.text('Total Consignments: ', totalsX + 4, yPosition);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(25, 25, 112); // Midnight blue
      pdf.text(selectedBilties.length.toString(), totalsX + 42, yPosition);
      
      yPosition += 8;
      pdf.setFont('times', 'normal');
      pdf.setTextColor(52, 58, 64);
      pdf.text('Total Amount: ', totalsX + 4, yPosition);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(220, 53, 69); // Professional red
      pdf.text('Rs.' + formatCurrency(totalAmount), totalsX + 42, yPosition);
      
      yPosition += 8;
      pdf.setTextColor(52, 58, 64);
      pdf.setFont('times', 'normal');
      pdf.text('Paid Amount: ', totalsX + 4, yPosition);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(40, 167, 69); // Professional green
      pdf.text('Rs.' + formatCurrency(paidAmount), totalsX + 42, yPosition);
      
      yPosition += 8;
      pdf.setTextColor(52, 58, 64);
      pdf.setFont('times', 'normal');
      pdf.text('To Pay Amount: ', totalsX + 4, yPosition);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(255, 193, 7); // Professional amber
      pdf.text('Rs.' + formatCurrency(toPayAmount), totalsX + 42, yPosition);

      // Enhanced footer with professional styling
      const footerY = pageHeight - 55;
      
      // Footer separator with professional styling
      pdf.setLineWidth(1.2);
      pdf.setDrawColor(0, 51, 102);
      pdf.line(10, footerY - 10, pageWidth - 10, footerY - 10);
      
      // Footer content with professional layout
      pdf.setFontSize(11);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 51, 102);
      pdf.text('Authorized Signatory', 20, footerY);
      
      pdf.setFontSize(14);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 51, 102);
      pdf.text('RAJEEV SINGH', 20, footerY + 10);
      
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text('Owner - SS TRANSPORT CORPORATION', 20, footerY + 18);
      pdf.text('Mobile: +91-8077834769', 20, footerY + 25);
      
      // Company stamp area with professional styling
      pdf.setLineWidth(1);
      pdf.setDrawColor(0, 51, 102);
      pdf.rect(pageWidth - 85, footerY - 5, 75, 28, 'S');
      pdf.setFontSize(10);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 51, 102);
      pdf.text('Company Seal & Signature', pageWidth - 82, footerY + 12, { align: 'left' });

      // Enhanced page numbering with consistent logo on all pages
      const pageCount = pdf.internal.getNumberOfPages();
      
      // Store logo data for reuse across pages
      let logoDataUrl = null;
      if (logoAdded) {
        try {
          const response = await fetch('/logo.png');
          if (response.ok) {
            const blob = await response.blob();
            const reader = new FileReader();
            await new Promise((resolve) => {
              reader.onload = function() {
                logoDataUrl = reader.result;
                resolve();
              };
              reader.readAsDataURL(blob);
            });
          }
        } catch (e) {
          console.log('Could not fetch logo for all pages');
        }
      }
      
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        // Add logo to each page consistently
        if (logoDataUrl) {
          // Use actual logo (moved more left)
          pdf.addImage(logoDataUrl, 'PNG', 8, 15, 30, 20);
        } else {
          // Use placeholder with no background/border
          pdf.setFontSize(8);
          pdf.setFont('times', 'normal');
          pdf.setTextColor(200, 200, 200);
          pdf.text('LOGO', 23, 26, { align: 'center' });
        }
        
        // Page border on each page
        pdf.setLineWidth(1);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');
        
        // Enhanced page number
        pdf.setFontSize(9);
        pdf.setFont('times', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text('Page ' + i + ' of ' + pageCount, pageWidth - 25, 12);
      }

      // Generate PDF URL
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      
      console.log('PDF generated successfully!');
      
    } catch (error) {
      console.error('Detailed error in PDF generation:', error);
      console.error('Error stack:', error.stack);
      alert('Error generating PDF: ' + error.message + '. Please check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfUrl) return;
    
    // Get consignor name for filename
    const firstBilty = selectedBilties[0];
    const consignorName = firstBilty?.type === 'station' ? 
      (firstBilty.consignor || 'Unknown') : 
      (firstBilty.consignor_name || 'Unknown');
    
    // Clean consignor name for filename (remove spaces and special characters)
    const cleanConsignorName = consignorName.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Get current date
    const currentDate = new Date().toISOString().slice(0, 10);
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${cleanConsignorName}_${currentDate}_Statement.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    if (!pdfUrl) return;
    
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  useEffect(() => {
    if (selectedBilties.length > 0) {
      generateBillPDF();
    }
  }, [selectedBilties]);

  // Cleanup URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (selectedBilties.length === 0) {
    return null;
  }

  const { totalAmount, paidAmount, toPayAmount } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full h-full m-2 max-w-none overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Monthly Consignment Statement - SS Transport Corporation
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedBilties.length} consignments selected for statement generation
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {pdfUrl && (
              <button
                onClick={downloadPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span className="font-medium">Download</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
              <p className="text-lg text-gray-600">Generating Monthly Consignment Statement...</p>
              <p className="text-sm text-gray-500 mt-2">Processing {selectedBilties.length} consignments</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Summary Bar */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 font-medium">Total Consignments</p>
                    <p className="text-xl font-bold text-gray-900">{selectedBilties.length}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 font-medium">Total Amount</p>
                    <p className="text-xl font-bold text-red-600">Rs.{formatCurrency(totalAmount)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 font-medium">Paid Amount</p>
                    <p className="text-xl font-bold text-green-600">Rs.{formatCurrency(paidAmount)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 font-medium">To Pay Amount</p>
                    <p className="text-xl font-bold text-yellow-600">Rs.{formatCurrency(toPayAmount)}</p>
                  </div>
                </div>
              </div>

              {/* PDF Preview - Full Width */}
              {pdfUrl && (
                <div className="flex-1 bg-gray-100">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full border-0"
                    title="Monthly Consignment Statement Preview"
                    style={{ minHeight: '500px' }}
                  />
                </div>
              )}

              {/* Actions Bar */}
              {pdfUrl && (
                <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Ready for download or print</span>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={printPDF}
                      className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Printer className="h-5 w-5" />
                      <span className="font-medium">Print Statement</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillGenerator;
