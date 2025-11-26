'use client';

import { jsPDF } from 'jspdf';
import { FileDown } from 'lucide-react';

export default function AnalyticsPDFGenerator({ analyticsData }) {
  const formatCurrency = (value) => {
    if (!value || value === 0) return '0.00';
    const num = parseFloat(value);
    return num.toFixed(2);
  };

  const formatNumber = (value) => {
    if (!value || value === 0) return '0';
    return String(Math.round(parseFloat(value)));
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    let yPosition = 20;

    const primaryColor = { r: 37, g: 99, b: 235 };
    const headerFillColor = { r: 220, g: 233, b: 255 };
    const summaryFillColor = { r: 235, g: 242, b: 255 };

    // Helper function to draw table
    const drawTable = (startY, headers, rows, columnWidths, options = {}) => {
      const startX = margin;
      const rowHeight = options.rowHeight || 7;
      const headerHeight = options.headerHeight || 8;
      let currentY = startY;

      // Draw header with borders
      doc.setFillColor(headerFillColor.r, headerFillColor.g, headerFillColor.b);
      doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), headerHeight, 'FD');
      
      doc.setFontSize(options.headerFontSize || 9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      // Draw header text and vertical lines
      let currentX = startX;
      headers.forEach((header, i) => {
        // Draw vertical line
        if (i > 0) {
          doc.setDrawColor(100, 100, 100);
          doc.line(currentX, currentY, currentX, currentY + headerHeight);
        }
        doc.text(header, currentX + 2, currentY + headerHeight - 2);
        currentX += columnWidths[i];
      });

      currentY += headerHeight;

      // Draw rows
      doc.setFontSize(options.bodyFontSize || 8);
      doc.setFont('helvetica', 'normal');
      
      rows.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 20;
          
          // Redraw header on new page
          doc.setFillColor(headerFillColor.r, headerFillColor.g, headerFillColor.b);
          doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), headerHeight, 'FD');
          
          doc.setFontSize(options.headerFontSize || 9);
          doc.setFont('helvetica', 'bold');
          
          currentX = startX;
          headers.forEach((header, i) => {
            if (i > 0) {
              doc.setDrawColor(100, 100, 100);
              doc.line(currentX, currentY, currentX, currentY + headerHeight);
            }
            doc.text(header, currentX + 2, currentY + headerHeight - 2);
            currentX += columnWidths[i];
          });
          
          currentY += headerHeight;
          doc.setFontSize(options.bodyFontSize || 8);
          doc.setFont('helvetica', 'normal');
        }

        // Alternate row colors
        if (rowIndex % 2 === 0 && options.striped) {
          doc.setFillColor(250, 250, 250);
          doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        }

        // Special styling for total row
        if (options.isTotalRow && rowIndex === rows.length - 1) {
          doc.setFillColor(summaryFillColor.r, summaryFillColor.g, summaryFillColor.b);
          doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
          doc.setFont('helvetica', 'bold');
        }

        // Draw cell text and vertical lines
        currentX = startX;
        row.forEach((cell, i) => {
          // Draw vertical line
          if (i > 0) {
            doc.setDrawColor(100, 100, 100);
            doc.line(currentX, currentY, currentX, currentY + rowHeight);
          }
          
          const align = options.alignRight && options.alignRight.includes(i) ? 'right' : 'left';
          const cellText = String(cell);
          const xPos = align === 'right' ? currentX + columnWidths[i] - 3 : currentX + 2;
          
          // Split text to prevent overflow
          const maxWidth = columnWidths[i] - 4;
          const textLines = doc.splitTextToSize(cellText, maxWidth);
          doc.text(textLines[0], xPos, currentY + rowHeight - 2, { align, maxWidth });
          
          currentX += columnWidths[i];
        });

        // Draw row border
        doc.setDrawColor(100, 100, 100);
        doc.rect(startX, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, 'S');
        
        currentY += rowHeight;
        doc.setFont('helvetica', 'normal');
      });

      return currentY;
    };

    // Header
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('SS TRANSPORT CORPORATION', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('ANALYTICS REPORT', pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Powered by MOVESURE.IO', pageWidth - 15, 32, { align: 'right' });

    yPosition = 45;

    // Report Period
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Report Period: 13 June 2025 to 25 November 2025', margin, yPosition);
    yPosition += 10;

    // Executive Summary Box
    doc.setFillColor(240, 249, 255);
    doc.rect(margin, yPosition, pageWidth - (2 * margin), 45, 'F');
    doc.setDrawColor(59, 130, 246);
    doc.rect(margin, yPosition, pageWidth - (2 * margin), 45);

    yPosition += 8;
    doc.setFontSize(14);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('EXECUTIVE SUMMARY', margin + 5, yPosition);
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');

    const totalRevenue = (analyticsData.biltyStats?.totalRevenue || 0) + (analyticsData.summaryStats?.totalAmount || 0);
    const totalBilty = (analyticsData.biltyStats?.totalBilty || 0) + (analyticsData.summaryStats?.totalRecords || 0);
    const totalPackages = (analyticsData.biltyStats?.totalPackages || 0) + (analyticsData.summaryStats?.totalPackets || 0);
    const totalWeight = (analyticsData.biltyStats?.totalWeight || 0) + (analyticsData.summaryStats?.totalWeight || 0);

    const totalTons = (totalWeight / 1000).toFixed(2);
    
    doc.text(`Total Revenue: Rs. ${formatCurrency(totalRevenue)}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Total Bilty Count: ${formatNumber(totalBilty)}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Total Packages: ${formatNumber(totalPackages)}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Total Weight: ${formatNumber(totalWeight)} kg (${totalTons} Tons)`, margin + 5, yPosition);
    yPosition += 8;
    
    // Revenue in words
    const revenueInWords = numberToWords(Math.round(totalRevenue));
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.text(`In Words: ${revenueInWords} Rupees Only`, margin + 5, yPosition);

    yPosition += 12;

    // System vs Manual Bilty Comparison
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('BILTY TYPE BREAKDOWN', margin, yPosition);
    yPosition += 5;

    const biltyTypeRows = [
      [
        'System Bilty (Regular)',
        formatCurrency(analyticsData.biltyStats?.totalRevenue || 0),
        formatNumber(analyticsData.biltyStats?.totalBilty || 0),
        formatNumber(analyticsData.biltyStats?.totalPackages || 0),
        formatNumber(analyticsData.biltyStats?.totalWeight || 0)
      ],
      [
        'Manual Bilty (Station)',
        formatCurrency(analyticsData.summaryStats?.totalAmount || 0),
        formatNumber(analyticsData.summaryStats?.totalRecords || 0),
        formatNumber(analyticsData.summaryStats?.totalPackets || 0),
        formatNumber(analyticsData.summaryStats?.totalWeight || 0)
      ],
      [
        'TOTAL',
        formatCurrency(totalRevenue),
        formatNumber(totalBilty),
        formatNumber(totalPackages),
        formatNumber(totalWeight)
      ]
    ];

    yPosition = drawTable(
      yPosition,
      ['Type', 'Revenue', 'Bilty Count', 'Packages', 'Weight (kg)'],
      biltyTypeRows,
      [70, 35, 30, 30, 25],
      { alignRight: [1, 2, 3, 4], isTotalRow: true }
    );

    yPosition += 10;

    // Revenue Breakdown by Charge Type
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('REVENUE BREAKDOWN BY CHARGE TYPE', margin, yPosition);
    yPosition += 5;

    const chargeBreakdown = [
      ['Freight Amount', formatCurrency(analyticsData.revenueStats?.freight || 0)],
      ['Labour Charge', formatCurrency(analyticsData.revenueStats?.labour || 0)],
      ['Bill Charge', formatCurrency(analyticsData.revenueStats?.bill || 0)],
      ['Toll Charge', formatCurrency(analyticsData.revenueStats?.toll || 0)],
      ['Other Charge', formatCurrency(analyticsData.revenueStats?.other || 0)],
      ['PF Charge', formatCurrency(analyticsData.revenueStats?.pf || 0)]
    ];

    yPosition = drawTable(
      yPosition,
      ['Charge Type', 'Amount'],
      chargeBreakdown,
      [100, 90],
      { alignRight: [1], striped: true }
    );

    yPosition += 10;

    // Monthly Bilty Chart
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('MONTHLY BILTY TREND', margin, yPosition);
    yPosition += 5;

    // Simple bar chart
    const chartWidth = pageWidth - (2 * margin);
    const chartHeight = 50;
    const chartX = margin;
    const chartY = yPosition;
    
    // Draw chart background
    doc.setFillColor(250, 250, 250);
    doc.rect(chartX, chartY, chartWidth, chartHeight, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(chartX, chartY, chartWidth, chartHeight, 'S');

    // Sample monthly data - you can replace with actual data
    const systemBilty = analyticsData.biltyStats?.totalBilty || 0;
    const manualBilty = analyticsData.summaryStats?.totalRecords || 0;
    const maxBilty = Math.max(systemBilty, manualBilty);
    
    // Draw bars
    const barWidth = 30;
    const barSpacing = 40;
    const startX = chartX + 30;
    
    // System Bilty Bar (Blue)
    const systemBarHeight = (systemBilty / maxBilty) * (chartHeight - 20);
    doc.setFillColor(59, 130, 246);
    doc.rect(startX, chartY + chartHeight - systemBarHeight - 5, barWidth, systemBarHeight, 'F');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(formatNumber(systemBilty), startX + barWidth / 2, chartY + chartHeight - systemBarHeight - 8, { align: 'center' });
    doc.text('System', startX + barWidth / 2, chartY + chartHeight + 3, { align: 'center' });
    
    // Manual Bilty Bar (Orange)
    const manualBarHeight = (manualBilty / maxBilty) * (chartHeight - 20);
    doc.setFillColor(249, 115, 22);
    doc.rect(startX + barSpacing, chartY + chartHeight - manualBarHeight - 5, barWidth, manualBarHeight, 'F');
    doc.text(formatNumber(manualBilty), startX + barSpacing + barWidth / 2, chartY + chartHeight - manualBarHeight - 8, { align: 'center' });
    doc.text('Manual', startX + barSpacing + barWidth / 2, chartY + chartHeight + 3, { align: 'center' });

    // Legend
    const legendX = startX + 100;
    doc.setFillColor(59, 130, 246);
    doc.rect(legendX, chartY + 10, 5, 5, 'F');
    doc.text('System Bilty', legendX + 8, chartY + 14);
    
    doc.setFillColor(249, 115, 22);
    doc.rect(legendX, chartY + 20, 5, 5, 'F');
    doc.text('Manual Bilty', legendX + 8, chartY + 24);

    yPosition = chartY + chartHeight + 15;

    // Key Metrics Summary
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('KEY PERFORMANCE INDICATORS', margin, yPosition);
    yPosition += 5;

    const avgRevenuePerBilty = totalBilty > 0 ? totalRevenue / totalBilty : 0;
    const avgPackagesPerBilty = totalBilty > 0 ? totalPackages / totalBilty : 0;
    const avgWeightPerBilty = totalBilty > 0 ? totalWeight / totalBilty : 0;

    const kpiData = [
      ['Average Revenue per Bilty', 'Rs. ' + formatCurrency(avgRevenuePerBilty)],
      ['Average Packages per Bilty', formatNumber(avgPackagesPerBilty)],
      ['Average Weight per Bilty (kg)', formatNumber(avgWeightPerBilty)],
      ['System vs Manual Ratio', `${systemBilty > 0 ? Math.round((systemBilty / totalBilty) * 100) : 0}% : ${manualBilty > 0 ? Math.round((manualBilty / totalBilty) * 100) : 0}%`],
      ['Total Active Days', '165 days']
    ];

    yPosition = drawTable(
      yPosition,
      ['Metric', 'Value'],
      kpiData,
      [110, 80],
      { alignRight: [1], striped: true }
    );

    yPosition += 10;

    // Branch-wise Details
    if (analyticsData.branchStats && analyticsData.branchStats.length > 0) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text('BRANCH-WISE PERFORMANCE', margin, yPosition);
      yPosition += 5;

      const branchData = analyticsData.branchStats.map(branch => [
        branch.branchName || 'N/A',
        formatCurrency(branch.totalRevenue || 0),
        formatNumber(branch.biltyCount || 0),
        formatNumber(branch.totalPackages || 0),
        formatNumber(branch.totalWeight || 0)
      ]);

      yPosition = drawTable(
        yPosition,
        ['Branch', 'Revenue', 'Bilty Count', 'Packages', 'Weight (kg)'],
        branchData,
        [60, 35, 30, 30, 25],
        { alignRight: [1, 2, 3, 4] }
      );

      yPosition += 10;
    }

    // Top 10 Staff Performance
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('TOP 10 STAFF PERFORMANCE', margin, yPosition);
    yPosition += 5;

    const staffData = analyticsData.staffPerformance?.slice(0, 10).map((staff, index) => [
      `${index + 1}`,
      staff.staffName || 'N/A',
      staff.staffPost || 'N/A',
      formatCurrency(staff.regularRevenue || 0),
      formatNumber(staff.regularCount || 0),
      formatCurrency(staff.manualRevenue || 0),
      formatNumber(staff.manualCount || 0),
      formatCurrency(staff.totalRevenue || 0)
    ]) || [];

    if (staffData.length > 0) {
      yPosition = drawTable(
        yPosition,
        ['#', 'Name', 'Post', 'Reg Rev', 'Reg Cnt', 'Man Rev', 'Man Cnt', 'Total Rev'],
        staffData,
        [10, 35, 25, 25, 20, 25, 20, 30],
        { alignRight: [0, 3, 4, 5, 6, 7], bodyFontSize: 8, headerFontSize: 8, striped: true }
      );

      yPosition += 10;
    }

    // Top 10 Stations by Revenue
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('TOP 10 STATIONS BY REVENUE', margin, yPosition);
    yPosition += 5;

    const stationData = analyticsData.stationStats?.slice(0, 10).map((station, index) => [
      `${index + 1}`,
      station.station || 'N/A',
      formatCurrency(station.totalAmount || 0),
      formatNumber(station.count || 0),
      formatNumber(station.packets || 0),
      formatNumber(station.weight?.toFixed(2) || 0)
    ]) || [];

    if (stationData.length > 0) {
      yPosition = drawTable(
        yPosition,
        ['#', 'Station', 'Revenue', 'Bilty Count', 'Packets', 'Weight (kg)'],
        stationData,
        [10, 60, 35, 30, 25, 30],
        { alignRight: [0, 2, 3, 4, 5] }
      );
    }

    // Footer on all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, margin, pageHeight - 10);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      doc.text('© SS Transport Corporation - Powered by MOVESURE.IO', pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Save PDF
    doc.save(`SS_Transport_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <button
      onClick={generatePDF}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
    >
      <FileDown className="w-5 h-5" />
      Download Analytics PDF
    </button>
  );
}
