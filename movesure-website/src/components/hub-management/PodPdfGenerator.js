import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const fmtNum = (v) => {
  const n = parseFloat(v || 0);
  const parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

// Load logo once and cache
let logoCache = null;
function loadLogo() {
  if (logoCache) return Promise.resolve(logoCache);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      logoCache = canvas.toDataURL('image/png');
      resolve(logoCache);
    };
    img.onerror = () => resolve(null);
    img.src = '/logo.png';
  });
}

/**
 * Generate Proof of Delivery (POD) PDF — 2 copies on one A4 page
 * Clean white design with Times font, inspired by bilty PDF
 */
export async function generatePodPdf(b, kd, challan, podNo, charges = {}) {
  const logoData = await loadLogo();
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const halfHeight = pageHeight / 2;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const rsChrg = parseFloat(charges.rs_chrg) || 0;
  const labourChrg = parseFloat(charges.labour_chrg) || 0;

  const fmtDate = (d) => {
    if (!d) return '-';
    try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return '-'; }
  };

  const deliveryLabel = (dt) => {
    if (!dt || dt === '-') return '-';
    if (dt.toLowerCase().includes('door') || dt.toLowerCase() === 'dd') return 'DOOR DELIVERY';
    return dt.toUpperCase();
  };

  function drawPodCopy(copyLabel, yOffset) {
    let y = yOffset + 3;

    // ===== HEADER — clean white with logo =====
    // Logo on left
    if (logoData) {
      try { doc.addImage(logoData, 'PNG', margin, y - 1, 16, 16); } catch {}
    }

    // Company name — Times bold like bilty
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('times', 'bold');
    doc.text('S. S. TRANSPORT CORPORATION', pageWidth / 2, y + 4, { align: 'center' });

    // Subtitle
    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    doc.text('PROOF OF DELIVERY', pageWidth / 2, y + 10, { align: 'center' });

    // Copy type on right
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(copyLabel, pageWidth - margin, y + 2, { align: 'right' });

    // Underline below header
    y += 14;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + contentWidth, y);

    y += 4;

    // ===== POD & GR ROW =====
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text(`GR No: ${b.gr_no || '-'}`, margin, y);
    if (podNo) {
      doc.text(`POD No: ${podNo}`, pageWidth / 2, y, { align: 'center' });
    }
    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    doc.text(`Date: ${fmtDate(b.bilty_date)}`, pageWidth - margin, y, { align: 'right' });

    y += 2;
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);

    y += 5;

    // ===== CONSIGNOR / CONSIGNEE =====
    const colW = contentWidth / 2 - 2;

    doc.setFontSize(9);
    doc.setFont('times', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CONSIGNOR:', margin, y);
    doc.text('CONSIGNEE:', margin + colW + 4, y);
    y += 4;
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text((b.consignor || '-').toUpperCase(), margin, y);
    doc.text((b.consignee || '-').toUpperCase(), margin + colW + 4, y);
    y += 4;
    doc.setFontSize(8);
    doc.text(`Ph: ${b.consignor_number || '-'}`, margin, y);
    doc.text(`Ph: ${b.consignee_number || '-'}`, margin + colW + 4, y);

    y += 6;

    // ===== BILTY DETAILS TABLE — clean grid =====
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 1;

    const detailRows = [
      ['Packets', String(b.packets || 0), 'Weight (Kg)', parseFloat(b.weight || 0).toFixed(2), 'Amount (Rs)', fmtNum(b.amount)],
      ['Freight', fmtNum(b.freight_amount), 'Payment', (b.payment || '-').toUpperCase(), 'Delivery', deliveryLabel(b.delivery_type)],
      ['E-Way Bill', b.e_way_bill || '-', 'Contains', b.contain || '-', 'Destination', b.destination || '-'],
    ];

    autoTable(doc, {
      startY: y,
      body: detailRows,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 1.8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15, font: 'times' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: contentWidth * 0.13 },
        1: { cellWidth: contentWidth * 0.20 },
        2: { fontStyle: 'bold', cellWidth: contentWidth * 0.13 },
        3: { cellWidth: contentWidth * 0.20 },
        4: { fontStyle: 'bold', cellWidth: contentWidth * 0.14 },
        5: { cellWidth: contentWidth * 0.20 },
      },
    });

    y = doc.lastAutoTable.finalY + 3;

    // ===== CHARGES & TOTAL PAY SECTION =====
    const isPaid = (b.payment || '').toUpperCase().includes('PAID') && !(b.payment || '').toUpperCase().includes('TO');
    const freight = isPaid ? 0 : (parseFloat(b.amount) || 0);
    const totalPay = freight + rsChrg + labourChrg;

    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 4;

    // Table-style charges breakdown
    const chrgLabelX = margin;
    const chrgValX = margin + 45;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    if (!isPaid) {
      doc.setFont('times', 'normal');
      doc.text('Freight:', chrgLabelX, y);
      doc.text('Rs. ' + fmtNum(freight), chrgValX, y);
      y += 4;
    }

    if (rsChrg > 0) {
      doc.setFont('times', 'normal');
      doc.text('RS Chrg:', chrgLabelX, y);
      doc.text('Rs. ' + fmtNum(rsChrg), chrgValX, y);
      y += 4;
    }

    if (labourChrg > 0) {
      doc.setFont('times', 'normal');
      doc.text('Labour Chrg:', chrgLabelX, y);
      doc.text('Rs. ' + fmtNum(labourChrg), chrgValX, y);
      y += 4;
    }

    // Total Pay line — bold with underline
    doc.setLineWidth(0.3);
    doc.line(chrgLabelX, y - 1, chrgValX + 30, y - 1);
    y += 3;
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('Total Pay:', chrgLabelX, y);
    doc.text('Rs. ' + fmtNum(totalPay), chrgValX, y);
    y += 5;

    // ===== REMARKS =====
    if (b.remark) {
      doc.setFontSize(9);
      doc.setFont('times', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Remarks:', margin, y + 2);
      doc.setFont('times', 'normal');
      doc.text(String(b.remark).substring(0, 90), margin + 18, y + 2);
      y += 6;
    }

    // ===== SIGNATURE SECTION =====
    const sigY = Math.max(y + 4, yOffset + halfHeight - 22);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);

    // Receiver
    doc.line(margin, sigY + 10, margin + 60, sigY + 10);
    doc.setFontSize(9);
    doc.setFont('times', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text("Receiver's Signature", margin, sigY + 14);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text('Name: ______________________', margin, sigY + 18);

    // Delivery person
    doc.line(pageWidth - margin - 60, sigY + 10, pageWidth - margin, sigY + 10);
    doc.setFontSize(9);
    doc.setFont('times', 'bold');
    doc.text("Delivery Person's Signature", pageWidth - margin - 60, sigY + 14);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text('Name: ______________________', pageWidth - margin - 60, sigY + 18);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont('times', 'normal');
    doc.text('System-generated POD. Verify all details before signing.', pageWidth / 2, yOffset + halfHeight - 3, { align: 'center' });
  }

  // ===== DRAW UPPER HALF — Consignee Copy =====
  drawPodCopy('CONSIGNEE COPY', 0);

  // ===== DASHED CUT LINE =====
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([3, 2], 0);
  doc.line(5, halfHeight, pageWidth - 5, halfHeight);
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text('- - - - - - - - - - - - - - - - - - - - - - - - - - Cut Here - - - - - - - - - - - - - - - - - - - - - - - - - -', pageWidth / 2, halfHeight - 1, { align: 'center' });
  doc.setLineDashPattern([], 0);

  // ===== DRAW LOWER HALF — Office Copy =====
  drawPodCopy('OFFICE COPY', halfHeight);

  // Return blob URL for modal preview
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
