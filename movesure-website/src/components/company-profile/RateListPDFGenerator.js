'use client';

import { jsPDF } from 'jspdf';
import { FileDown, Printer } from 'lucide-react';

const RateListPDFGenerator = ({ 
  profiles, 
  consignor, 
  getCityName,
  onClose 
}) => {
  
  // Use "Rs." instead of "₹" because jsPDF default fonts don't support rupee symbol
  const formatCurrency = (value) => {
    if (!value || value === 0) return '-';
    const num = parseFloat(value);
    return 'Rs.' + num.toFixed(2);
  };

  const formatUnit = (unit) => {
    if (!unit) return '';
    switch(unit) {
      case 'PER_KG': return '/kg';
      case 'PER_NAG': return '/nag';
      case 'PER_BILTY': return '/bilty';
      default: return '';
    }
  };

  // Format rate with unit
  const formatRate = (value, unit) => {
    if (!value || value === 0) return '-';
    const num = parseFloat(value);
    return 'Rs.' + num + formatUnit(unit);
  };

  // Format simple currency without decimals for cleaner look
  const formatSimpleCurrency = (value) => {
    if (!value || value === 0) return '-';
    const num = parseFloat(value);
    // If it's a whole number, don't show decimals
    if (num === Math.floor(num)) {
      return 'Rs.' + num;
    }
    return 'Rs.' + num.toFixed(2);
  };

  const generatePDF = () => {
    const doc = new jsPDF('landscape'); // Landscape for wider table
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    let yPosition = 20;

    const primaryColor = { r: 37, g: 99, b: 235 };
    const headerFillColor = { r: 220, g: 233, b: 255 };

    // Helper to split text into lines that fit within width
    const splitTextToFit = (text, maxWidth, fontSize) => {
      doc.setFontSize(fontSize);
      const words = String(text).split(' ');
      const lines = [];
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = doc.getTextWidth(testLine);
        if (testWidth > maxWidth - 4) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    // Helper function to draw table
    const drawTable = (startY, headers, rows, columnWidths) => {
      const startX = margin;
      const baseRowHeight = 8;
      const headerHeight = 10;
      let currentY = startY;

      // Draw header
      doc.setFillColor(headerFillColor.r, headerFillColor.g, headerFillColor.b);
      doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), headerHeight, 'FD');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      let currentX = startX;
      headers.forEach((header, i) => {
        if (i > 0) {
          doc.setDrawColor(100, 100, 100);
          doc.line(currentX, currentY, currentX, currentY + headerHeight);
        }
        doc.text(header, currentX + 2, currentY + headerHeight - 3);
        currentX += columnWidths[i];
      });

      currentY += headerHeight;

      // Draw rows
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      
      rows.forEach((row, rowIndex) => {
        // Calculate row height based on transport column (index 2) text wrapping
        const transportText = String(row[2] || '-');
        const transportLines = splitTextToFit(transportText, columnWidths[2], 7);
        const rowHeight = Math.max(baseRowHeight, transportLines.length * 4 + 4);

        // Check if we need a new page
        if (currentY > pageHeight - 20) {
          doc.addPage();
          currentY = 20;
          
          // Redraw header on new page
          doc.setFillColor(headerFillColor.r, headerFillColor.g, headerFillColor.b);
          doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), headerHeight, 'FD');
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          
          currentX = startX;
          headers.forEach((header, i) => {
            if (i > 0) {
              doc.setDrawColor(100, 100, 100);
              doc.line(currentX, currentY, currentX, currentY + headerHeight);
            }
            doc.text(header, currentX + 2, currentY + headerHeight - 3);
            currentX += columnWidths[i];
          });
          
          currentY += headerHeight;
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
        }

        // Alternate row colors
        if (rowIndex % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        }

        // Draw cell text
        currentX = startX;
        row.forEach((cell, i) => {
          if (i > 0) {
            doc.setDrawColor(100, 100, 100);
            doc.line(currentX, currentY, currentX, currentY + rowHeight);
          }
          
          const cellText = String(cell || '-');
          // Wrap text for transport column (index 2)
          if (i === 2) {
            const lines = splitTextToFit(cellText, columnWidths[i], 7);
            lines.forEach((line, lineIdx) => {
              doc.text(line, currentX + 2, currentY + 5 + (lineIdx * 4));
            });
          } else {
            doc.text(cellText, currentX + 2, currentY + rowHeight - 2);
          }
          currentX += columnWidths[i];
        });

        // Draw row border
        doc.setDrawColor(100, 100, 100);
        doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, 'S');
        
        currentY += rowHeight;
      });

      return currentY;
    };

    // Header
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RATE LIST', pageWidth / 2, 12, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(consignor?.company_name || 'Unknown Consignor', pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin, 27, { align: 'right' });

    yPosition = 40;

    // Consignor Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Consignor Details:', margin, yPosition);
    
    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    if (consignor?.company_add) {
      doc.text(`Address: ${consignor.company_add}`, margin, yPosition);
      yPosition += 5;
    }
    if (consignor?.gst_num) {
      doc.text(`GST: ${consignor.gst_num}`, margin, yPosition);
      yPosition += 5;
    }
    if (consignor?.number) {
      doc.text(`Contact: ${consignor.number}`, margin, yPosition);
      yPosition += 5;
    }

    yPosition += 5;

    // Summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Destinations: ${profiles.length}`, margin, yPosition);
    yPosition += 10;

    // Rate Table Headers
    const headers = [
      'S.No',
      'Destination',
      'Transport',
      'Rate',
      'Min Wt',
      'Min Fr',
      'Labour',
      'DD/kg',
      'DD/nag',
      'RS Chg',
      'Bilty',
      'Toll',
      'Status'
    ];

    // Column widths (total should be ~277 for landscape A4 with margins)
    // Increased Transport column width for longer names
    const columnWidths = [10, 30, 50, 20, 16, 18, 20, 18, 18, 16, 16, 14, 14];

    // Prepare rows
    const rows = profiles.map((profile, index) => {
      const cityName = getCityName(profile.destination_station_id);
      const rate = formatRate(profile.rate, profile.rate_unit);
      const minWt = profile.minimum_weight_kg > 0 ? `${profile.minimum_weight_kg}kg` : '-';
      const minFr = profile.freight_minimum_amount > 0 ? `Rs.${profile.freight_minimum_amount}` : '-';
      const labour = profile.labour_rate > 0 ? `Rs.${profile.labour_rate}${formatUnit(profile.labour_unit)}` : '-';
      const ddKg = profile.dd_charge_per_kg > 0 ? `Rs.${profile.dd_charge_per_kg}` : '-';
      const ddNag = profile.dd_charge_per_nag > 0 ? `Rs.${profile.dd_charge_per_nag}` : '-';
      const rsChg = profile.receiving_slip_charge > 0 ? `Rs.${profile.receiving_slip_charge}` : '-';
      const bilty = profile.bilty_charge > 0 ? `Rs.${profile.bilty_charge}` : '-';
      const toll = profile.is_toll_tax_applicable ? `Rs.${profile.toll_tax_amount || 0}` : '-';
      const status = profile.is_no_charge ? 'No Chg' : (profile.is_active ? 'Active' : 'Inactive');
      
      return [
        String(index + 1),
        cityName || '-',
        profile.transport_name || '-',
        rate,
        minWt,
        minFr,
        labour,
        ddKg,
        ddNag,
        rsChg,
        bilty,
        toll,
        status
      ];
    });

    drawTable(yPosition, headers, rows, columnWidths);

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      doc.text('Powered by MOVESURE.IO', pageWidth - margin, pageHeight - 5, { align: 'right' });
    }

    // Save PDF
    const fileName = `Rate_List_${consignor?.company_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const handlePrint = () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    let yPosition = 20;

    const primaryColor = { r: 37, g: 99, b: 235 };
    const headerFillColor = { r: 220, g: 233, b: 255 };

    // Helper to split text into lines that fit within width
    const splitTextToFit = (text, maxWidth, fontSize) => {
      doc.setFontSize(fontSize);
      const words = String(text).split(' ');
      const lines = [];
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = doc.getTextWidth(testLine);
        if (testWidth > maxWidth - 4) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    // Helper function to draw table
    const drawTable = (startY, headers, rows, columnWidths) => {
      const startX = margin;
      const baseRowHeight = 8;
      const headerHeight = 10;
      let currentY = startY;

      doc.setFillColor(headerFillColor.r, headerFillColor.g, headerFillColor.b);
      doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), headerHeight, 'FD');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      let currentX = startX;
      headers.forEach((header, i) => {
        if (i > 0) {
          doc.setDrawColor(100, 100, 100);
          doc.line(currentX, currentY, currentX, currentY + headerHeight);
        }
        doc.text(header, currentX + 2, currentY + headerHeight - 3);
        currentX += columnWidths[i];
      });

      currentY += headerHeight;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      
      rows.forEach((row, rowIndex) => {
        // Calculate row height based on transport column text wrapping
        const transportText = String(row[2] || '-');
        const transportLines = splitTextToFit(transportText, columnWidths[2], 7);
        const rowHeight = Math.max(baseRowHeight, transportLines.length * 4 + 4);

        if (currentY > pageHeight - 20) {
          doc.addPage();
          currentY = 20;
          
          doc.setFillColor(headerFillColor.r, headerFillColor.g, headerFillColor.b);
          doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), headerHeight, 'FD');
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          
          currentX = startX;
          headers.forEach((header, i) => {
            if (i > 0) {
              doc.setDrawColor(100, 100, 100);
              doc.line(currentX, currentY, currentX, currentY + headerHeight);
            }
            doc.text(header, currentX + 2, currentY + headerHeight - 3);
            currentX += columnWidths[i];
          });
          
          currentY += headerHeight;
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
        }

        if (rowIndex % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        }

        currentX = startX;
        row.forEach((cell, i) => {
          if (i > 0) {
            doc.setDrawColor(100, 100, 100);
            doc.line(currentX, currentY, currentX, currentY + rowHeight);
          }
          
          const cellText = String(cell || '-');
          // Wrap text for transport column (index 2)
          if (i === 2) {
            const lines = splitTextToFit(cellText, columnWidths[i], 7);
            lines.forEach((line, lineIdx) => {
              doc.text(line, currentX + 2, currentY + 5 + (lineIdx * 4));
            });
          } else {
            doc.text(cellText, currentX + 2, currentY + rowHeight - 2);
          }
          currentX += columnWidths[i];
        });

        doc.setDrawColor(100, 100, 100);
        doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, 'S');
        
        currentY += rowHeight;
      });

      return currentY;
    };

    // Fixed transport name - SS TRANSPORT CORPORATION
    const titleText = `${consignor?.company_add || consignor?.company_name || 'Unknown'} - SS TRANSPORT CORPORATION`;

    // Header
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(titleText.toUpperCase(), pageWidth / 2, 12, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('RATE LIST', pageWidth / 2, 22, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(consignor?.company_name || 'Unknown Consignor', pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin, 33, { align: 'right' });

    yPosition = 45;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Consignor Details:', margin, yPosition);
    
    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    if (consignor?.company_add) {
      doc.text(`Address: ${consignor.company_add}`, margin, yPosition);
      yPosition += 5;
    }
    if (consignor?.gst_num) {
      doc.text(`GST: ${consignor.gst_num}`, margin, yPosition);
      yPosition += 5;
    }
    if (consignor?.number) {
      doc.text(`Contact: ${consignor.number}`, margin, yPosition);
      yPosition += 5;
    }

    yPosition += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Destinations: ${profiles.length}`, margin, yPosition);
    yPosition += 10;

    const headers = [
      'S.No',
      'Destination',
      'Transport',
      'Rate',
      'Min Wt',
      'Min Fr',
      'Labour',
      'DD/kg',
      'DD/nag',
      'RS Chg',
      'Bilty',
      'Toll',
      'Status'
    ];

    const columnWidths = [10, 30, 50, 20, 16, 18, 20, 18, 18, 16, 16, 14, 14];

    const rows = profiles.map((profile, index) => {
      const cityName = getCityName(profile.destination_station_id);
      const rate = formatRate(profile.rate, profile.rate_unit);
      const minWt = profile.minimum_weight_kg > 0 ? `${profile.minimum_weight_kg}kg` : '-';
      const minFr = profile.freight_minimum_amount > 0 ? `Rs.${profile.freight_minimum_amount}` : '-';
      const labour = profile.labour_rate > 0 ? `Rs.${profile.labour_rate}${formatUnit(profile.labour_unit)}` : '-';
      const ddKg = profile.dd_charge_per_kg > 0 ? `Rs.${profile.dd_charge_per_kg}` : '-';
      const ddNag = profile.dd_charge_per_nag > 0 ? `Rs.${profile.dd_charge_per_nag}` : '-';
      const rsChg = profile.receiving_slip_charge > 0 ? `Rs.${profile.receiving_slip_charge}` : '-';
      const bilty = profile.bilty_charge > 0 ? `Rs.${profile.bilty_charge}` : '-';
      const toll = profile.is_toll_tax_applicable ? `Rs.${profile.toll_tax_amount || 0}` : '-';
      const status = profile.is_no_charge ? 'No Chg' : (profile.is_active ? 'Active' : 'Inactive');
      
      return [
        String(index + 1),
        cityName || '-',
        profile.transport_name || '-',
        rate,
        minWt,
        minFr,
        labour,
        ddKg,
        ddNag,
        rsChg,
        bilty,
        toll,
        status
      ];
    });

    drawTable(yPosition, headers, rows, columnWidths);

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      doc.text('Powered by MOVESURE.IO', pageWidth - margin, pageHeight - 5, { align: 'right' });
    }

    // Open print dialog
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Print Rate List
        </h3>
        
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-900">{consignor?.company_name}</p>
          {consignor?.gst_num && (
            <p className="text-sm text-gray-600">GST: {consignor.gst_num}</p>
          )}
          <p className="text-sm text-gray-600 mt-2">
            {profiles.length} destination(s) configured
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={generatePDF}
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default RateListPDFGenerator;
