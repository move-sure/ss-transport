'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Generate Loading Challan PDF (Simple portrait mode - GR No, basic details)
export const generateLoadingChallanPDF = async (bilties, userBranch, permanentDetails, branches = []) => {
  try {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    // Get branch details
    const fromBranch = branches.find(b => b.id === userBranch?.id) || userBranch;
    
    // Professional Letter Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LOADING CHALLAN', 105, 25, { align: 'center' });
    
    // Company Details - Professional Layout
    if (permanentDetails) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(permanentDetails.transport_name || 'S. S. TRANSPORT CORPORATION', 105, 35, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (permanentDetails.transport_address) {
        doc.text(permanentDetails.transport_address, 105, 42, { align: 'center' });
      }
      
      const contactInfo = [];
      if (permanentDetails.mobile_number) contactInfo.push(`Mobile: ${permanentDetails.mobile_number}`);
      if (permanentDetails.gst) contactInfo.push(`GST: ${permanentDetails.gst}`);
      
      if (contactInfo.length > 0) {
        doc.text(contactInfo.join(' | '), 105, 48, { align: 'center' });
      }
    }
    
    // Add border line
    doc.setLineWidth(0.5);
    doc.line(15, 55, 195, 55);
    
    // Branch and Date Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`From: ${fromBranch?.branch_name || 'Unknown'} (${fromBranch?.city_code || ''})`, 20, 65);
    doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, 150, 65);
    doc.text(`Total Bilties: ${bilties.length}`, 20, 72);
    
    // Calculate totals
    const totalPackages = bilties.reduce((sum, bilty) => sum + bilty.no_of_pkg, 0);
    const totalWeight = bilties.reduce((sum, bilty) => sum + (bilty.wt || 0), 0);
    
    doc.text(`Total Weight: ${totalWeight.toFixed(2)} KG`, 150, 72);
    
    // Table data with proper handling of long names
    const tableData = bilties.map((bilty, index) => [
      index + 1,
      bilty.gr_no,
      format(new Date(bilty.bilty_date), 'dd/MM/yy'),
      bilty.consignor_name,
      bilty.consignee_name,
      bilty.to_city_name,
      bilty.no_of_pkg.toString(),
      (bilty.wt || 0).toString(),
      bilty.pvt_marks || '-'
    ]);
    
    // Create table
    autoTable(doc, {
      startY: 80,
      head: [['S.No', 'GR Number', 'Date', 'Consignor', 'Consignee', 'To City', 'Pkgs', 'Weight', 'Pvt.Mark']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 18 },
        3: { cellWidth: 35, overflow: 'linebreak' },
        4: { cellWidth: 35, overflow: 'linebreak' },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'center', cellWidth: 15 },
        7: { halign: 'center', cellWidth: 18 },
        8: { cellWidth: 22, overflow: 'linebreak' }
      },
      margin: { left: 15, right: 15 },
      didParseCell: function(data) {
        // Increase row height for long text
        if (data.column.index === 3 || data.column.index === 4) { // Consignor/Consignee columns
          const text = data.cell.text[0];
          if (text && text.length > 20) {
            data.row.height = Math.max(data.row.height, 12);
          }
        }
      }
    });
    
    // Summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Packages: ${totalPackages}`, 20, finalY);
    doc.text(`Total Weight: ${totalWeight.toFixed(2)} KG`, 100, finalY);
    doc.text(`Total Bilties: ${bilties.length}`, 150, finalY);
    
    // Footer
    doc.setLineWidth(0.5);
    doc.line(15, 275, 195, 275);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 20, 285);
    doc.text('Authorized Signature: ___________________', 130, 285);
    
    // Generate filename
    const filename = `Loading_Challan_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    console.log('Loading Challan PDF generated successfully:', filename);
    
  } catch (error) {
    console.error('Error generating Loading Challan PDF:', error);
    throw new Error(`Failed to generate Loading Challan PDF: ${error.message}`);
  }
};

// Generate Challan Bilties PDF (Landscape mode for better space)
export const generateChallanBiltiesPDF = async (transitBilties, selectedChallan, userBranch, permanentDetails, selectedChallanBook = null, branches = []) => {
  try {
    // Use landscape orientation for better table layout
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Get branch details for from and to
    const fromBranch = branches.find(b => b.id === selectedChallanBook?.from_branch_id) || userBranch;
    const toBranch = branches.find(b => b.id === selectedChallanBook?.to_branch_id);
    
    // Professional Letter Header - Full Width
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('CHALLAN', 148, 20, { align: 'center' });
    
    // Company Details in Header Style
    if (permanentDetails) {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(permanentDetails.transport_name || 'S. S. TRANSPORT CORPORATION', 148, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (permanentDetails.transport_address) {
        doc.text(permanentDetails.transport_address, 148, 37, { align: 'center' });
      }
      
      const contactInfo = [];
      if (permanentDetails.mobile_number) contactInfo.push(`Mobile: ${permanentDetails.mobile_number}`);
      if (permanentDetails.gst) contactInfo.push(`GST: ${permanentDetails.gst}`);
      
      if (contactInfo.length > 0) {
        doc.text(contactInfo.join(' | '), 148, 43, { align: 'center' });
      }
    }
    
    // Challan Number Box (Top Right)
    doc.setLineWidth(1);
    doc.rect(225, 10, 65, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Challan No.', 227, 20);
    doc.setFontSize(14);
    doc.text(selectedChallan.challan_no, 227, 30);
    doc.setFontSize(8);
    doc.text(`Date: ${format(new Date(selectedChallan.date), 'dd-MM-yyyy')}`, 227, 35);
    
    // Route Information
    doc.setLineWidth(0.5);
    doc.line(15, 50, 282, 50);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`From: ${fromBranch?.branch_name || 'Unknown'} (${fromBranch?.city_code || ''})`, 20, 60);
    doc.text(`To: ${toBranch?.branch_name || 'Unknown'} (${toBranch?.city_code || ''})`, 180, 60);
    
    // Transport Details Section (Left Side)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSPORT DETAILS:', 20, 75);
    
    doc.setFont('helvetica', 'normal');
    let yPos = 82;
    
    if (selectedChallan.truck) {
      doc.text(`Truck No: ${selectedChallan.truck.truck_number}`, 20, yPos);
      yPos += 6;
    }
    
    if (selectedChallan.driver) {
      doc.text(`Driver: ${selectedChallan.driver.name}`, 20, yPos);
      yPos += 6;
    }
    
    if (selectedChallan.owner) {
      doc.text(`Owner: ${selectedChallan.owner.name}`, 20, yPos);
      yPos += 6;
    }
    
    // Status and Totals (Right Side)
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY:', 180, 75);
    
    doc.setFont('helvetica', 'normal');
    const dispatchStatus = selectedChallan.is_dispatched ? 'DISPATCHED' : 'PENDING';
    doc.text(`Status: ${dispatchStatus}`, 180, 82);
    doc.text(`Total Bilties: ${transitBilties.length}`, 180, 88);
    
    // Calculate totals
    const totalAmount = transitBilties.reduce((sum, bilty) => sum + bilty.total, 0);
    const totalPackages = transitBilties.reduce((sum, bilty) => sum + bilty.no_of_pkg, 0);
    const totalWeight = transitBilties.reduce((sum, bilty) => sum + (bilty.wt || 0), 0);
    const toPaidAmount = transitBilties.filter(b => b.payment_mode === 'to-pay').reduce((sum, bilty) => sum + bilty.total, 0);
    const paidAmount = transitBilties.filter(b => b.payment_mode === 'paid').reduce((sum, bilty) => sum + bilty.total, 0);
    
    doc.text(`Total Weight: ${totalWeight.toFixed(2)} KG`, 180, 94);
    
    // Table data with proper formatting
    const tableData = transitBilties.map((bilty, index) => [
      index + 1,
      bilty.gr_no,
      format(new Date(bilty.bilty_date), 'dd/MM'),
      bilty.consignor_name,
      bilty.consignee_name,
      bilty.contain || '',
      bilty.no_of_pkg.toString(),
      (bilty.wt || 0).toString(),
      bilty.payment_mode === 'to-pay' ? `₹${bilty.total.toFixed(2)}` : '',
      bilty.payment_mode === 'paid' ? `₹${bilty.total.toFixed(2)}` : '',
      bilty.e_way_bill || '',
      bilty.pvt_marks || ''
    ]);
    
    // Create professional table
    autoTable(doc, {
      startY: 105,
      head: [['S.No', 'G.R. No.', 'Date', 'Consignor', 'Consignee', 'Cont.', 'Pckg.', 'Weight', 'To-Pay', 'Paid', 'E-way Bill', 'Pvt.M']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 53, 69],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2
      },
      styles: { 
        fontSize: 7, 
        cellPadding: 1.5,
        overflow: 'linebreak',
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 18 },
        3: { cellWidth: 35, overflow: 'linebreak' },
        4: { cellWidth: 35, overflow: 'linebreak' },
        5: { cellWidth: 20, overflow: 'linebreak' },
        6: { halign: 'center', cellWidth: 15 },
        7: { halign: 'center', cellWidth: 18 },
        8: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
        9: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
        10: { halign: 'center', cellWidth: 20 },
        11: { cellWidth: 20, overflow: 'linebreak' }
      },
      margin: { left: 15, right: 15 },
      didParseCell: function(data) {
        // Color coding for payment columns
        if (data.column.index === 8 && data.cell.text[0]) { // To-Pay column
          data.cell.styles.fillColor = [255, 243, 224];
        }
        if (data.column.index === 9 && data.cell.text[0]) { // Paid column
          data.cell.styles.fillColor = [220, 252, 231];
        }
        
        // Increase row height for long text
        if (data.column.index === 3 || data.column.index === 4) {
          const text = data.cell.text[0];
          if (text && text.length > 25) {
            data.row.height = Math.max(data.row.height, 12);
          }
        }
      }
    });
    
    // Summary Section
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Left side summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Packages: ${totalPackages}`, 20, finalY);
    doc.text(`Total Weight: ${totalWeight.toFixed(2)} KG`, 20, finalY + 7);
    doc.text(`Total Bilties: ${transitBilties.length}`, 20, finalY + 14);
    
    // Right side payment summary
    doc.text(`To-Pay Amount: ₹${toPaidAmount.toFixed(2)}`, 180, finalY);
    doc.text(`Paid Amount: ₹${paidAmount.toFixed(2)}`, 180, finalY + 7);
    doc.text(`Grand Total: ₹${totalAmount.toFixed(2)}`, 180, finalY + 14);
    
    // Footer
    doc.setLineWidth(0.5);
    doc.line(15, 195, 282, 195);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 20, 205);
    doc.text('For S. S. TRANSPORT CORPORATION', 180, 205);
    doc.text('Authorized Signatory: ___________________', 180, 212);
    
    // Generate filename
    const filename = `Challan_${selectedChallan.challan_no}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    console.log('Challan PDF generated successfully:', filename);
    
  } catch (error) {
    console.error('Error generating Challan PDF:', error);
    throw new Error(`Failed to generate Challan PDF: ${error.message}`);
  }
};