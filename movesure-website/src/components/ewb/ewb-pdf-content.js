'use client';

import QRCode from 'qrcode';

// Shared, pure PDF-drawing helpers for e-Way Bill pages — used by both the
// single-EWB EWBPDFGenerator modal and the Part B "Bulk Print" feature, so
// the same page layout only has to be maintained in one place.

export const generateQRCode = async (text) => {
  try {
    return await QRCode.toDataURL(text, { width: 200, margin: 1 });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return dateString;
};

// jsPDF's standard Helvetica font has no glyph for the Unicode rupee sign
// (U+20B9); it renders as a garbled superscript "¹". Use "Rs." instead.
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rs.0.00';
  return `Rs.${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Pulls the eway-bill "message" object out of the various response shapes
// used across validation results / cached results / raw API responses.
export const extractEwbMessage = (ewbData) => {
  if (ewbData?.data) {
    if (ewbData.data.data?.results?.message) return ewbData.data.data.results.message;
    if (ewbData.data.results?.message) return ewbData.data.results.message;
    return ewbData.data;
  }
  return ewbData?.message || ewbData;
};

// Draws one full A4 e-Way Bill page into `pdf` starting at its current
// page (call pdf.addPage() yourself beforehand for pages after the first).
export const addEWBContent = (pdf, message, qrDataURL) => {
  const pageWidth = 210;
  const margin = 10;
  let yPos = 15;

  const addText = (text, x, y, options = {}) => {
    pdf.setFontSize(options.size || 10);
    pdf.setFont(options.font || 'helvetica', options.style || 'normal');
    pdf.text(text, x, y, options.align ? { align: options.align } : {});
  };

  const drawLine = (x1, y1, x2, y2, thickness = 0.5) => {
    pdf.setLineWidth(thickness);
    pdf.line(x1, y1, x2, y2);
  };

  // Header - e-Way Bill
  pdf.setFillColor(240, 240, 240);
  pdf.rect(0, 0, pageWidth, 35, 'F');

  addText('e-Way Bill', pageWidth / 2, 12, { size: 20, style: 'bold', align: 'center' });

  if (qrDataURL) {
    pdf.addImage(qrDataURL, 'PNG', pageWidth - 35, 5, 25, 25);
  }

  yPos = 20;

  drawLine(margin, yPos, pageWidth - margin, yPos, 0.5);
  yPos += 5;

  addText('E-Way Bill Details', margin, yPos, { size: 11, style: 'bold' });
  yPos += 6;

  addText(`E-way Bill No.: ${message.eway_bill_number || 'N/A'}`, margin, yPos, { size: 10, style: 'bold' });
  addText(`Generated Date: ${formatDate(message.eway_bill_date)}`, pageWidth - margin - 60, yPos);
  yPos += 6;

  addText(`Mode: ${message.generate_mode || 'N/A'}`, margin, yPos);
  addText(`Valid Till: ${formatDate(message.eway_bill_valid_date) || 'N/A'}`, pageWidth - margin - 60, yPos);
  yPos += 6;

  addText(`Document Type: ${message.document_type || 'N/A'}`, margin, yPos);
  addText(`Transaction Type: ${message.transaction_type || 'N/A'}`, pageWidth - margin - 60, yPos);
  yPos += 6;

  addText(`Document No.: ${message.document_number || 'N/A'}`, margin, yPos);
  addText(`Document Date: ${formatDate(message.document_date)}`, pageWidth - margin - 60, yPos);
  yPos += 8;

  // Address Details
  drawLine(margin, yPos, pageWidth - margin, yPos, 1);
  yPos += 5;

  addText('Address Details', margin, yPos, { size: 11, style: 'bold' });
  yPos += 6;

  // From Section
  addText('From:', margin, yPos, { size: 10, style: 'bold' });
  yPos += 5;

  addText(`GSTIN: ${message.gstin_of_consignor || 'N/A'}`, margin + 5, yPos, { size: 9 });
  yPos += 4;

  addText(`Legal Name: ${message.legal_name_of_consignor || 'N/A'}`, margin + 5, yPos, { size: 9 });
  yPos += 4;

  const address1Lines = pdf.splitTextToSize(message.address1_of_consignor || 'N/A', 90);
  address1Lines.forEach((line) => {
    addText(line, margin + 5, yPos, { size: 9 });
    yPos += 4;
  });

  if (message.address2_of_consignor) {
    const address2Lines = pdf.splitTextToSize(message.address2_of_consignor, 90);
    address2Lines.forEach((line) => {
      addText(line, margin + 5, yPos, { size: 9 });
      yPos += 4;
    });
  }

  addText(`Place: ${message.place_of_consignor || 'N/A'}, ${message.state_of_consignor || 'N/A'}`, margin + 5, yPos, { size: 9 });
  addText(`PIN: ${message.pincode_of_consignor || 'N/A'}`, margin + 50, yPos, { size: 9 });
  yPos += 6;

  // To Section
  addText('To:', margin, yPos, { size: 10, style: 'bold' });
  yPos += 5;

  addText(`GSTIN: ${message.gstin_of_consignee || 'N/A'}`, margin + 5, yPos, { size: 9 });
  yPos += 4;

  addText(`Legal Name: ${message.legal_name_of_consignee || 'N/A'}`, margin + 5, yPos, { size: 9 });
  yPos += 4;

  const consigneeAddr1Lines = pdf.splitTextToSize(message.address1_of_consignee || 'N/A', 90);
  consigneeAddr1Lines.forEach((line) => {
    addText(line, margin + 5, yPos, { size: 9 });
    yPos += 4;
  });

  if (message.address2_of_consignee) {
    const consigneeAddr2Lines = pdf.splitTextToSize(message.address2_of_consignee, 90);
    consigneeAddr2Lines.forEach((line) => {
      addText(line, margin + 5, yPos, { size: 9 });
      yPos += 4;
    });
  }

  addText(`Place: ${message.place_of_consignee || 'N/A'}, ${message.actual_to_state_name || 'N/A'}`, margin + 5, yPos, { size: 9 });
  addText(`PIN: ${message.pincode_of_consignee || 'N/A'}`, margin + 50, yPos, { size: 9 });
  yPos += 8;

  // Goods Details
  drawLine(margin, yPos, pageWidth - margin, yPos, 1);
  yPos += 5;

  addText('Goods Details', margin, yPos, { size: 11, style: 'bold' });
  yPos += 6;

  const colX = [margin, margin + 10, margin + 35, margin + 100, margin + 120, margin + 140, margin + 165];

  pdf.setFillColor(220, 220, 220);
  pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');

  addText('#', colX[0], yPos, { size: 8, style: 'bold' });
  addText('HSN', colX[1], yPos, { size: 8, style: 'bold' });
  addText('Description', colX[2], yPos, { size: 8, style: 'bold' });
  addText('Qty', colX[3], yPos, { size: 8, style: 'bold' });
  addText('Unit', colX[4], yPos, { size: 8, style: 'bold' });
  addText('Taxable Amt', colX[5], yPos, { size: 8, style: 'bold' });
  addText('Tax Rate', colX[6], yPos, { size: 8, style: 'bold' });

  yPos += 5;
  drawLine(margin, yPos, pageWidth - margin, yPos, 0.5);
  yPos += 4;

  const itemList = message.itemList || [];
  itemList.forEach((item, index) => {
    if (yPos > 270) {
      pdf.addPage();
      yPos = 20;
    }

    addText(item.item_number?.toString() || (index + 1).toString(), colX[0], yPos, { size: 8 });
    addText(item.hsn_code?.toString() || 'N/A', colX[1], yPos, { size: 8 });

    const descLines = pdf.splitTextToSize(item.product_description || 'N/A', 60);
    descLines.forEach((line, idx) => {
      addText(line, colX[2], yPos + (idx * 4), { size: 8 });
    });

    addText(item.quantity?.toString() || '0', colX[3], yPos, { size: 8 });
    addText(item.unit_of_product || 'PCS', colX[4], yPos, { size: 8 });
    addText(formatCurrency(item.taxable_amount), colX[5], yPos, { size: 8 });
    addText(`${item.cgst_rate + item.sgst_rate || 0}%`, colX[6], yPos, { size: 8 });

    yPos += Math.max(4, descLines.length * 4);
    drawLine(margin, yPos, pageWidth - margin, yPos, 0.2);
    yPos += 4;
  });

  yPos += 2;

  // Tax Summary
  drawLine(margin, yPos, pageWidth - margin, yPos, 1);
  yPos += 5;

  addText('Tax Summary', margin, yPos, { size: 11, style: 'bold' });
  yPos += 6;

  const taxLabelX = margin + 95;
  const taxValueX = pageWidth - margin;

  addText('Taxable Amount:', taxLabelX, yPos, { size: 9 });
  addText(formatCurrency(message.taxable_amount), taxValueX, yPos, { size: 9, align: 'right' });
  yPos += 5;

  if (message.cgst_amount > 0) {
    addText('CGST:', taxLabelX, yPos, { size: 9 });
    addText(formatCurrency(message.cgst_amount), taxValueX, yPos, { size: 9, align: 'right' });
    yPos += 5;
  }

  if (message.sgst_amount > 0) {
    addText('SGST:', taxLabelX, yPos, { size: 9 });
    addText(formatCurrency(message.sgst_amount), taxValueX, yPos, { size: 9, align: 'right' });
    yPos += 5;
  }

  if (message.igst_amount > 0) {
    addText('IGST:', taxLabelX, yPos, { size: 9 });
    addText(formatCurrency(message.igst_amount), taxValueX, yPos, { size: 9, align: 'right' });
    yPos += 5;
  }

  if (message.cess_amount > 0) {
    addText('Cess:', taxLabelX, yPos, { size: 9 });
    addText(formatCurrency(message.cess_amount), taxValueX, yPos, { size: 9, align: 'right' });
    yPos += 5;
  }

  if (message.other_value > 0) {
    addText('Other:', taxLabelX, yPos, { size: 9 });
    addText(formatCurrency(message.other_value), taxValueX, yPos, { size: 9, align: 'right' });
    yPos += 5;
  }

  drawLine(taxLabelX, yPos, taxValueX, yPos, 0.5);
  yPos += 5;

  addText('Total Invoice Value:', taxLabelX, yPos, { size: 10, style: 'bold' });
  addText(formatCurrency(message.total_invoice_value), taxValueX, yPos, { size: 10, style: 'bold', align: 'right' });
  yPos += 8;

  // Transportation Details
  drawLine(margin, yPos, pageWidth - margin, yPos, 1);
  yPos += 5;

  addText('Transportation Details', margin, yPos, { size: 11, style: 'bold' });
  yPos += 6;

  addText(`Transporter ID: ${message.transporter_id || 'N/A'}`, margin, yPos, { size: 9 });
  yPos += 5;

  addText(`Transporter Name: ${message.transporter_name || 'N/A'}`, margin, yPos, { size: 9 });
  yPos += 5;

  addText(`Approx Distance: ${message.transportation_distance || 0} KM`, margin, yPos, { size: 9 });
  yPos += 5;

  addText(`Supply Type: ${message.supply_type || 'N/A'}`, margin, yPos, { size: 9 });
  addText(`Sub Supply Type: ${message.sub_supply_type || 'N/A'}`, pageWidth / 2, yPos, { size: 9 });
  yPos += 8;

  // Footer
  yPos = 280;
  drawLine(margin, yPos, pageWidth - margin, yPos, 0.5);
  yPos += 4;

  addText('This is a system generated e-Way Bill', pageWidth / 2, yPos, { size: 8, align: 'center', style: 'italic' });
  addText(`Status: ${message.eway_bill_status || 'N/A'}`, margin, yPos, { size: 8 });
  addText(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - margin - 50, yPos, { size: 8 });
};
