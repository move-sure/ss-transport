'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  const [selectedCity, setSelectedCity] = useState('all');
  const [availableCities, setAvailableCities] = useState([]);

  // Get unique cities from transit bilties and reset filter when modal opens
  useEffect(() => {
    if (isOpen && type === 'challan' && transitBilties.length > 0) {
      const cities = [...new Set(transitBilties.map(b => b.to_city_code).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
      setAvailableCities(cities);
      setSelectedCity('all'); // Reset filter when opening
    }
  }, [isOpen, type, transitBilties]);

  // Generate PDF blob for preview
  const generatePDFBlob = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let doc;
      let filteredData = transitBilties;
      
      // Filter by city if challan type and city is selected
      if (type === 'challan' && selectedCity !== 'all') {
        filteredData = transitBilties.filter(b => b.to_city_code === selectedCity);
      }
      
      if (type === 'loading') {
        doc = await generateLoadingChallanPDFBlob(filteredData);
      } else if (type === 'challan') {
        doc = await generateChallanBiltiesPDFBlob(filteredData);
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
  }, [type, bilties, transitBilties, selectedChallan, selectedChallanBook, userBranch, permanentDetails, branches]);  // Generate Loading Challan PDF Blob with Split Layout
  const generateLoadingChallanPDFBlob = async (transitBiltiesData) => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;    const margin = 2; // Minimal margin for maximum width
    const columnGap = 0; // Remove gap between columns completely
    const tableWidth = (pageWidth - (margin * 2) - columnGap) / 2; // Split page in half with no gap
    const itemsPerColumn = 20; // Max items per column (40 total per page)
    const itemsPerPage = itemsPerColumn * 2; // 2 columns per page
    const rowHeight = 10; // Increased row height for better readability
    
    let currentPage = 1;    // Sort bilties alphabetically by city name first, then by GR number within each city
    const sortedBiltiesData = [...transitBiltiesData].sort((a, b) => {
      // First sort by city name (to_city_name) alphabetically
      const cityA = (a.to_city_name || '').toUpperCase();
      const cityB = (b.to_city_name || '').toUpperCase();
      
      if (cityA !== cityB) {
        return cityA.localeCompare(cityB);
      }
      
      // If same city, sort by GR number
      const grA = (a.gr_no || '').toUpperCase();
      const grB = (b.gr_no || '').toUpperCase();
      
      // Handle mixed alphanumeric GR numbers properly
      return grA.localeCompare(grB, undefined, { numeric: true, sensitivity: 'base' });
    });// Calculate totals once
    const totalPackages = sortedBiltiesData.reduce((sum, bilty) => sum + (bilty.no_of_pkg || 0), 0);
    const totalWeight = sortedBiltiesData.reduce((sum, bilty) => sum + (bilty.wt || 0), 0);
    
    for (let pageStart = 0; pageStart < sortedBiltiesData.length; pageStart += itemsPerPage) {
      if (pageStart > 0) {
        doc.addPage();
        currentPage++;
      }
        const pageData = sortedBiltiesData.slice(pageStart, pageStart + itemsPerPage);
        // Add header details only on first page
      if (currentPage === 1) {
        // Get branch details
        const fromBranch = branches.find(b => b.id === userBranch?.id) || userBranch;
          // Title - Made even smaller
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('LOADING CHALLAN', pageWidth / 2, 10, { align: 'center' });
        
        // Company Details - Made smaller
        if (permanentDetails) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(permanentDetails.transport_name || 'S. S. TRANSPORT CORPORATION', pageWidth / 2, 15, { align: 'center' });
          
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          if (permanentDetails.transport_address) {
            doc.text(permanentDetails.transport_address, pageWidth / 2, 19, { align: 'center' });
          }
        }
        
        // Date and Details (Top Right)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`CHALLAN NO: ${selectedChallan?.challan_no || 'N/A'}`, pageWidth - margin, 10, { align: 'right' });
        doc.text(`DATE: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin, 14, { align: 'right' });
          // Add totals below date
        doc.setFontSize(7);
        doc.text(`TOTAL PACKAGES: ${totalPackages}`, pageWidth - margin, 18, { align: 'right' });
        doc.text(`TOTAL WEIGHT: ${Math.round(totalWeight)} KG`, pageWidth - margin, 22, { align: 'right' });
        
        // Driver & Truck Info (Top Left)
        doc.setFontSize(7);
        doc.text(`TRUCK NO: ${selectedChallan?.truck?.truck_number || 'N/A'}`, margin, 10);
        doc.text(`DRIVER: ${selectedChallan?.driver?.name || 'N/A'}`, margin, 14);
        doc.text(`OWNER: ${selectedChallan?.owner?.name || 'N/A'}`, margin, 18);
        
        // Line separator
        doc.setLineWidth(0.3);
        doc.line(margin, 25, pageWidth - margin, 25);
        
        var startY = 30; // Start position for first page
      } else {
        // For subsequent pages, just add page number and start higher
        doc.setFontSize(8);
        doc.text(`Page ${currentPage}`, pageWidth - margin, 15, { align: 'right' });
        doc.text('LOADING CHALLAN (Continued)', pageWidth / 2, 15, { align: 'center' });
        
        var startY = 25; // Start higher for subsequent pages
      }
      
      // Page Number (for all pages)
      doc.setFontSize(8);
      doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' });      
      const leftColumnData = pageData.slice(0, itemsPerColumn);
      const rightColumnData = pageData.slice(itemsPerColumn);
      
        // LEFT COLUMN TABLE      // Draw table header background
      doc.setFillColor(245, 245, 245); // Light gray background
      doc.rect(margin, startY - 6, tableWidth, 10, 'F'); // Increased header height      // Left Column Header with adjusted column widths - smaller GR No, bigger Station
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('S.No', margin + 2, startY);
      doc.text('G.R.No', margin + 12, startY);
      doc.text('Pkg', margin + 28, startY);
      doc.text('Station', margin + 38, startY);
      doc.text('Pvt. Mark', margin + 62, startY);
      doc.text('Remark', margin + 90, startY);
      
      // Draw table borders and grid for left column with adjusted widths
      doc.setLineWidth(0.3);
      doc.setDrawColor(0, 0, 0);
      
      // Header border
      doc.rect(margin, startY - 6, tableWidth, 10);
      
      // Vertical lines in header - adjusted for smaller GR No, bigger Station
      doc.line(margin + 10, startY - 6, margin + 10, startY + 4); // After S.No
      doc.line(margin + 26, startY - 6, margin + 26, startY + 4); // After G.R.No (reduced from 33 to 26)
      doc.line(margin + 36, startY - 6, margin + 36, startY + 4); // After Pkg (reduced from 43 to 36)
      doc.line(margin + 60, startY - 6, margin + 60, startY + 4); // After Station (kept same, but now bigger due to earlier reduction)
      doc.line(margin + 88, startY - 6, margin + 88, startY + 4); // After Pvt. Mark
      
      let currentY = startY + 10; // Adjusted for increased header height      // Left column data with borders and bigger, bold GR numbers
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      leftColumnData.forEach((bilty, index) => {
        const srNo = pageStart + index + 1;
        
        // Draw row background (alternating)
        if (index % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, currentY - 6, tableWidth, rowHeight, 'F');
        }
        
        // Row text with adjusted positions for new column widths
        doc.setTextColor(0, 0, 0);
        
        // Make S.No bigger and bold
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(srNo.toString(), margin + 2, currentY);
        
        // Make GR number bigger and bold
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(bilty.gr_no || '', margin + 12, currentY);
          // Reset to normal for other fields
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        // Make Package column bigger font and bold
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text((bilty.no_of_pkg || 0).toString(), margin + 28, currentY);        // Dynamic font size for station code - prioritize readability 
        const stationCode = bilty.to_city_code || '';
        const stationFontSize = stationCode.length > 6 ? 8 : 10; // More generous threshold
        doc.setFontSize(stationFontSize);
        doc.setFont('helvetica', 'bold');
        doc.text(stationCode, margin + 38, currentY);
        
        // Fix pvt_marks display - handle both string and number cases with dynamic font size
        let pvtMarkText = '';
        if (bilty.pvt_marks && bilty.pvt_marks.toString().trim() !== '') {
          pvtMarkText = `${bilty.pvt_marks}/${bilty.no_of_pkg || 0}`;
        } else {
          pvtMarkText = `/${bilty.no_of_pkg || 0}`;
        }
        // Dynamic font size for private marks - prioritize readability
        // Use bigger font (10pt) for most cases, only use smaller (8pt) for very long text
        const pvtMarkFontSize = pvtMarkText.length > 8 ? 8 : 10; // More generous threshold
        doc.setFontSize(pvtMarkFontSize);
        doc.setFont('helvetica', 'bold');
        doc.text(pvtMarkText, margin + 62, currentY);
        
        // Add E-way bill indicator or W (missing consignor/consignee) in remark column
        const hasEwayBill = bilty.e_way_bill && bilty.e_way_bill.toString().trim() !== '';
        const missingConsignorOrConsignee = bilty.bilty_type === 'station' && 
          (!bilty.consignor_name || bilty.consignor_name.trim() === '' || 
           !bilty.consignee_name || bilty.consignee_name.trim() === '');
        
        if (hasEwayBill && missingConsignorOrConsignee) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('E,W', margin + 88, currentY);
        } else if (hasEwayBill) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('E', margin + 90, currentY);
        } else if (missingConsignorOrConsignee) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('W', margin + 90, currentY);
        }
        
        // Draw row borders
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.rect(margin, currentY - 6, tableWidth, rowHeight);
        
        // Vertical lines with adjusted positions for new column widths
        doc.line(margin + 10, currentY - 6, margin + 10, currentY + 4);
        doc.line(margin + 26, currentY - 6, margin + 26, currentY + 4);
        doc.line(margin + 36, currentY - 6, margin + 36, currentY + 4);
        doc.line(margin + 60, currentY - 6, margin + 60, currentY + 4);
        doc.line(margin + 88, currentY - 6, margin + 88, currentY + 4);
        
        currentY += rowHeight;
      });// Fill remaining rows in left column if less than itemsPerColumn
      const remainingLeftRows = itemsPerColumn - leftColumnData.length;
      for (let i = 0; i < remainingLeftRows; i++) {
        if (i % 2 === (leftColumnData.length % 2)) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, currentY - 6, tableWidth, rowHeight, 'F'); // Adjusted for increased row height
        }
        
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.rect(margin, currentY - 6, tableWidth, rowHeight); // Adjusted for increased row height        // Vertical lines with adjusted positions for new column widths
        doc.line(margin + 10, currentY - 6, margin + 10, currentY + 4);
        doc.line(margin + 26, currentY - 6, margin + 26, currentY + 4);
        doc.line(margin + 36, currentY - 6, margin + 36, currentY + 4);
        doc.line(margin + 60, currentY - 6, margin + 60, currentY + 4);
        doc.line(margin + 88, currentY - 6, margin + 88, currentY + 4);
        
        currentY += rowHeight;
      }
        // RIGHT COLUMN TABLE
      const rightColumnX = margin + tableWidth + columnGap; // No gap
      currentY = startY;
        // Draw table header background for right column
      doc.setFillColor(245, 245, 245);
      doc.rect(rightColumnX, currentY - 6, tableWidth, 10, 'F');
        // Right Column Header with adjusted column widths - smaller GR No, bigger Station
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('S.No', rightColumnX + 2, currentY);
      doc.text('G.R.No', rightColumnX + 12, currentY);
      doc.text('Pkg', rightColumnX + 28, currentY);
      doc.text('Station', rightColumnX + 38, currentY);
      doc.text('Pvt. Mark', rightColumnX + 62, currentY);
      doc.text('Remark', rightColumnX + 90, currentY);
      
      // Header border for right column
      doc.setLineWidth(0.3);
      doc.rect(rightColumnX, currentY - 6, tableWidth, 10);
      
      // Vertical lines in header with new column widths
      doc.line(rightColumnX + 10, currentY - 6, rightColumnX + 10, currentY + 4);
      doc.line(rightColumnX + 26, currentY - 6, rightColumnX + 26, currentY + 4);
      doc.line(rightColumnX + 36, currentY - 6, rightColumnX + 36, currentY + 4);
      doc.line(rightColumnX + 60, currentY - 6, rightColumnX + 60, currentY + 4);
      doc.line(rightColumnX + 88, currentY - 6, rightColumnX + 88, currentY + 4);
        currentY += 10; // Adjusted for header height      // Right column data with borders and bigger, bold GR numbers
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      rightColumnData.forEach((bilty, index) => {
        const srNo = pageStart + itemsPerColumn + index + 1;
        
        // Draw row background (alternating)
        if (index % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(rightColumnX, currentY - 6, tableWidth, rowHeight, 'F');
        }
        
        // Row text with adjusted positions for new column widths
        doc.setTextColor(0, 0, 0);
        
        // Make S.No bigger and bold
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(srNo.toString(), rightColumnX + 2, currentY);
        
        // Make GR number bigger and bold
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(bilty.gr_no || '', rightColumnX + 12, currentY);
          // Reset to normal for other fields
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        // Make Package column bigger font and bold
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text((bilty.no_of_pkg || 0).toString(), rightColumnX + 28, currentY);
        // Dynamic font size for station code - prioritize readability
        const stationCode = bilty.to_city_code || '';
        const stationFontSize = stationCode.length > 6 ? 8 : 10; // More generous threshold
        doc.setFontSize(stationFontSize);
        doc.setFont('helvetica', 'bold');
        doc.text(stationCode, rightColumnX + 38, currentY);
        
        // Fix pvt_marks display - handle both string and number cases with dynamic font size
        let pvtMarkText = '';
        if (bilty.pvt_marks && bilty.pvt_marks.toString().trim() !== '') {
          pvtMarkText = `${bilty.pvt_marks}/${bilty.no_of_pkg || 0}`;
        } else {
          pvtMarkText = `/${bilty.no_of_pkg || 0}`;
        }
        // Dynamic font size for private marks - prioritize readability
        // Use bigger font (10pt) for most cases, only use smaller (8pt) for very long text
        const pvtMarkFontSize = pvtMarkText.length > 8 ? 8 : 10; // More generous threshold
        doc.setFontSize(pvtMarkFontSize);
        doc.setFont('helvetica', 'bold');
        doc.text(pvtMarkText, rightColumnX + 62, currentY);
        
        // Add E-way bill indicator or W (missing consignor/consignee) in remark column
        const hasEwayBill = bilty.e_way_bill && bilty.e_way_bill.toString().trim() !== '';
        const missingConsignorOrConsignee = bilty.bilty_type === 'station' && 
          (!bilty.consignor_name || bilty.consignor_name.trim() === '' || 
           !bilty.consignee_name || bilty.consignee_name.trim() === '');
        
        if (hasEwayBill && missingConsignorOrConsignee) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('E,W', rightColumnX + 88, currentY);
        } else if (hasEwayBill) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('E', rightColumnX + 90, currentY);
        } else if (missingConsignorOrConsignee) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('W', rightColumnX + 90, currentY);
        }
        
        // Draw row borders
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.rect(rightColumnX, currentY - 6, tableWidth, rowHeight);
        
        // Vertical lines with adjusted positions for new column widths
        doc.line(rightColumnX + 10, currentY - 6, rightColumnX + 10, currentY + 4);
        doc.line(rightColumnX + 26, currentY - 6, rightColumnX + 26, currentY + 4);
        doc.line(rightColumnX + 36, currentY - 6, rightColumnX + 36, currentY + 4);
        doc.line(rightColumnX + 60, currentY - 6, rightColumnX + 60, currentY + 4);
        doc.line(rightColumnX + 88, currentY - 6, rightColumnX + 88, currentY + 4);
        
        currentY += rowHeight;
      });// Fill remaining rows in right column if less than itemsPerColumn
      const remainingRightRows = itemsPerColumn - rightColumnData.length;
      for (let i = 0; i < remainingRightRows; i++) {
        if (i % 2 === (rightColumnData.length % 2)) {
          doc.setFillColor(250, 250, 250);
          doc.rect(rightColumnX, currentY - 6, tableWidth, rowHeight, 'F'); // Adjusted for increased row height
        }
        
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.rect(rightColumnX, currentY - 6, tableWidth, rowHeight); // Adjusted for increased row height        // Vertical lines with adjusted positions for new column widths
        doc.line(rightColumnX + 10, currentY - 6, rightColumnX + 10, currentY + 4);
        doc.line(rightColumnX + 26, currentY - 6, rightColumnX + 26, currentY + 4);
        doc.line(rightColumnX + 36, currentY - 6, rightColumnX + 36, currentY + 4);
        doc.line(rightColumnX + 60, currentY - 6, rightColumnX + 60, currentY + 4);
        doc.line(rightColumnX + 88, currentY - 6, rightColumnX + 88, currentY + 4);
          currentY += rowHeight;
      }
    }
    
    // Add totals at the bottom of the last page
    const lastPageBottomY = pageHeight - 40; // Position from bottom
    
    // Calculate total e-way bills
    const totalEwayBills = sortedBiltiesData.reduce((total, bilty) => {
      if (bilty.e_way_bill && bilty.e_way_bill.trim() !== '') {
        const ewayBills = bilty.e_way_bill.split(',').filter(bill => bill.trim() !== '');
        return total + ewayBills.length;
      }
      return total;
    }, 0);
    
    // Calculate total W (station bilties missing consignor or consignee)
    const totalWCount = sortedBiltiesData.reduce((total, bilty) => {
      if (bilty.bilty_type === 'station' && 
          (!bilty.consignor_name || bilty.consignor_name.trim() === '' || 
           !bilty.consignee_name || bilty.consignee_name.trim() === '')) {
        return total + 1;
      }
      return total;
    }, 0);
    
    // Add totals section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY:', margin, lastPageBottomY);
      doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Packages: ${totalPackages}`, margin, lastPageBottomY + 6);
    doc.text(`Total Weight: ${Math.round(totalWeight)} KG`, margin, lastPageBottomY + 12);
    doc.text(`Total E-way Bills: ${totalEwayBills}`, margin, lastPageBottomY + 18);
    doc.text(`Total W (Missing Info): ${totalWCount}`, margin, lastPageBottomY + 24);
    
    // Add signature area
    doc.text('Authorized Signatory: ____________________', pageWidth - margin - 80, lastPageBottomY + 6);
    
    return doc;
  };
  // Generate Challan Bilties PDF Blob with Full Width
  const generateChallanBiltiesPDFBlob = async (transitBiltiesData) => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 8;
    
    // Sort bilties alphabetically by city code first, then by GR number within each city
    const sortedTransitBiltiesData = [...transitBiltiesData].sort((a, b) => {
      // First sort by city code (to_city_code) alphabetically
      const cityA = (a.to_city_code || '').toUpperCase();
      const cityB = (b.to_city_code || '').toUpperCase();
      
      if (cityA !== cityB) {
        return cityA.localeCompare(cityB);
      }
      
      // If same city, sort by GR number
      const grA = (a.gr_no || '').toUpperCase();
      const grB = (b.gr_no || '').toUpperCase();
      
      // Handle mixed alphanumeric GR numbers properly
      return grA.localeCompare(grB, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    // Get branch details for from and to
    const fromBranch = branches.find(b => b.id === selectedChallanBook?.from_branch_id) || userBranch;
    const toBranch = branches.find(b => b.id === selectedChallanBook?.to_branch_id);
      // Add header function
    const addHeader = (pageNum) => {
      // Only add full header details on first page
      if (pageNum === 1) {
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
        doc.text(`To: ${toBranch?.branch_name || 'Unknown'} (${toBranch?.city_code || ''})`, pageWidth - margin - 80, 50);      } else {
        // For subsequent pages, just add minimal header with smaller text
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('CHALLAN (Continued)', pageWidth / 2, 12, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`Challan No: ${selectedChallan.challan_no}`, pageWidth - margin, 12, { align: 'right' });
        
        // No horizontal line for cleaner look
      }
      
      // Page Number (for all pages)
      doc.setFontSize(8);
      doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    };
    
    // Add first page header
    addHeader(1);
      // Calculate totals
    const totalPackages = sortedTransitBiltiesData.reduce((sum, bilty) => sum + (bilty.no_of_pkg || 0), 0);
    const totalWeight = sortedTransitBiltiesData.reduce((sum, bilty) => sum + (bilty.wt || 0), 0);
    const toPaidAmount = sortedTransitBiltiesData.filter(b => b.payment_mode === 'to-pay').reduce((sum, bilty) => sum + (bilty.total || 0), 0);
    const paidAmount = sortedTransitBiltiesData.filter(b => b.payment_mode === 'paid').reduce((sum, bilty) => sum + (bilty.total || 0), 0);
    
    // Count individual e-way bills properly - split by comma and count each one
    const totalEwayBills = sortedTransitBiltiesData.reduce((total, bilty) => {
      if (bilty.e_way_bill && bilty.e_way_bill.trim() !== '') {
        // Split by comma and count each individual e-way bill
        const ewayBills = bilty.e_way_bill.split(',').filter(bill => bill.trim() !== '');
        return total + ewayBills.length;
      }
      return total;
    }, 0);    // Table data with serial numbers - Convert text to CAPS
    const tableData = sortedTransitBiltiesData.map((bilty, index) => [
      (index + 1).toString(), // S.No
      (bilty.gr_no || '').toUpperCase(),
      (bilty.consignor_name || '').toUpperCase(),
      (bilty.consignee_name || '').toUpperCase(),
      (bilty.contain || '').toUpperCase(),
      (bilty.no_of_pkg || 0).toString(),
      Math.round(bilty.wt || 0).toString(),
      bilty.payment_mode === 'to-pay' ? `${(bilty.total || 0).toFixed(2)}` : '',
      bilty.payment_mode === 'paid' ? `${(bilty.total || 0).toFixed(2)}` : '',
      (bilty.to_city_code || '').toUpperCase(),
      bilty.pvt_marks ? `${(bilty.pvt_marks || '').toString().toUpperCase()}/${bilty.no_of_pkg || 0}` : `/${bilty.no_of_pkg || 0}`,
      (bilty.e_way_bill || '').toUpperCase()
    ]);
      // Create main table with full width
    autoTable(doc, {
      startY: 58, // Start after header for first page
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
      },      styles: { 
        fontSize: 8.5, 
        cellPadding: 1.5,
        overflow: 'linebreak', // Keep linebreak for text wrapping within cells
        valign: 'middle',
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255], // White background
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        minCellHeight: 8, // Minimum height to prevent cramped text
        rowPageBreak: 'avoid' // Prevent rows from breaking across pages
      },      columnStyles: {
        0: { halign: 'center', cellWidth: 15, fontStyle: 'bold' }, // S.No
        1: { halign: 'center', cellWidth: 28, fontStyle: 'bold', fontSize: 10 }, // GR No - bigger font
        2: { cellWidth: 35, overflow: 'linebreak', fontSize: 7.5 }, // Consignor - slightly smaller font
        3: { cellWidth: 35, overflow: 'linebreak', fontSize: 7.5 }, // Consignee - slightly smaller font
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
        // Add header to all pages
        addHeader(data.pageNumber);        // For subsequent pages, adjust startY to account for smaller header
        if (data.pageNumber > 1) {
          // Move table starting position up for subsequent pages with smaller header (no line now)
          const tableStartY = 18; // Adjusted for no horizontal line
          if (data.table.startPageY !== tableStartY) {
            data.table.startPageY = tableStartY;
          }
        }
      }
    });
    
    // Add TOTAL row after table
    const tableEndY = doc.lastAutoTable.finalY + 5;
      // Add totals row
    autoTable(doc, {
      startY: tableEndY,
      body: [['', '', '', '', 'TOTAL', totalPackages.toString(), Math.round(totalWeight).toString(), toPaidAmount.toFixed(2), paidAmount.toFixed(2), '', '', totalEwayBills.toString()]],
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
      let filteredData = transitBilties;
      
      // Filter by city if challan type and city is selected
      if (type === 'challan' && selectedCity !== 'all') {
        filteredData = transitBilties.filter(b => b.to_city_code === selectedCity);
      }
      
      if (type === 'loading') {
        doc = await generateLoadingChallanPDFBlob(filteredData);
        filename = `Loading_Challan_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      } else if (type === 'challan') {
        doc = await generateChallanBiltiesPDFBlob(filteredData);
        const cityPart = selectedCity !== 'all' ? `_${selectedCity}` : '';
        filename = `Challan_${selectedChallan.challan_no}${cityPart}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
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
  }, [isOpen, type, bilties, transitBilties, selectedChallan, selectedChallanBook, userBranch, permanentDetails, branches, selectedCity, generatePDFBlob]);

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
      <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-full max-h-full m-4 flex flex-col" style={{ backgroundColor: '#fbfaf9' }}>
        {/* Header */}
        <div className="p-3 border-b border-purple-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {type === 'loading' ? (
                <>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Loading Challan Preview</h3>
                    <p className="text-purple-100 text-xs">Generate and preview loading challan document</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      Challan Preview - {selectedChallan?.challan_no}
                    </h3>
                    <p className="text-purple-100 text-xs">Generate and preview challan document</p>
                  </div>
                </>
              )}
            </div>
            
            {/* City Filter for Challan Type - Prominent Position */}
            {type === 'challan' && availableCities.length > 0 && (
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg border border-white/30">
                <span className="text-white text-sm font-bold">🎯 Filter by City:</span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-white text-gray-800 border border-gray-300 rounded-lg px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-md"
                >
                  <option value="all">🌍 All Cities ({transitBilties.length} bilties)</option>
                  {availableCities.map(city => {
                    const count = transitBilties.filter(b => b.to_city_code === city).length;
                    return (
                      <option key={city} value={city}>
                        📍 {city} ({count} bilties)
                      </option>
                    );
                  })}
                </select>
                {selectedCity !== 'all' && (
                  <button
                    onClick={() => setSelectedCity('all')}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            )}

            {/* Document Info */}
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-purple-200" />
                <span className="text-purple-200">Type:</span>
                <span className="font-bold">{type === 'loading' ? 'Loading Challan' : 'Transit Challan'}</span>
              </div>
              
              {type === 'challan' && (
                <div>
                  <span className="text-purple-200">Challan No:</span>
                  <span className="ml-1 font-bold">{selectedChallan?.challan_no}</span>
                </div>
              )}
              
              <div>
                <span className="text-purple-200">Date:</span>
                <span className="ml-1 font-bold">{format(new Date(), 'dd/MM/yyyy')}</span>
              </div>
              
              <div>
                <span className="text-purple-200">{type === 'challan' && selectedCity !== 'all' ? 'Filtered' : 'Total'} Bilties:</span>
                <span className="ml-1 font-bold">
                  {type === 'challan' && selectedCity !== 'all' 
                    ? `${transitBilties.filter(b => b.to_city_code === selectedCity).length} (of ${transitBilties.length})`
                    : transitBilties.length}
                </span>
              </div>

              {transitBilties.length > 0 && (() => {
                const displayBilties = type === 'challan' && selectedCity !== 'all'
                  ? transitBilties.filter(b => b.to_city_code === selectedCity)
                  : transitBilties;
                
                return (
                  <>
                    <div>
                      <span className="text-purple-200">Packages:</span>
                      <span className="ml-1 font-bold">{displayBilties.reduce((sum, bilty) => sum + (bilty.no_of_pkg || 0), 0)}</span>
                    </div>
                    <div>
                      <span className="text-purple-200">Weight:</span>
                      <span className="ml-1 font-bold">{Math.round(displayBilties.reduce((sum, bilty) => sum + (bilty.wt || 0), 0))} kg</span>
                    </div>
                    <div>
                      <span className="text-purple-200">E-way Bills:</span>
                      <span className="ml-1 font-bold">
                        {displayBilties.reduce((total, bilty) => {
                          if (bilty.e_way_bill && bilty.e_way_bill.trim() !== '') {
                            const ewayBills = bilty.e_way_bill.split(',').filter(bill => bill.trim() !== '');
                            return total + ewayBills.length;
                          }
                          return total;
                        }, 0)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={generatePDFBlob}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
              >
                <Eye className="w-3 h-3" />
                {loading ? 'Generating...' : 'Generate'}
              </button>

              <button
                onClick={handleDownload}
                disabled={loading || error || !pdfUrl}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
              
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded transition-all hover:scale-105"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>        {/* Main Content - Full Width PDF Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* PDF Preview */}
          <div className="flex-1 p-2 bg-gray-50 overflow-hidden flex flex-col">
            <div className="mb-2 flex items-center justify-end">
              {/* Status Display */}
              {loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <div>
                    <div className="text-sm font-semibold text-blue-800">Generating PDF...</div>
                    <div className="text-xs text-blue-600">Please wait</div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
                  <div className="bg-red-100 p-1 rounded">
                    <FileText className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-red-800">Error</div>
                    <div className="text-xs text-red-600">{error}</div>
                  </div>
                  <button
                    onClick={generatePDFBlob}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-semibold transition-colors ml-3"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-lg">
              {!loading && !error && pdfUrl && (
                <iframe
                  ref={pdfViewerRef}
                  src={pdfUrl}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              )}

              {!loading && !error && !pdfUrl && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-600" />
                    </div>
                    <div className="text-lg font-semibold text-gray-800 mb-2">No Preview Available</div>
                    <div className="text-gray-600 mb-4">Click Generate Preview to view the PDF</div>
                    <button
                      onClick={generatePDFBlob}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold"
                    >
                      Generate Preview
                    </button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-4"></div>
                    <div className="text-lg font-semibold text-gray-800 mb-2">Generating Preview...</div>
                    <div className="text-purple-600">Please wait while we create your document</div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="text-lg font-semibold text-red-800 mb-2">Preview Error</div>
                    <div className="text-red-600 mb-4 text-sm">{error}</div>
                    <button
                      onClick={generatePDFBlob}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 text-gray-700">
              {type === 'loading' && (
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3 text-purple-600" />
                  Bilties: <span className="font-bold text-purple-600">{transitBilties.length}</span>
                </span>
              )}
              {type === 'challan' && (
                <>
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-purple-600" />
                    Challan: <span className="font-bold text-purple-600">{selectedChallan?.challan_no}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3 text-blue-600" />
                    Bilties: <span className="font-bold text-blue-600">{transitBilties.length}</span>
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    selectedChallan?.is_dispatched 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedChallan?.is_dispatched ? 'DISPATCHED' : 'PENDING'}
                  </span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {type === 'challan' && selectedCity !== 'all' && (
                <div className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-300">
                  🎯 Filtered: {selectedCity}
                </div>
              )}
              <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallanPDFPreview;