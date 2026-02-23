/**
 * biltyPdfUpload.js
 * 
 * Standalone utility to generate a bilty PDF (headless, no React) and upload
 * it to Supabase Storage bucket `pdf_bilty`. Updates the `pdf_bucket` column
 * on the bilty row with the public URL.
 *
 * On UPDATE: deletes the old PDF file first, then uploads the new one.
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import supabase from '../app/utils/supabase';

// ==========================================
// 📐 COORDINATE CONFIGURATION (mirror of pdf-generation.js)
// ==========================================
const COORDINATES = {
  HEADER: {
    GST_NO: { x: 8, y: 8 },
    COMPANY_NAME: { x: 105, y: 18 },
    BANK_DETAIL_1: { x: 12, y: 25 },
    BANK_DETAIL_2: { x: 12, y: 28 },
    BRANCH_ADDRESS_1: { x: 120, y: 43 },
    BRANCH_ADDRESS_2: { x: 120, y: 43 },
  },
  QR_SECTION: {
    QR_CODE: { x: 180, y: 10, width: 25, height: 25 },
    GR_BOX: { x: 140, y: 45, width: 65, height: 12 },
    GR_LABEL: { x: 143, y: 52.5 },
    GR_NUMBER: { x: 158.5, y: 52.5 },
    CAUTION_BOX: { x: 140, y: 57, width: 65, height: 22 },
    CAUTION_LABEL: { x: 172, y: 61 },
    CAUTION_TEXT_START: { x: 142, y: 64 },
  },
  COPY_SECTION: {
    COPY_TYPE: { x: 105, y: 10 },
    COPY_UNDERLINE: { x1: 85, y: 10, x2: 125 },
    DATE: { x: 12, y: 35 },
    ROUTE: { x: 55, y: 37 },
  },
  DELIVERY_SECTION: {
    DELIVERY_AT: { x: 12, y: 45 },
    GSTIN: { x: 12, y: 50 },
    MOBILE: { x: 60, y: 50 },
    DELIVERY_TYPE: { x: 175, y: 95 },
  },
  PEOPLE_SECTION: {
    CONSIGNOR_NAME: { x: 12, y: 60 },
    CONSIGNOR_GST: { x: 12, y: 65 },
    CONSIGNOR_MOBILE: { x: 60, y: 65 },
    CONSIGNEE_NAME: { x: 12, y: 75 },
    CONSIGNEE_GST: { x: 12, y: 80 },
    CONSIGNEE_MOBILE: { x: 60, y: 80 },
    EWAY_BILL: { x: 12, y: 90 },
  },
  TABLE_SECTION: {
    TOP_LINE: { x1: 0, y: 136, x2: 250 },
    INVOICE_DATE: { x: 12, y: 100 },
    INVOICE_DATE_VALUE: { x: 45, y: 100 },
    INVOICE_NO: { x: 12, y: 105 },
    INVOICE_NO_VALUE: { x: 45, y: 105 },
    INVOICE_VALUE: { x: 12, y: 110 },
    INVOICE_VALUE_VALUE: { x: 45, y: 110 },
    CONTENT: { x: 80, y: 115 },
    CONTENT_VALUE: { x: 100, y: 115 },
    PVT_BOX: { x: 70, y: 91, width: 80, height: 14 },
    PVT_BOX_DIVIDER: { x: 110, y1: 91, y2: 105 },
    PVT_LABEL: { x: 90, y: 96 },
    PVT_VALUE: { x: 90, y: 101 },
    CITY_LABEL: { x: 130, y: 96 },
    CITY_VALUE: { x: 130, y: 101 },
    WEIGHT: { x: 80, y: 111 },
    VERTICAL_LINE: { x: 150, y1: 95, y2: 136 },
    AMOUNT: { x: 155, y: 100 },
    LABOUR_CHARGE: { x: 155, y: 104 },
    BILTY_CHARGE: { x: 155, y: 108 },
    TOLL_TAX: { x: 155, y: 112 },
    PF: { x: 155, y: 116 },
    OTHER_CHARGE: { x: 155, y: 120 },
    TOTAL_LINE: { x1: 150, y: 125, x2: 250 },
    TOTAL: { x: 155, y: 132 },
    PAYMENT_STATUS: { x: 168, y: 90 },
  },
  NOTICE_SECTION: {
    NOTICE_LABEL: { x: 67, y: 122 },
  },
  FOOTER_SECTION: {
    FOOTER_LINE: { x1: 0, y: 118, x2: 150 },
    WEBSITE: { x: 12, y: 141 },
    BOOKED_RISK: { x: 80, y: 140 },
    CUSTOMER_CARE: { x: 12, y: 145 },
    SIGNATURE: { x: 150, y: 146 },
  },
  EXTRA_LINES: {
    VERTICAL_LINE_1: { x: 70, y1: 95, y2: 118 },
    VERTICAL_LINE_2: { x: 156, y1: 45, y2: 57 },
  },
  SPACING: {
    SECOND_COPY_OFFSET: 148,
    DASHED_LINE_Y: 148,
    LINE_HEIGHT: 5,
    SECTION_SPACING: 10,
  },
};

const STYLES = {
  FONTS: {
    HEADER: { size: 18, weight: 'bold', family: 'times' },
    NORMAL: { size: 10, weight: 'normal', family: 'times' },
    SMALL: { size: 9, weight: 'normal', family: 'times' },
    TINY: { size: 7, weight: 'normal', family: 'times' },
    LARGE_STATUS: { size: 14, weight: 'bold', family: 'helvetica' },
    NOTICE: { size: 12, weight: 'bold', family: 'times' },
    COMPANY_NAME: { size: 20, weight: 'bold', family: 'helvetica' },
    GR_NUMBER: { size: 1, weight: 'bold', family: 'times' },
    GR_LABEL: { size: 10, weight: 'bold', family: 'helvetica' },
    LABELS: { size: 9.5, weight: 'bold', family: 'times' },
    VALUES: { size: 9.5, weight: 'normal', family: 'times' },
    ENHANCED_LABELS: { size: 10.5, weight: 'bold', family: 'times' },
    ENHANCED_VALUES: { size: 10, weight: 'bold', family: 'times' },
    TOTAL: { size: 14, weight: 'bold', family: 'helvetica' },
    ENHANCED_CHARGES: { size: 11, weight: 'bold', family: 'times' },
    MONOSPACE: { size: 9, weight: 'normal', family: 'courier' },
  },
  LINES: {
    NORMAL: 0.5,
    THICK: 1.0,
    EXTRA_THICK: 1.5,
    DASHED: [3, 3],
  },
};

// ==========================================
// Helper functions (pure, no React)
// ==========================================
const setStyle = (pdf, style) => {
  pdf.setFontSize(style.size);
  pdf.setFont(style.family || 'helvetica', style.weight);
};

const addStyledText = (pdf, text, x, y, style = STYLES.FONTS.NORMAL, options = {}) => {
  setStyle(pdf, style);
  pdf.text(text, x, y, options);
};

const addHeaderText = (pdf, text, x, y, size = 16, options = {}) => {
  pdf.setFontSize(size);
  pdf.setFont('times', 'bold');
  pdf.text(text, x, y, options);
};

const addJustifiedText = (pdf, text, x, y, maxWidth, lineHeight = 3) => {
  const words = text.split(' ');
  let currentLine = '';
  let currentY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
    const testWidth = pdf.getTextWidth(testLine);
    if (testWidth > maxWidth && currentLine) {
      const lineWords = currentLine.split(' ');
      if (lineWords.length > 1) {
        const totalTextWidth = lineWords.reduce((sum, word) => sum + pdf.getTextWidth(word), 0);
        const totalSpaceWidth = maxWidth - totalTextWidth;
        const spaceWidth = totalSpaceWidth / (lineWords.length - 1);
        let currentX = x;
        for (let j = 0; j < lineWords.length; j++) {
          pdf.text(lineWords[j], currentX, currentY);
          if (j < lineWords.length - 1) currentX += pdf.getTextWidth(lineWords[j]) + spaceWidth;
        }
      } else {
        pdf.text(currentLine, x, currentY);
      }
      currentLine = words[i];
      currentY += lineHeight;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    if (currentLine.includes('All Subject To Aligarh Jurisdiction')) {
      pdf.text(currentLine, x + maxWidth / 2, currentY, { align: 'center' });
    } else {
      pdf.text(currentLine, x, currentY);
    }
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB');
};

const formatDeliveryType = (deliveryType) => {
  if (deliveryType === 'door-delivery') return '/ DD';
  if (deliveryType === 'godown-delivery') return '';
  return '';
};

const formatPaymentMode = (paymentMode) => {
  switch ((paymentMode || '').toLowerCase()) {
    case 'to-pay': return 'TO PAY';
    case 'paid': return 'PAID';
    case 'freeofcost': return 'FOC';
    default: return (paymentMode || '').toUpperCase();
  }
};

const generateQRCode = async (text) => {
  try {
    return await QRCode.toDataURL(text, {
      width: 100, height: 100, margin: 1,
      color: { dark: '#000000', light: '#fafad2' },
    });
  } catch {
    return null;
  }
};

// ==========================================
// addBillCopy – draws one copy on the PDF
// ==========================================
const addBillCopy = (pdf, yStart, copyType, qrDataURL, permDetails, fromCity, toCity, transport, biltyData) => {
  const y = yStart;

  // HEADER
  addStyledText(pdf, `GST No: ${permDetails?.gst || '09COVPS5556J1ZT'}`, COORDINATES.HEADER.GST_NO.x, y + COORDINATES.HEADER.GST_NO.y, STYLES.FONTS.NOTICE);
  addHeaderText(pdf, 'S. S. TRANSPORT CORPORATION', COORDINATES.HEADER.COMPANY_NAME.x, y + COORDINATES.HEADER.COMPANY_NAME.y, 20, { align: 'center' });

  addStyledText(pdf, `PNB BANK A/C No: ${permDetails?.bank_act_no_1 || '0010002100076368'} IFSC CODE ${permDetails?.ifsc_code_1 || '0001000'}`, COORDINATES.HEADER.BANK_DETAIL_1.x, y + COORDINATES.HEADER.BANK_DETAIL_1.y, STYLES.FONTS.LABELS);
  addStyledText(pdf, `AXIS BANK A/C No: ${permDetails?.bank_act_no_2 || '923010361683636'} IFSC CODE ${permDetails?.ifsc_code_2 || '0001837'}`, COORDINATES.HEADER.BANK_DETAIL_2.x, y + COORDINATES.HEADER.BANK_DETAIL_2.y, STYLES.FONTS.LABELS);

  const address = permDetails?.transport_address || 'GANDHI MARKET, G T ROAD, ALIGARH-202001\nSHIVA PETROL PUMP, G T ROAD, ALIGARH-202001';
  const addressLines = address.split('\n');
  addStyledText(pdf, addressLines[0], COORDINATES.HEADER.BRANCH_ADDRESS_1.x, y + COORDINATES.HEADER.BRANCH_ADDRESS_1.y, STYLES.FONTS.ENHANCED_VALUES);
  if (addressLines[1]) addStyledText(pdf, addressLines[1], COORDINATES.HEADER.BRANCH_ADDRESS_2.x, y + COORDINATES.HEADER.BRANCH_ADDRESS_2.y, STYLES.FONTS.ENHANCED_VALUES);

  // COPY TYPE
  addStyledText(pdf, `${copyType.toUpperCase()} COPY`, COORDINATES.COPY_SECTION.COPY_TYPE.x, y + COORDINATES.COPY_SECTION.COPY_TYPE.y, STYLES.FONTS.NOTICE, { align: 'center' });
  pdf.setLineWidth(STYLES.LINES.NORMAL);
  pdf.line(COORDINATES.COPY_SECTION.COPY_UNDERLINE.x1, y + COORDINATES.COPY_SECTION.COPY_UNDERLINE.y, COORDINATES.COPY_SECTION.COPY_UNDERLINE.x2, y + COORDINATES.COPY_SECTION.COPY_UNDERLINE.y);

  // DATE & ROUTE
  addStyledText(pdf, `Date: ${formatDate(biltyData.bilty_date)}`, COORDINATES.COPY_SECTION.DATE.x, y + COORDINATES.COPY_SECTION.DATE.y, STYLES.FONTS.LABELS);
  const fromCityName = fromCity?.city_name || 'ALIGARH';
  const toCityName = toCity?.city_name || 'DEORIA';
  const toCityCode = toCity?.city_code || 'DRO';
  addStyledText(pdf, `${fromCityName} TO ${toCityName} (${toCityCode})`, COORDINATES.COPY_SECTION.ROUTE.x, y + COORDINATES.COPY_SECTION.ROUTE.y, STYLES.FONTS.NOTICE);

  // DELIVERY
  const deliveryText = transport?.transport_name || biltyData.transport_name || 'SWASTIK TRANSPORT';
  addStyledText(pdf, `DELIVERY AT: ${deliveryText}`, COORDINATES.DELIVERY_SECTION.DELIVERY_AT.x, y + COORDINATES.DELIVERY_SECTION.DELIVERY_AT.y, STYLES.FONTS.ENHANCED_LABELS);
  addStyledText(pdf, `GSTIN: ${transport?.gst_number || '24503825250'}`, COORDINATES.DELIVERY_SECTION.GSTIN.x, y + COORDINATES.DELIVERY_SECTION.GSTIN.y, STYLES.FONTS.ENHANCED_LABELS);
  const mobileNumber = transport?.mob_number || permDetails?.mobile_number || '7668291228';
  addStyledText(pdf, `MOB: ${mobileNumber}`, COORDINATES.DELIVERY_SECTION.MOBILE.x, y + COORDINATES.DELIVERY_SECTION.MOBILE.y, STYLES.FONTS.ENHANCED_LABELS);

  // CONSIGNOR
  addStyledText(pdf, `CONSIGNOR: ${(biltyData.consignor_name || '').toUpperCase()}`, COORDINATES.PEOPLE_SECTION.CONSIGNOR_NAME.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_NAME.y, STYLES.FONTS.ENHANCED_LABELS);
  addStyledText(pdf, `GSTIN: ${biltyData.consignor_gst || 'N/A'}`, COORDINATES.PEOPLE_SECTION.CONSIGNOR_GST.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_GST.y, STYLES.FONTS.ENHANCED_VALUES);
  if (biltyData.consignor_number) addStyledText(pdf, `MOB: ${biltyData.consignor_number}`, COORDINATES.PEOPLE_SECTION.CONSIGNOR_MOBILE.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_MOBILE.y, STYLES.FONTS.ENHANCED_VALUES);

  // CONSIGNEE
  addStyledText(pdf, `CONSIGNEE: ${(biltyData.consignee_name || '').toUpperCase()}`, COORDINATES.PEOPLE_SECTION.CONSIGNEE_NAME.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_NAME.y, STYLES.FONTS.ENHANCED_LABELS);
  let gstText = biltyData.consignee_gst || '';
  if (gstText.startsWith('AD-')) {
    addStyledText(pdf, `AADHAR NO: ${gstText.replace('AD-', '')}`, COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y, STYLES.FONTS.ENHANCED_VALUES);
  } else if (gstText.toLowerCase().startsWith('pan')) {
    addStyledText(pdf, `PAN NO: ${gstText.substring(3)}`, COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y, STYLES.FONTS.ENHANCED_VALUES);
  } else {
    addStyledText(pdf, `GSTIN: ${gstText || 'N/A'}`, COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y, STYLES.FONTS.ENHANCED_VALUES);
  }
  if (biltyData.consignee_number) addStyledText(pdf, `MOB: ${biltyData.consignee_number}`, COORDINATES.PEOPLE_SECTION.CONSIGNEE_MOBILE.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_MOBILE.y, STYLES.FONTS.ENHANCED_VALUES);

  // E-WAY BILL
  addStyledText(pdf, 'E-WAY BILL: ', COORDINATES.PEOPLE_SECTION.EWAY_BILL.x, y + COORDINATES.PEOPLE_SECTION.EWAY_BILL.y, STYLES.FONTS.LABELS);
  addStyledText(pdf, `${biltyData.e_way_bill || 'N/A'}`, COORDINATES.PEOPLE_SECTION.EWAY_BILL.x + 25, y + COORDINATES.PEOPLE_SECTION.EWAY_BILL.y, STYLES.FONTS.ENHANCED_VALUES);

  // TABLE TOP LINE
  pdf.setLineWidth(STYLES.LINES.THICK);
  pdf.line(COORDINATES.TABLE_SECTION.TOP_LINE.x1, y + COORDINATES.TABLE_SECTION.TOP_LINE.y, COORDINATES.TABLE_SECTION.TOP_LINE.x2, y + COORDINATES.TABLE_SECTION.TOP_LINE.y);

  // INVOICE
  addStyledText(pdf, 'INVOICE DATE:', COORDINATES.TABLE_SECTION.INVOICE_DATE.x, y + COORDINATES.TABLE_SECTION.INVOICE_DATE.y, STYLES.FONTS.LABELS);
  addStyledText(pdf, `${biltyData.invoice_date ? formatDate(biltyData.invoice_date) : 'N/A'}`, COORDINATES.TABLE_SECTION.INVOICE_DATE_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_DATE_VALUE.y, STYLES.FONTS.VALUES);
  addStyledText(pdf, 'INVOICE NO:', COORDINATES.TABLE_SECTION.INVOICE_NO.x, y + COORDINATES.TABLE_SECTION.INVOICE_NO.y, STYLES.FONTS.LABELS);
  addStyledText(pdf, `${biltyData.invoice_no || 'N/A'}`, COORDINATES.TABLE_SECTION.INVOICE_NO_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_NO_VALUE.y, STYLES.FONTS.VALUES);
  addStyledText(pdf, 'INVOICE VALUE:', COORDINATES.TABLE_SECTION.INVOICE_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_VALUE.y, STYLES.FONTS.LABELS);
  addStyledText(pdf, `${biltyData.invoice_value || '0'}`, COORDINATES.TABLE_SECTION.INVOICE_VALUE_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_VALUE_VALUE.y, STYLES.FONTS.VALUES);
  addStyledText(pdf, 'CONTENT:', COORDINATES.TABLE_SECTION.CONTENT.x, y + COORDINATES.TABLE_SECTION.CONTENT.y, STYLES.FONTS.LABELS);
  addStyledText(pdf, `${biltyData.contain || 'HARDWARE'}`, COORDINATES.TABLE_SECTION.CONTENT_VALUE.x, y + COORDINATES.TABLE_SECTION.CONTENT_VALUE.y, STYLES.FONTS.VALUES);

  // PVT MARKS BOX
  pdf.setLineWidth(STYLES.LINES.THICK);
  pdf.rect(COORDINATES.TABLE_SECTION.PVT_BOX.x, y + COORDINATES.TABLE_SECTION.PVT_BOX.y, COORDINATES.TABLE_SECTION.PVT_BOX.width, COORDINATES.TABLE_SECTION.PVT_BOX.height);
  pdf.setLineWidth(STYLES.LINES.NORMAL);
  pdf.line(COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.x, y + COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.y1, COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.x, y + COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.y2);
  addStyledText(pdf, 'PVT MARKS:', COORDINATES.TABLE_SECTION.PVT_LABEL.x, y + COORDINATES.TABLE_SECTION.PVT_LABEL.y, STYLES.FONTS.LABELS, { align: 'center' });
  addStyledText(pdf, `${biltyData.pvt_marks || 'SS'} / ${biltyData.no_of_pkg}`, COORDINATES.TABLE_SECTION.PVT_VALUE.x, y + COORDINATES.TABLE_SECTION.PVT_VALUE.y, STYLES.FONTS.LARGE_STATUS, { align: 'center' });
  addStyledText(pdf, 'CITY CODE:', COORDINATES.TABLE_SECTION.CITY_LABEL.x, y + COORDINATES.TABLE_SECTION.CITY_LABEL.y, STYLES.FONTS.LABELS, { align: 'center' });
  addStyledText(pdf, `${toCityCode}`, COORDINATES.TABLE_SECTION.CITY_VALUE.x, y + COORDINATES.TABLE_SECTION.CITY_VALUE.y, STYLES.FONTS.LARGE_STATUS, { align: 'center' });

  addStyledText(pdf, `WEIGHT: ${biltyData.wt} KG`, COORDINATES.TABLE_SECTION.WEIGHT.x, y + COORDINATES.TABLE_SECTION.WEIGHT.y, STYLES.FONTS.NOTICE);

  // VERTICAL LINES
  pdf.setLineWidth(STYLES.LINES.NORMAL);
  pdf.line(COORDINATES.TABLE_SECTION.VERTICAL_LINE.x, y + COORDINATES.TABLE_SECTION.VERTICAL_LINE.y1, COORDINATES.TABLE_SECTION.VERTICAL_LINE.x, y + COORDINATES.TABLE_SECTION.VERTICAL_LINE.y2);
  pdf.line(COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.y1, COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.y2);
  pdf.line(COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.y1, COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.y2);

  // CHARGES
  const amount = biltyData.freight_amount || Math.round(parseFloat(biltyData.wt) * parseFloat(biltyData.rate));
  const labelX = COORDINATES.TABLE_SECTION.AMOUNT.x;
  const valueX = labelX + 45;

  addStyledText(pdf, 'AMOUNT:', labelX, y + COORDINATES.TABLE_SECTION.AMOUNT.y, STYLES.FONTS.ENHANCED_CHARGES);
  addStyledText(pdf, `${amount}`, valueX, y + COORDINATES.TABLE_SECTION.AMOUNT.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
  addStyledText(pdf, 'LABOUR CHARGE:', labelX, y + COORDINATES.TABLE_SECTION.LABOUR_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
  addStyledText(pdf, `${biltyData.labour_charge}`, valueX, y + COORDINATES.TABLE_SECTION.LABOUR_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
  addStyledText(pdf, 'BILTY CHARGE:', labelX, y + COORDINATES.TABLE_SECTION.BILTY_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
  addStyledText(pdf, `${biltyData.bill_charge}`, valueX, y + COORDINATES.TABLE_SECTION.BILTY_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
  addStyledText(pdf, 'TOLL TAX:', labelX, y + COORDINATES.TABLE_SECTION.TOLL_TAX.y, STYLES.FONTS.ENHANCED_CHARGES);
  addStyledText(pdf, `${biltyData.toll_charge}`, valueX, y + COORDINATES.TABLE_SECTION.TOLL_TAX.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
  addStyledText(pdf, 'PF:', labelX, y + COORDINATES.TABLE_SECTION.PF.y, STYLES.FONTS.ENHANCED_CHARGES);
  addStyledText(pdf, `${biltyData.pf_charge}`, valueX, y + COORDINATES.TABLE_SECTION.PF.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
  addStyledText(pdf, 'OTHER CHARGE:', labelX, y + COORDINATES.TABLE_SECTION.OTHER_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
  addStyledText(pdf, `${biltyData.other_charge}`, valueX, y + COORDINATES.TABLE_SECTION.OTHER_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });

  // TOTAL LINE
  pdf.setLineWidth(STYLES.LINES.NORMAL);
  pdf.line(COORDINATES.TABLE_SECTION.TOTAL_LINE.x1, y + COORDINATES.TABLE_SECTION.TOTAL_LINE.y, COORDINATES.TABLE_SECTION.TOTAL_LINE.x2, y + COORDINATES.TABLE_SECTION.TOTAL_LINE.y);
  addStyledText(pdf, 'TOTAL:', labelX, y + COORDINATES.TABLE_SECTION.TOTAL.y, STYLES.FONTS.ENHANCED_CHARGES);
  addStyledText(pdf, `${biltyData.total}`, valueX, y + COORDINATES.TABLE_SECTION.TOTAL.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });

  // PAYMENT STATUS
  const paymentText = formatPaymentMode(biltyData.payment_mode);
  const deliveryTypeText = formatDeliveryType(biltyData.delivery_type);
  addStyledText(pdf, paymentText + (deliveryTypeText ? ` ${deliveryTypeText}` : ''), COORDINATES.TABLE_SECTION.PAYMENT_STATUS.x, y + COORDINATES.TABLE_SECTION.PAYMENT_STATUS.y, STYLES.FONTS.LARGE_STATUS);

  // NOTICE
  addStyledText(pdf, 'NOTICE', COORDINATES.NOTICE_SECTION.NOTICE_LABEL.x, y + COORDINATES.NOTICE_SECTION.NOTICE_LABEL.y, STYLES.FONTS.NOTICE);
  let noticeY = COORDINATES.NOTICE_SECTION.NOTICE_LABEL.y + 3;
  setStyle(pdf, STYLES.FONTS.TINY);
  const notice1Text = "The Consignment covered by this set of special Lorry Receipt from shall be stored at the destination under the cannot of the Transport Operator & shall be delivered to of the order of the Consignee Bank whose name is mentioned in the Lorry Receipt. It will under no circumstance be delivered to anyone without the written authority from the consignee bank or it's order endored of the consignee copy or on a seperate letter of authority. We are not responsible for leakage n illegal goods. The Consignee Copy is only for BILL CLEARING not for Bank Advance.";
  const notice1Lines = pdf.splitTextToSize(notice1Text, 130);
  notice1Lines.forEach((line) => { pdf.text(line, 12, y + noticeY); noticeY += 2.5; });

  // FOOTER
  pdf.setLineWidth(STYLES.LINES.NORMAL);
  pdf.line(COORDINATES.FOOTER_SECTION.FOOTER_LINE.x1, y + COORDINATES.FOOTER_SECTION.FOOTER_LINE.y, COORDINATES.FOOTER_SECTION.FOOTER_LINE.x2, y + COORDINATES.FOOTER_SECTION.FOOTER_LINE.y);
  addStyledText(pdf, `OUR WEBSITE: ${permDetails?.website || 'SSTRANSPORTCO.COM'}`, COORDINATES.FOOTER_SECTION.WEBSITE.x, y + COORDINATES.FOOTER_SECTION.WEBSITE.y, STYLES.FONTS.LABELS);
  addStyledText(pdf, "BOOKED AT OWNER'S RISK", COORDINATES.FOOTER_SECTION.BOOKED_RISK.x, y + COORDINATES.FOOTER_SECTION.BOOKED_RISK.y, STYLES.FONTS.LABELS);
  addStyledText(pdf, `CUSTOMER CARE: ${permDetails?.mobile_number || '9690836940'}`, COORDINATES.FOOTER_SECTION.CUSTOMER_CARE.x, y + COORDINATES.FOOTER_SECTION.CUSTOMER_CARE.y, STYLES.FONTS.LABELS);
  addStyledText(pdf, 'SIGNATURE OF BOOKING CLERK', COORDINATES.FOOTER_SECTION.SIGNATURE.x, y + COORDINATES.FOOTER_SECTION.SIGNATURE.y, STYLES.FONTS.LABELS);
};

// ==========================================
// City code helper
// ==========================================
const getCityNameByCode = (cityCode) => {
  const map = { ALG: 'ALIGARH', KP: 'KANPUR' };
  return map[cityCode?.toUpperCase()] || cityCode || 'ALIGARH';
};

// ==========================================
// 🔑 PUBLIC API
// ==========================================

/**
 * Generate a bilty PDF as an ArrayBuffer (headless – no DOM needed beyond jsPDF).
 */
export async function generateBiltyPdfBuffer(biltyData) {
  // 1) Fetch supporting data from Supabase
  const [permRes, fromCityRes, toCityRes, branchRes] = await Promise.all([
    supabase.from('permanent_details').select('*').eq('branch_id', biltyData.branch_id).single(),
    biltyData.from_city_id
      ? supabase.from('cities').select('*').eq('id', biltyData.from_city_id).single()
      : Promise.resolve({ data: null }),
    biltyData.to_city_id
      ? supabase.from('cities').select('*').eq('id', biltyData.to_city_id).single()
      : Promise.resolve({ data: null }),
    biltyData.branch_id
      ? supabase.from('branches').select('branch_code, branch_name, city_code').eq('id', biltyData.branch_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const permDetails = permRes.data;
  const fromCity = fromCityRes.data || (branchRes.data ? { city_name: getCityNameByCode(branchRes.data.city_code), city_code: branchRes.data.city_code } : null);
  const toCity = toCityRes.data;

  let transportData = null;
  if (biltyData.to_city_id) {
    const tRes = await supabase.from('transports').select('*').eq('city_id', biltyData.to_city_id).limit(1).single();
    transportData = tRes.data;
  }

  // 2) QR code
  const qrDataURL = await generateQRCode(`https://console.movesure.io/print/${biltyData.gr_no}`);

  // 3) Build the PDF
  const pdf = new jsPDF('p', 'mm', 'a4');

  // Background
  pdf.setFillColor(255, 255, 210);
  pdf.rect(0, 0, 210, 297, 'F');
  pdf.setFillColor(255, 255, 255);

  // QR images
  if (qrDataURL) {
    pdf.addImage(qrDataURL, 'PNG', COORDINATES.QR_SECTION.QR_CODE.x, COORDINATES.QR_SECTION.QR_CODE.y, COORDINATES.QR_SECTION.QR_CODE.width, COORDINATES.QR_SECTION.QR_CODE.height);
    pdf.addImage(qrDataURL, 'PNG', COORDINATES.QR_SECTION.QR_CODE.x, COORDINATES.QR_SECTION.QR_CODE.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, COORDINATES.QR_SECTION.QR_CODE.width, COORDINATES.QR_SECTION.QR_CODE.height);
  }

  // GR boxes (copy 1)
  pdf.setLineWidth(STYLES.LINES.THICK);
  pdf.rect(COORDINATES.QR_SECTION.GR_BOX.x, COORDINATES.QR_SECTION.GR_BOX.y, COORDINATES.QR_SECTION.GR_BOX.width, COORDINATES.QR_SECTION.GR_BOX.height);
  addStyledText(pdf, 'GR NO', COORDINATES.QR_SECTION.GR_LABEL.x, COORDINATES.QR_SECTION.GR_LABEL.y, STYLES.FONTS.GR_LABEL);
  pdf.setFontSize(12); pdf.setFont('times', 'bold');
  pdf.text(`SSTC-2026-27-${biltyData.gr_no}`, COORDINATES.QR_SECTION.GR_NUMBER.x, COORDINATES.QR_SECTION.GR_NUMBER.y);

  // GR box (copy 2)
  pdf.setLineWidth(STYLES.LINES.THICK);
  pdf.rect(COORDINATES.QR_SECTION.GR_BOX.x, COORDINATES.QR_SECTION.GR_BOX.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, COORDINATES.QR_SECTION.GR_BOX.width, COORDINATES.QR_SECTION.GR_BOX.height);
  addStyledText(pdf, 'GR NO', COORDINATES.QR_SECTION.GR_LABEL.x, COORDINATES.QR_SECTION.GR_LABEL.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, STYLES.FONTS.GR_LABEL);
  pdf.setFontSize(12); pdf.setFont('times', 'bold');
  pdf.text(`SSTC-2026-27-${biltyData.gr_no}`, COORDINATES.QR_SECTION.GR_NUMBER.x, COORDINATES.QR_SECTION.GR_NUMBER.y + COORDINATES.SPACING.SECOND_COPY_OFFSET);

  // Caution boxes (copy 1 & 2)
  const cautionMainText = "The Consignment Will Not Be Diverted, Re-Routed or Re-Booked Without Consignee's Written Permission and Will Not Be Delivered Without Original Consignment Note.";
  const jurisdictionText = "All Subject To Aligarh Jurisdiction.";
  for (const offset of [0, COORDINATES.SPACING.SECOND_COPY_OFFSET]) {
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.rect(COORDINATES.QR_SECTION.CAUTION_BOX.x, COORDINATES.QR_SECTION.CAUTION_BOX.y + offset, COORDINATES.QR_SECTION.CAUTION_BOX.width, COORDINATES.QR_SECTION.CAUTION_BOX.height);
    addStyledText(pdf, 'CAUTION', COORDINATES.QR_SECTION.CAUTION_LABEL.x, COORDINATES.QR_SECTION.CAUTION_LABEL.y + offset, STYLES.FONTS.LABELS, { align: 'center' });
    setStyle(pdf, STYLES.FONTS.SMALL);
    addJustifiedText(pdf, cautionMainText, COORDINATES.QR_SECTION.CAUTION_TEXT_START.x, COORDINATES.QR_SECTION.CAUTION_TEXT_START.y + offset, 62, 3);
    const mainTextLines = pdf.splitTextToSize(cautionMainText, 62);
    const jY = COORDINATES.QR_SECTION.CAUTION_TEXT_START.y + offset + mainTextLines.length * 3 + 1.8;
    pdf.text(jurisdictionText, COORDINATES.QR_SECTION.CAUTION_TEXT_START.x + 31, jY, { align: 'center' });
  }

  // Bill copies
  addBillCopy(pdf, 0, 'CONSIGNOR', qrDataURL, permDetails, fromCity, toCity, transportData, biltyData);

  // Dashed separator
  pdf.setLineWidth(STYLES.LINES.THICK);
  pdf.setLineDashPattern(STYLES.LINES.DASHED, 0);
  pdf.line(10, COORDINATES.SPACING.DASHED_LINE_Y, 200, COORDINATES.SPACING.DASHED_LINE_Y);
  pdf.setLineDashPattern([], 0);

  addBillCopy(pdf, COORDINATES.SPACING.SECOND_COPY_OFFSET, 'DRIVER', qrDataURL, permDetails, fromCity, toCity, transportData, biltyData);

  // 4) Return as ArrayBuffer
  return pdf.output('arraybuffer');
}

/**
 * Upload a bilty PDF to Supabase Storage and update the `pdf_bucket` column.
 *
 * @param {Object} biltyData – The saved bilty row (needs .id, .gr_no, .branch_id, etc.)
 * @param {string|null} oldPdfBucketUrl – The previous pdf_bucket URL (if updating). Will be deleted.
 * @returns {string|null} The public URL of the uploaded PDF, or null on failure.
 */
export async function uploadBiltyPdf(biltyData, oldPdfBucketUrl = null) {
  try {
    console.log('📄 [PDF Upload] Starting background PDF generation for GR:', biltyData.gr_no);

    // 1) Generate PDF buffer
    const pdfBuffer = await generateBiltyPdfBuffer(biltyData);

    // 2) Build the storage path: branch_id/gr_no.pdf
    const filePath = `${biltyData.branch_id}/${biltyData.gr_no.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    // 3) If there's an old PDF, delete it from the bucket
    if (oldPdfBucketUrl) {
      try {
        // Extract file path from the public URL
        // URL format: https://<project>.supabase.co/storage/v1/object/public/pdf_bilty/<path>
        const bucketPrefix = '/storage/v1/object/public/pdf_bilty/';
        const idx = oldPdfBucketUrl.indexOf(bucketPrefix);
        if (idx !== -1) {
          const oldPath = decodeURIComponent(oldPdfBucketUrl.substring(idx + bucketPrefix.length));
          console.log('🗑️ [PDF Upload] Deleting old PDF:', oldPath);
          const { error: delError } = await supabase.storage.from('pdf_bilty').remove([oldPath]);
          if (delError) console.warn('⚠️ [PDF Upload] Failed to delete old PDF:', delError.message);
          else console.log('✅ [PDF Upload] Old PDF deleted');
        }
      } catch (delErr) {
        console.warn('⚠️ [PDF Upload] Error parsing old PDF URL for deletion:', delErr.message);
      }
    }

    // 4) Upload new PDF (upsert so re-saves overwrite)
    const { error: uploadError } = await supabase.storage
      .from('pdf_bilty')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ [PDF Upload] Upload failed:', uploadError.message);
      return null;
    }

    // 5) Get public URL
    const { data: urlData } = supabase.storage.from('pdf_bilty').getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      console.error('❌ [PDF Upload] Could not get public URL');
      return null;
    }

    console.log('✅ [PDF Upload] Uploaded successfully:', publicUrl);

    // 6) Update bilty record with the URL
    if (biltyData.id) {
      const { error: updateError } = await supabase
        .from('bilty')
        .update({ pdf_bucket: publicUrl })
        .eq('id', biltyData.id);

      if (updateError) {
        console.error('❌ [PDF Upload] Failed to update pdf_bucket column:', updateError.message);
      } else {
        console.log('✅ [PDF Upload] pdf_bucket column updated for bilty:', biltyData.id);
      }
    }

    return publicUrl;
  } catch (err) {
    console.error('❌ [PDF Upload] Unexpected error:', err);
    return null;
  }
}
