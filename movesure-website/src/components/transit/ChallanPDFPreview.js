'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Eye, Printer, FileText, Package, Truck } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const ChallanPDFPreview = ({ 
  isOpen, 
  onClose, 
  type, // 'loading' or 'challan'
  bilties = [],
  transitBilties = [],
  selectedChallan = null,
  selectedChallanBook = null,
  userBranch = null,
  permanentDetails = null,
  branches = []
}) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pdfViewerRef = useRef(null);

  // Generate PDF blob for preview
  const generatePDFBlob = async () => {
    try {
      setLoading(true);
      setError(null);

      let doc;

      if (type === 'loading') {
        doc = await generateLoadingChallanPDFBlob([...transitBilties, ...bilties]);
      } else if (type === 'challan') {
        doc = await generateChallanBiltiesPDFBlob(transitBilties);
      } else {
        throw new Error('Invalid PDF type');
      }

      // Convert to blob and create URL
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

    } catch (err) {
      console.error('Error generating PDF preview:', err);
      setError(err.message || 'Failed to generate PDF preview');
    } finally {
      setLoading(false);
    }
  };

  // Generate Loading Challan PDF Blob with Split Layout
  const generateLoadingChallanPDFBlob = async (allBiltiesData) => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const tableWidth = (pageWidth - (margin * 3)) / 2; // Split page in half
    const itemsPerColumn = 25; // Max items per column
    const itemsPerPage = itemsPerColumn * 2; // 2 columns per page
    const rowHeight = 6; // Height for each row
    
    let currentPage = 1;
    
    for (let pageStart = 0; pageStart < allBiltiesData.length; pageStart += itemsPerPage) {
      if (pageStart > 0) {
        doc.addPage();
        currentPage++;
      }
      
      const pageData = allBiltiesData.slice(pageStart, pageStart + itemsPerPage);
      
      // Get branch details
      const fromBranch = branches.find(b => b.id === userBranch?.id) || userBranch;
      
      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('LOADING CHALLAN', pageWidth / 2, 15, { align: 'center' });
      
      // Company Details
      if (permanentDetails) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(permanentDetails.transport_name || 'S. S. TRANSPORT CORPORATION', pageWidth / 2, 23, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        if (permanentDetails.transport_address) {
          doc.text(permanentDetails.transport_address, pageWidth / 2, 28, { align: 'center' });
        }
      }
      
      // Page Number
      doc.setFontSize(8);
      doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      
      // Date and Details
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`CHALLAN NO: ${selectedChallan?.challan_no || 'N/A'}`, pageWidth - margin, 15, { align: 'right' });
      doc.text(`DATE: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin, 20, { align: 'right' });
      
      // Driver & Truck Info (Top Left)
      doc.setFontSize(8);
      doc.text(`TRUCK NO: ${selectedChallan?.truck?.truck_number || 'N/A'}`, margin, 15);
      doc.text(`DRIVER: ${selectedChallan?.driver?.name || 'N/A'}`, margin, 20);
      doc.text(`OWNER: ${selectedChallan?.owner?.name || 'N/A'}`, margin, 25);
      
      // Line separator
      doc.setLineWidth(0.3);
      doc.line(margin, 35, pageWidth - margin, 35);
      
      const leftColumnData = pageData.slice(0, itemsPerColumn);
      const rightColumnData = pageData.slice(itemsPerColumn);
      
      let startY = 45;
      
      // LEFT COLUMN TABLE
      // Draw table header background
      doc.setFillColor(245, 245, 245); // Light gray background
      doc.rect(margin, startY - 5, tableWidth, 8, 'F');
      
      // Left Column Header with adjusted positions
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('S.No', margin + 1, startY);
      doc.text('G.R.No', margin + 12, startY);
      doc.text('Pkg', margin + 45, startY);
      doc.text('Station', margin + 55, startY);
      doc.text('Pvt. Mark', margin + 75, startY);
      
      // Draw table borders and grid for left column with adjusted positions
      doc.setLineWidth(0.3);
      doc.setDrawColor(0, 0, 0);
      
      // Header border
      doc.rect(margin, startY - 5, tableWidth, 8);
      
      // Vertical lines in header - adjusted positions
      doc.line(margin + 8, startY - 5, margin + 8, startY + 3); // After S.No (smaller)
      doc.line(margin + 42, startY - 5, margin + 42, startY + 3); // After G.R.No (smaller)
      doc.line(margin + 52, startY - 5, margin + 52, startY + 3); // After Pkg
      doc.line(margin + 72, startY - 5, margin + 72, startY + 3); // After Station (bigger)
      
      let currentY = startY + 8;
      
      // Left column data with borders
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      leftColumnData.forEach((bilty, index) => {
        const srNo = pageStart + index + 1;
        
        // Draw row background (alternating)
        if (index % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, currentY - 4, tableWidth, rowHeight, 'F');
        }
        
        // Row text with adjusted positions
        doc.setTextColor(0, 0, 0);
        doc.text(srNo.toString(), margin + 1, currentY);
        doc.text(bilty.gr_no || '', margin + 12, currentY);
        doc.text((bilty.no_of_pkg || 0).toString(), margin + 45, currentY);
        doc.text(bilty.to_city_code || '', margin + 55, currentY);
        const pvtMark = bilty.pvt_marks ? `${bilty.pvt_marks}/${bilty.no_of_pkg || 0}` : `/${bilty.no_of_pkg || 0}`;
        doc.text(pvtMark, margin + 75, currentY);
        
        // Draw row borders
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.rect(margin, currentY - 4, tableWidth, rowHeight);
        
        // Vertical lines with adjusted positions
        doc.line(margin + 8, currentY - 4, margin + 8, currentY + 2);
        doc.line(margin + 42, currentY - 4, margin + 42, currentY + 2);
        doc.line(margin + 52, currentY - 4, margin + 52, currentY + 2);
        doc.line(margin + 72, currentY - 4, margin + 72, currentY + 2);
        
        currentY += rowHeight;
      });
      
      // Fill remaining rows in left column if less than itemsPerColumn
      const remainingLeftRows = itemsPerColumn - leftColumnData.length;
      for (let i = 0; i < remainingLeftRows; i++) {
        if (i % 2 === (leftColumnData.length % 2)) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, currentY - 4, tableWidth, rowHeight, 'F');
        }
        
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.rect(margin, currentY - 4, tableWidth, rowHeight);
        
        // Vertical lines with adjusted positions
        doc.line(margin + 8, currentY - 4, margin + 8, currentY + 2);
        doc.line(margin + 42, currentY - 4, margin + 42, currentY + 2);
        doc.line(margin + 52, currentY - 4, margin + 52, currentY + 2);
        doc.line(margin + 72, currentY - 4, margin + 72, currentY + 2);
        
        currentY += rowHeight;
      }
      
      // RIGHT COLUMN TABLE
      const rightColumnX = margin + tableWidth + margin;
      currentY = startY;
      
      // Draw table header background for right column
      doc.setFillColor(245, 245, 245);
      doc.rect(rightColumnX, currentY - 5, tableWidth, 8, 'F');
      
      // Right Column Header with adjusted positions
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('S.No', rightColumnX + 1, currentY);
      doc.text('G.R.No', rightColumnX + 12, currentY);
      doc.text('Pkg', rightColumnX + 45, currentY);
      doc.text('Station', rightColumnX + 55, currentY);
      doc.text('Pvt. Mark', rightColumnX + 75, currentY);
      
      // Header border for right column
      doc.setLineWidth(0.3);
      doc.rect(rightColumnX, currentY - 5, tableWidth, 8);
      
      // Vertical lines in header with adjusted positions
      doc.line(rightColumnX + 8, currentY - 5, rightColumnX + 8, currentY + 3);
      doc.line(rightColumnX + 42, currentY - 5, rightColumnX + 42, currentY + 3);
      doc.line(rightColumnX + 52, currentY - 5, rightColumnX + 52, currentY + 3);
      doc.line(rightColumnX + 72, currentY - 5, rightColumnX + 72, currentY + 3);
      
      currentY += 8;
      
      // Right column data with borders
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      rightColumnData.forEach((bilty, index) => {
        const srNo = pageStart + itemsPerColumn + index + 1;
        
        // Draw row background (alternating)
        if (index % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(rightColumnX, currentY - 4, tableWidth, rowHeight, 'F');
        }
        
        // Row text with adjusted positions
        doc.setTextColor(0, 0, 0);
        doc.text(srNo.toString(), rightColumnX + 1, currentY);
        doc.text(bilty.gr_no || '', rightColumnX + 12, currentY);
        doc.text((bilty.no_of_pkg || 0).toString(), rightColumnX + 45, currentY);
        doc.text(bilty.to_city_code || '', rightColumnX + 55, currentY);
        const pvtMark = bilty.pvt_marks ? `${bilty.pvt_marks}/${bilty.no_of_pkg || 0}` : `/${bilty.no_of_pkg || 0}`;
        doc.text(pvtMark, rightColumnX + 75, currentY);
        
        // Draw row borders
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.rect(rightColumnX, currentY - 4, tableWidth, rowHeight);
        
        // Vertical lines with adjusted positions
        doc.line(rightColumnX + 8, currentY - 4, rightColumnX + 8, currentY + 2);
        doc.line(rightColumnX + 42, currentY - 4, rightColumnX + 42, currentY + 2);
        doc.line(rightColumnX + 52, currentY - 4, rightColumnX + 52, currentY + 2);
        doc.line(rightColumnX + 72, currentY - 4, rightColumnX + 72, currentY + 2);
        
        currentY += rowHeight;
      });
      
      // Fill remaining rows in right column if less than itemsPerColumn
      const remainingRightRows = itemsPerColumn - rightColumnData.length;
      for (let i = 0; i < remainingRightRows; i++) {
        if (i % 2 === (rightColumnData.length % 2)) {
          doc.setFillColor(250, 250, 250);
          doc.rect(rightColumnX, currentY - 4, tableWidth, rowHeight, 'F');
        }
        
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.rect(rightColumnX, currentY - 4, tableWidth, rowHeight);
        
        // Vertical lines with adjusted positions
        doc.line(rightColumnX + 8, currentY - 4, rightColumnX + 8, currentY + 2);
        doc.line(rightColumnX + 42, currentY - 4, rightColumnX + 42, currentY + 2);
        doc.line(rightColumnX + 52, currentY - 4, rightColumnX + 52, currentY + 2);
        doc.line(rightColumnX + 72, currentY - 4, rightColumnX + 72, currentY + 2);
        
        currentY += rowHeight;
      }
    }
    
    // Calculate totals on last page
    const totalPackages = allBiltiesData.reduce((sum, bilty) => sum + (bilty.no_of_pkg || 0), 0);
    
    // Totals at bottom of last page
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL PACKAGES: ${totalPackages}`, pageWidth / 2, 230, { align: 'center' });
    
    return doc;
  };

  // Generate Challan Bilties PDF Blob with Full Width
  const generateChallanBiltiesPDFBlob = async (transitBiltiesData) => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 8;
    
    // Get branch details for from and to
    const fromBranch = branches.find(b => b.id === selectedChallanBook?.from_branch_id) || userBranch;
    const toBranch = branches.find(b => b.id === selectedChallanBook?.to_branch_id);
    
    // Add header function
    const addHeader = (pageNum) => {
      // Title - Center
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CHALLAN', pageWidth / 2, 15, { align: 'center' });
      
      // Company Details - Center
      if (permanentDetails) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(permanentDetails.transport_name || 'S. S. TRANSPORT CORPORATION', pageWidth / 2, 25, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (permanentDetails.transport_address) {
          doc.text(permanentDetails.transport_address, pageWidth / 2, 31, { align: 'center' });
        }
      }
      
      // Page Number
      doc.setFontSize(8);
      doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
      
      // Challan Number - Top Right
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Challan No: ${selectedChallan.challan_no}`, pageWidth - margin, 15, { align: 'right' });
      doc.setFontSize(9);
      doc.text(`Date: ${format(new Date(selectedChallan.date), 'dd-MM-yyyy')}`, pageWidth - margin, 22, { align: 'right' });
      
      // Transport Details - Top Left
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TRANSPORT DETAILS:', margin, 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let yPos = 22;
      
      if (selectedChallan.truck) {
        doc.text(`Truck No: ${selectedChallan.truck.truck_number}`, margin, yPos);
        yPos += 5;
      }
      
      if (selectedChallan.driver) {
        doc.text(`Driver: ${selectedChallan.driver.name}`, margin, yPos);
        yPos += 5;
      }
      
      if (selectedChallan.owner) {
        doc.text(`Owner: ${selectedChallan.owner.name}`, margin, yPos);
        yPos += 5;
      }
      
      // Horizontal line
      doc.setLineWidth(0.5);
      doc.line(margin, 42, pageWidth - margin, 42);
      
      // Route Information
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`From: ${fromBranch?.branch_name || 'Unknown'} (${fromBranch?.city_code || ''})`, margin, 50);
      doc.text(`To: ${toBranch?.branch_name || 'Unknown'} (${toBranch?.city_code || ''})`, pageWidth - margin - 80, 50);
    };
    
    // Add first page header
    addHeader(1);
    
    // Calculate totals
    const totalPackages = transitBiltiesData.reduce((sum, bilty) => sum + (bilty.no_of_pkg || 0), 0);
    const totalWeight = transitBiltiesData.reduce((sum, bilty) => sum + (bilty.wt || 0), 0);
    const toPaidAmount = transitBiltiesData.filter(b => b.payment_mode === 'to-pay').reduce((sum, bilty) => sum + (bilty.total || 0), 0);
    const paidAmount = transitBiltiesData.filter(b => b.payment_mode === 'paid').reduce((sum, bilty) => sum + (bilty.total || 0), 0);
    const totalEwayBills = transitBiltiesData.filter(bilty => bilty.e_way_bill && bilty.e_way_bill.trim() !== '').length;
    
    // Table data with serial numbers
    const tableData = transitBiltiesData.map((bilty, index) => [
      (index + 1).toString(), // S.No
      bilty.gr_no,
      bilty.consignor_name || '',
      bilty.consignee_name || '',
      bilty.contain || '',
      (bilty.no_of_pkg || 0).toString(),
      (bilty.wt || 0).toString(),
      bilty.payment_mode === 'to-pay' ? `${(bilty.total || 0).toFixed(2)}` : '',
      bilty.payment_mode === 'paid' ? `${(bilty.total || 0).toFixed(2)}` : '',
      bilty.to_city_code || '',
      bilty.pvt_marks ? `${bilty.pvt_marks}/${bilty.no_of_pkg || 0}` : `/${bilty.no_of_pkg || 0}`,
      bilty.e_way_bill || ''
    ]);
    
    // Create main table with full width
    autoTable(doc, {
      startY: 58,
      head: [['S.No', 'G.R. No.', 'Consignor', 'Consignee', 'Cont.', 'Pckg.', 'Weight (kg)', 'To-Pay', 'Paid', 'Station', 'Pvt.M', 'E-way Bill']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [255, 255, 255], // White background
        textColor: [0, 0, 0],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      styles: { 
        fontSize: 8.5, 
        cellPadding: 1.5,
        overflow: 'linebreak',
        valign: 'middle',
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255], // White background
        lineColor: [0, 0, 0],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15, fontStyle: 'bold' }, // S.No
        1: { halign: 'center', cellWidth: 28, fontStyle: 'bold' }, // GR No
        2: { cellWidth: 35, overflow: 'linebreak' }, // Consignor
        3: { cellWidth: 35, overflow: 'linebreak' }, // Consignee
        4: { cellWidth: 18, overflow: 'linebreak' }, // Cont
        5: { halign: 'center', cellWidth: 18 }, // Pckg
        6: { halign: 'center', cellWidth: 20 }, // Weight
        7: { halign: 'right', cellWidth: 22 }, // To-Pay
        8: { halign: 'right', cellWidth: 22 }, // Paid
        9: { halign: 'center', cellWidth: 20 }, // Station
        10: { cellWidth: 22, overflow: 'linebreak' }, // Pvt.M
        11: { halign: 'center', cellWidth: 25 } // E-way Bill
      },
      margin: { left: margin, right: margin },
      tableWidth: 'wrap',
      didDrawPage: (data) => {
        // Add header to subsequent pages (except first page)
        if (data.pageNumber > 1) {
          addHeader(data.pageNumber);
        }
      }
    });
    
    // Add TOTAL row after table
    const tableEndY = doc.lastAutoTable.finalY + 5;
    
    // Add totals row
    autoTable(doc, {
      startY: tableEndY,
      body: [['', '', '', '', 'TOTAL', totalPackages.toString(), totalWeight.toFixed(2), toPaidAmount.toFixed(2), paidAmount.toFixed(2), '', '', totalEwayBills.toString()]],
      theme: 'grid',
      styles: { 
        fontSize: 9,
        fontStyle: 'bold',
        cellPadding: 3,
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255], // White background
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 28 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
        6: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
        7: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
        8: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
        9: { cellWidth: 20 },
        10: { cellWidth: 22 },
        11: { halign: 'center', cellWidth: 25, fontStyle: 'bold' } // E-way Bill total
      },
      margin: { left: margin, right: margin },
      tableWidth: 'wrap'
    });
    
    // Footer signature on last page
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('For S. S. TRANSPORT CORPORATION', pageWidth - margin - 80, finalY);
    doc.text('Authorized Signatory: ___________________', pageWidth - margin - 80, finalY + 8);
    
    return doc;
  };

  // Download PDF
  const handleDownload = async () => {
    try {
      let doc;
      let filename;

      if (type === 'loading') {
        doc = await generateLoadingChallanPDFBlob();
        filename = `Loading_Challan_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      } else if (type === 'challan') {
        doc = await generateChallanBiltiesPDFBlob();
        filename = `Challan_${selectedChallan.challan_no}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      } else {
        throw new Error('Invalid PDF type');
      }

      // Save the PDF
      doc.save(filename);
      console.log('PDF downloaded successfully:', filename);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError(error.message || 'Failed to download PDF');
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
      };
    }
  };

  // Generate PDF when component opens or dependencies change
  useEffect(() => {
    if (isOpen && type) {
      generatePDFBlob();
    }
  }, [isOpen, type, bilties, transitBilties, selectedChallan, selectedChallanBook, userBranch, permanentDetails, branches]);

  // Cleanup URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-full max-h-[95vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
          <div className="flex items-center gap-3">
            {type === 'loading' ? (
              <>
                <Package className="w-6 h-6" />
                <h3 className="text-xl font-bold">Loading Challan Preview</h3>
              </>
            ) : (
              <>
                <Truck className="w-6 h-6" />
                <h3 className="text-xl font-bold">
                  Challan Preview - {selectedChallan?.challan_no}
                </h3>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={loading || error || !pdfUrl}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            
            <button
              onClick={handlePrint}
              disabled={loading || error || !pdfUrl}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <div className="text-lg font-semibold text-gray-700">Generating PDF...</div>
                <div className="text-sm text-gray-500">This may take a moment</div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
                <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <div className="text-lg font-semibold text-red-800 mb-2">Error Generating PDF</div>
                <div className="text-red-600 mb-4">{error}</div>
                <button
                  onClick={generatePDFBlob}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <div className="h-full border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
              <iframe
                ref={pdfViewerRef}
                src={pdfUrl}
                className="w-full h-full"
                title="PDF Preview"
              />
            </div>
            )}

          {!loading && !error && !pdfUrl && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <div className="text-lg font-semibold text-gray-700 mb-2">No PDF Available</div>
                <div className="text-gray-500">Click the button above to generate a PDF</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              {type === 'loading' && (
                <span>📋 Available Bilties: {bilties.length}</span>
              )}
              {type === 'challan' && (
                <>
                  <span>🚛 Challan: {selectedChallan?.challan_no}</span>
                  <span>📦 Bilties: {transitBilties.length}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    selectedChallan?.is_dispatched 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedChallan?.is_dispatched ? 'DISPATCHED' : 'PENDING'}
                  </span>
                </>
              )}
            </div>
            
            <div className="text-xs">
              Generated: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallanPDFPreview;