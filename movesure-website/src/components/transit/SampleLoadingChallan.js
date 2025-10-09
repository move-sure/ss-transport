'use client';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';

const SampleLoadingChallan = ({ userBranch, permanentDetails }) => {
  
  const generateSamplePDF = () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 2; // Minimal margin like original
    const columnGap = 0; // No gap between columns
    const tableWidth = (pageWidth - (margin * 2) - columnGap) / 2;
    const itemsPerColumn = 20;

    // Header Section - Minimal like original
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LOADING CHALLAN - SAMPLE', pageWidth / 2, 15, { align: 'center' });
    
    // Company Name only - no address or contact
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SS TRANSPORT', pageWidth / 2, 23, { align: 'center' });

    // Date and Details Section - reduced spacing
    let yPos = 32; // Much closer to header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Date: __________', margin + 5, yPos);
    doc.text('Truck No: __________', pageWidth - margin - 50, yPos);
    
    yPos += 6;
    doc.text('Driver: __________', margin + 5, yPos);
    doc.text('Owner: __________', pageWidth - margin - 50, yPos);

    // Table positioning - matching original loading challan
    const leftColumnX = margin;
    const rightColumnX = margin + tableWidth + columnGap;
    const tableStartY = yPos + 8;
    const rowHeight = 10; // Match original row height
    const headerHeight = 10; // Match original header height

    // Column widths matching original loading challan exactly
    const colWidths = {
      sno: 10,
      grNo: 16,
      pkg: 10,
      station: 24,
      pvtMark: 28,
      remark: 14
    };

    // Function to draw table with starting serial number
    const drawTable = (startX, startY, startSerialNumber) => {
      let currentY = startY;
      
      // Draw header background
      doc.setFillColor(245, 245, 245);
      doc.rect(startX, currentY - 6, tableWidth, headerHeight, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      // Draw header text exactly like original
      doc.text('S.No', startX + 2, currentY);
      doc.text('G.R.No', startX + 12, currentY);
      doc.text('Pkg', startX + 28, currentY);
      doc.text('Station', startX + 38, currentY);
      doc.text('Pvt. Mark', startX + 62, currentY);
      doc.text('Remark', startX + 90, currentY);
      
      // Draw header border
      doc.setLineWidth(0.3);
      doc.setDrawColor(0, 0, 0);
      doc.rect(startX, currentY - 6, tableWidth, headerHeight);
      
      // Draw vertical lines in header
      let currentX = startX + colWidths.sno;
      doc.line(currentX, currentY - 6, currentX, currentY + 4);
      currentX += colWidths.grNo;
      doc.line(currentX, currentY - 6, currentX, currentY + 4);
      currentX += colWidths.pkg;
      doc.line(currentX, currentY - 6, currentX, currentY + 4);
      currentX += colWidths.station;
      doc.line(currentX, currentY - 6, currentX, currentY + 4);
      currentX += colWidths.pvtMark;
      doc.line(currentX, currentY - 6, currentX, currentY + 4);
      
      currentY += 10; // Move to data rows
      
      // Draw empty rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      for (let i = 0; i < itemsPerColumn; i++) {
        currentX = startX;
        
        // Draw row borders
        doc.rect(currentX, currentY, tableWidth, rowHeight);
        
        // Draw vertical lines
        let lineX = startX + colWidths.sno;
        doc.line(lineX, currentY, lineX, currentY + rowHeight);
        lineX += colWidths.grNo;
        doc.line(lineX, currentY, lineX, currentY + rowHeight);
        lineX += colWidths.pkg;
        doc.line(lineX, currentY, lineX, currentY + rowHeight);
        lineX += colWidths.station;
        doc.line(lineX, currentY, lineX, currentY + rowHeight);
        lineX += colWidths.pvtMark;
        doc.line(lineX, currentY, lineX, currentY + rowHeight);
        
        // Draw serial number with offset
        doc.text((startSerialNumber + i).toString(), startX + colWidths.sno / 2, currentY + 6, { align: 'center' });
        
        currentY += rowHeight;
      }
    };

    // Draw left column table (1-20)
    drawTable(leftColumnX, tableStartY, 1);
    
    // Draw right column table (21-40)
    drawTable(rightColumnX, tableStartY, 21);

    // Footer Section - moved lower
    const footerY = pageHeight - 30;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY:', margin, footerY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Packages: __________', margin, footerY + 6);
    doc.text('Total Weight: __________ KG', margin, footerY + 12);
    
    doc.text('Authorized Signatory: ____________________', pageWidth - margin - 80, footerY + 6);

    // Notes Section
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('Note: This is a sample loading challan format', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save the PDF
    const fileName = `Sample_Loading_Challan_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <button
      onClick={generateSamplePDF}
      className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg text-xs font-medium"
      title="Download Empty Sample Loading Challan"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Sample</span>
    </button>
  );
};

export default SampleLoadingChallan;
