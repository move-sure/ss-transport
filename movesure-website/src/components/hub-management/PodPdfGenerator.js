import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const fmtNum = (v) => {
  const n = parseFloat(v || 0);
  const parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

/**
 * Generate Proof of Delivery (POD) PDF for a bilty
 * @param {Object} b - enriched bilty object
 * @param {Object} kd - kaat data for the bilty (optional)
 * @param {Object} challan - challan details (optional)
 */
export function generatePodPdf(b, kd, challan) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const fmtDate = (d) => {
    if (!d) return '-';
    try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return '-'; }
  };

  // ===== HEADER =====
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PROOF OF DELIVERY (POD)', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SS TRANSPORT - Hub Management', pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 28, { align: 'center' });

  y = 40;

  // ===== GR & CHALLAN INFO BOX =====
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`GR No: ${b.gr_no || '-'}`, margin + 4, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Challan: ${challan?.challan_no || b.challan_no || '-'}`, margin + 4, y + 15);
  doc.text(`Date: ${fmtDate(b.bilty_date)}`, margin + contentWidth / 2, y + 8);
  doc.text(`Destination: ${b.destination || '-'}`, margin + contentWidth / 2, y + 15);

  y += 28;

  // ===== CONSIGNOR / CONSIGNEE =====
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229); // indigo
  doc.text('CONSIGNOR DETAILS', margin, y);
  doc.text('CONSIGNEE DETAILS', margin + contentWidth / 2, y);
  y += 5;

  doc.setDrawColor(200);
  doc.line(margin, y, margin + contentWidth / 2 - 4, y);
  doc.line(margin + contentWidth / 2, y, margin + contentWidth, y);
  y += 5;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  doc.text(`Name: ${b.consignor || '-'}`, margin, y);
  doc.text(`Name: ${b.consignee || '-'}`, margin + contentWidth / 2, y);
  y += 5;
  doc.text(`Phone: ${b.consignor_number || '-'}`, margin, y);
  doc.text(`Phone: ${b.consignee_number || '-'}`, margin + contentWidth / 2, y);
  y += 8;

  // ===== BILTY DETAILS TABLE =====
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('BILTY DETAILS', margin, y);
  y += 2;

  const detailRows = [
    ['Packets', String(b.packets || 0), 'Weight (Kg)', parseFloat(b.weight || 0).toFixed(2)],
    ['Amount (Rs)', fmtNum(b.amount), 'Freight (Rs)', fmtNum(b.freight_amount)],
    ['Payment Mode', (b.payment || '-').toUpperCase(), 'Delivery Type', (b.delivery_type || '-').toUpperCase()],
    ['E-Way Bill', b.e_way_bill || '-', 'Pvt Marks', b.pvt_marks || '-'],
    ['Contains', b.contain || '-', 'Transport', b.transport_name || '-'],
  ];

  autoTable(doc, {
    startY: y,
    body: detailRows,
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: contentWidth * 0.2, fillColor: [241, 245, 249] },
      1: { cellWidth: contentWidth * 0.3 },
      2: { fontStyle: 'bold', cellWidth: contentWidth * 0.2, fillColor: [241, 245, 249] },
      3: { cellWidth: contentWidth * 0.3 },
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ===== CHARGES TABLE =====
  const labourCharge = parseFloat(b.labour_charge || 0);
  const ddCharge = parseFloat(kd?.dd_chrg || 0);
  const kaatAmt = parseFloat(kd?.kaat || 0);
  const biltyCharge = parseFloat(kd?.bilty_chrg || 0);
  const ewbCharge = parseFloat(kd?.ewb_chrg || 0);
  const labourKaat = parseFloat(kd?.labour_chrg || 0);
  const otherCharge = parseFloat(kd?.other_chrg || 0);
  const pfCharge = parseFloat(kd?.pf || 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('CHARGES & KAAT DETAILS', margin, y);
  y += 2;

  const chargeRows = [
    ['Kaat (Rs)', kaatAmt.toFixed(2), 'Bilty Charge (Rs)', biltyCharge.toFixed(2)],
    ['EWB Charge (Rs)', ewbCharge.toFixed(2), 'Labour Charge (Rs)', labourKaat.toFixed(2)],
    ['DD Charge (Rs)', ddCharge.toFixed(2), 'PF (Rs)', pfCharge.toFixed(2)],
    ['Other Charge (Rs)', otherCharge.toFixed(2), 'Labour (Bilty) (Rs)', labourCharge.toFixed(2)],
  ];

  if (kd?.transport_id) {
    const transportName = kd?.transport_name || '-';
    const rateType = kd?.rate_type || '-';
    const rateVal = kd?.rate_type === 'per_kg' ? (kd?.rate_per_kg || 0) : (kd?.rate_per_pkg || 0);
    chargeRows.push(['Transport', transportName, 'Rate', `${rateType === 'per_kg' ? '₹/Kg' : '₹/Pkg'} ${rateVal}`]);
  }

  if (kd?.pohonch_no || kd?.bilty_number) {
    chargeRows.push(['Pohonch No', kd?.pohonch_no || '-', 'Bilty Number', kd?.bilty_number || '-']);
  }

  const totalCharges = kaatAmt + biltyCharge + ewbCharge + labourKaat + otherCharge + ddCharge + pfCharge;
  chargeRows.push(['', '', 'TOTAL CHARGES (Rs)', totalCharges.toFixed(2)]);

  autoTable(doc, {
    startY: y,
    body: chargeRows,
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: contentWidth * 0.2, fillColor: [241, 245, 249] },
      1: { cellWidth: contentWidth * 0.3 },
      2: { fontStyle: 'bold', cellWidth: contentWidth * 0.2, fillColor: [241, 245, 249] },
      3: { cellWidth: contentWidth * 0.3 },
    },
    didParseCell: (data) => {
      // Bold the total row
      if (data.row.index === chargeRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index >= 2) {
          data.cell.styles.fillColor = [30, 41, 59];
          data.cell.styles.textColor = [255, 255, 255];
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ===== REMARKS =====
  if (b.remark) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Remarks:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(b.remark, margin + 20, y);
    y += 8;
  }

  // ===== SIGNATURE SECTION =====
  y = Math.max(y + 5, 220);

  doc.setDrawColor(200);
  doc.setLineWidth(0.5);

  // Left signature
  doc.line(margin, y + 15, margin + 60, y + 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100);
  doc.text('Receiver\'s Signature', margin, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Name: ________________________', margin, y + 27);
  doc.text('Date: _________________________', margin, y + 33);

  // Right signature
  doc.line(pageWidth - margin - 60, y + 15, pageWidth - margin, y + 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Delivery Person\'s Signature', pageWidth - margin - 60, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Name: ________________________', pageWidth - margin - 60, y + 27);
  doc.text('Date: _________________________', pageWidth - margin - 60, y + 33);

  // ===== FOOTER =====
  const footY = doc.internal.pageSize.getHeight() - 8;
  doc.setFillColor(241, 245, 249);
  doc.rect(0, footY - 5, pageWidth, 13, 'F');
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('This is a system-generated Proof of Delivery (POD). Please verify all details before signing.', pageWidth / 2, footY, { align: 'center' });

  // Return blob URL for modal preview
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
