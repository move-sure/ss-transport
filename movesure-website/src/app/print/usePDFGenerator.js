'use client';

import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import supabase from '../../app/utils/supabase';

// Custom hook for PDF generation logic
export const usePDFGenerator = (biltyData, branchData) => {
  const [permanentDetails, setPermanentDetails] = useState(null);
  const [fromCityData, setFromCityData] = useState(null);
  const [toCityData, setToCityData] = useState(null);
  const [transportData, setTransportData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // ==========================================
  // 📐 COORDINATE CONFIGURATION SECTION
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
      INVOICE_DATE_VALUE: { x: 45, y: 100},
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
      NOTICE_BOX: { x: 10, y: 150, width: 30, height: 15 },
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
    }
  };

  // ==========================================
  // 🎨 STYLING CONFIGURATION
  // ==========================================
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
    }
  };

  // ==========================================
  // 🎨 TEXT STYLING HELPER FUNCTIONS
  // ==========================================
  const setStyle = (pdf, style) => {
    pdf.setFontSize(style.size);
    const fontFamily = style.family || 'helvetica';
    pdf.setFont(fontFamily, style.weight);
  };

  const addStyledText = (pdf, text, x, y, style = STYLES.FONTS.NORMAL, options = {}) => {
    setStyle(pdf, style);
    pdf.text(text, x, y, options);
  };

  const addMonospaceText = (pdf, text, x, y, size = 9, weight = 'normal', options = {}) => {
    pdf.setFontSize(size);
    pdf.setFont('courier', weight);
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
        const spaces = currentLine.split(' ').length - 1;
        if (spaces > 0) {
          const extraSpace = (maxWidth - pdf.getTextWidth(currentLine.replace(/ /g, ''))) / spaces;
          let xPos = x;
          const lineWords = currentLine.split(' ');
          
          for (let j = 0; j < lineWords.length; j++) {
            pdf.text(lineWords[j], xPos, currentY);
            xPos += pdf.getTextWidth(lineWords[j]) + extraSpace;
          }
        } else {
          pdf.text(currentLine, x, currentY);
        }
        
        currentY += lineHeight;
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      if (currentLine.includes("All Subject To Aligarh Jurisdiction")) {
        const centerX = x + (maxWidth / 2);
        pdf.text(currentLine, centerX, currentY, { align: 'center' });
      } else {
        pdf.text(currentLine, x, currentY);
      }
    }
  };

  // ==========================================
  // 🔧 UTILITY FUNCTIONS
  // ==========================================
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const formatDeliveryType = (deliveryType) => {
    if (deliveryType === 'door-delivery') return 'DOOR';
    if (deliveryType === 'godown-delivery') return 'GODOWN';
    return '';
  };

  const formatPaymentMode = (paymentMode) => {
    switch(paymentMode.toLowerCase()) {
      case 'paid': return 'PAID';
      case 'to pay': return 'TO PAY';
      case 'topay': return 'TO PAY';
      default: return paymentMode.toUpperCase();
    }
  };

  const generateQRCode = async (text) => {
    try {
      return await QRCode.toDataURL(text, {
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  };

  // ==========================================
  // 📄 MAIN PDF GENERATION FUNCTIONS
  // ==========================================
  const addBillCopy = (pdf, yStart, copyType, qrDataURL, permDetails, fromCity, toCity, transport) => {
    const y = yStart;

    // Header Section
    addStyledText(pdf, `GST No: ${permDetails?.gst || '09COVPS5556J1ZT'}`, COORDINATES.HEADER.GST_NO.x, y + COORDINATES.HEADER.GST_NO.y, STYLES.FONTS.NOTICE);
    addHeaderText(pdf, 'S. S. TRANSPORT CORPORATION', COORDINATES.HEADER.COMPANY_NAME.x, y + COORDINATES.HEADER.COMPANY_NAME.y, 20, { align: 'center' });
    addStyledText(pdf, `PNB BANK A/C No: ${permDetails?.bank_act_no_1 || '0010002100076368'} IFSC CODE ${permDetails?.ifsc_code_1 || '0001000'}`, COORDINATES.HEADER.BANK_DETAIL_1.x, y + COORDINATES.HEADER.BANK_DETAIL_1.y, STYLES.FONTS.LABELS);
    addStyledText(pdf, `AXIS BANK A/C No: ${permDetails?.bank_act_no_2 || '923010361683636'} IFSC CODE ${permDetails?.ifsc_code_2 || '0001837'}`, COORDINATES.HEADER.BANK_DETAIL_2.x, y + COORDINATES.HEADER.BANK_DETAIL_2.y, STYLES.FONTS.LABELS);

    const address = permDetails?.transport_address || 'GANDHI MARKET, G T ROAD, ALIGARH-202001\nSHIVA PETROL PUMP, G T ROAD, ALIGARH-202001';
    const addressLines = address.split('\n');
    addStyledText(pdf, addressLines[0], COORDINATES.HEADER.BRANCH_ADDRESS_1.x, y + COORDINATES.HEADER.BRANCH_ADDRESS_1.y, STYLES.FONTS.ENHANCED_VALUES);
    if (addressLines[1]) {
      addStyledText(pdf, addressLines[1], COORDINATES.HEADER.BRANCH_ADDRESS_2.x, y + COORDINATES.HEADER.BRANCH_ADDRESS_2.y + 3, STYLES.FONTS.ENHANCED_VALUES);
    }

    // Copy Type
    addStyledText(pdf, `${copyType.toUpperCase()} COPY`, COORDINATES.COPY_SECTION.COPY_TYPE.x, y + COORDINATES.COPY_SECTION.COPY_TYPE.y, STYLES.FONTS.NOTICE, { align: 'center' });
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(COORDINATES.COPY_SECTION.COPY_UNDERLINE.x1, y + COORDINATES.COPY_SECTION.COPY_UNDERLINE.y, COORDINATES.COPY_SECTION.COPY_UNDERLINE.x2, y + COORDINATES.COPY_SECTION.COPY_UNDERLINE.y);

    // Date and Route
    addStyledText(pdf, `Date: ${formatDate(biltyData.bilty_date)}`, COORDINATES.COPY_SECTION.DATE.x, y + COORDINATES.COPY_SECTION.DATE.y, STYLES.FONTS.LABELS);
    const fromCityName = fromCity?.city_name || 'ALIGARH';
    const toCityName = toCity?.city_name || 'DEORIA';
    const toCityCode = toCity?.city_code || 'DRO';
    addStyledText(pdf, `${fromCityName} TO ${toCityName} (${toCityCode})`, COORDINATES.COPY_SECTION.ROUTE.x, y + COORDINATES.COPY_SECTION.ROUTE.y, STYLES.FONTS.NOTICE);

    // Delivery Section
    const deliveryText = transport?.transport_name || biltyData.transport_name || 'SWASTIK TRANSPORT';
    addStyledText(pdf, `DELIVERY AT: ${deliveryText}`, COORDINATES.DELIVERY_SECTION.DELIVERY_AT.x, y + COORDINATES.DELIVERY_SECTION.DELIVERY_AT.y, STYLES.FONTS.ENHANCED_LABELS);
    addStyledText(pdf, `GSTIN: ${transport?.gst_number || '24503825250'}`, COORDINATES.DELIVERY_SECTION.GSTIN.x, y + COORDINATES.DELIVERY_SECTION.GSTIN.y, STYLES.FONTS.ENHANCED_LABELS);
    const mobileNumber = transport?.mob_number || permDetails?.mobile_number || '7668291228';
    addStyledText(pdf, `MOB: ${mobileNumber}`, COORDINATES.DELIVERY_SECTION.MOBILE.x, y + COORDINATES.DELIVERY_SECTION.MOBILE.y, STYLES.FONTS.ENHANCED_LABELS);

    // Consignor Section
    addStyledText(pdf, `CONSIGNOR: ${biltyData.consignor_name || 'N/A'}`, COORDINATES.PEOPLE_SECTION.CONSIGNOR_NAME.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_NAME.y, STYLES.FONTS.ENHANCED_LABELS);
    addStyledText(pdf, `GST: ${biltyData.consignor_gst || 'N/A'}`, COORDINATES.PEOPLE_SECTION.CONSIGNOR_GST.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_GST.y, STYLES.FONTS.ENHANCED_LABELS);
    addStyledText(pdf, `MOBILE: ${biltyData.consignor_number || 'N/A'}`, COORDINATES.PEOPLE_SECTION.CONSIGNOR_MOBILE.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_MOBILE.y, STYLES.FONTS.ENHANCED_LABELS);

    // Consignee Section
    addStyledText(pdf, `CONSIGNEE: ${biltyData.consignee_name || 'N/A'}`, COORDINATES.PEOPLE_SECTION.CONSIGNEE_NAME.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_NAME.y, STYLES.FONTS.ENHANCED_LABELS);
    addStyledText(pdf, `GST/AADHAR/PAN: ${biltyData.consignee_gst || 'N/A'}`, COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y, STYLES.FONTS.ENHANCED_LABELS);
    addStyledText(pdf, `MOBILE: ${biltyData.consignee_number || 'N/A'}`, COORDINATES.PEOPLE_SECTION.CONSIGNEE_MOBILE.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_MOBILE.y, STYLES.FONTS.ENHANCED_LABELS);

    // E-way Bill
    addStyledText(pdf, `E-WAY BILL NO: ${biltyData.e_way_bill || 'N/A'}`, COORDINATES.PEOPLE_SECTION.EWAY_BILL.x, y + COORDINATES.PEOPLE_SECTION.EWAY_BILL.y, STYLES.FONTS.ENHANCED_LABELS);

    // Invoice Details
    addStyledText(pdf, 'INV DATE:', COORDINATES.TABLE_SECTION.INVOICE_DATE.x, y + COORDINATES.TABLE_SECTION.INVOICE_DATE.y, STYLES.FONTS.LABELS);
    addStyledText(pdf, biltyData.invoice_date ? formatDate(biltyData.invoice_date) : 'N/A', COORDINATES.TABLE_SECTION.INVOICE_DATE_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_DATE_VALUE.y, STYLES.FONTS.VALUES);
    addStyledText(pdf, 'INV NO:', COORDINATES.TABLE_SECTION.INVOICE_NO.x, y + COORDINATES.TABLE_SECTION.INVOICE_NO.y, STYLES.FONTS.LABELS);
    addStyledText(pdf, biltyData.invoice_no || 'N/A', COORDINATES.TABLE_SECTION.INVOICE_NO_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_NO_VALUE.y, STYLES.FONTS.VALUES);
    addStyledText(pdf, 'INV VALUE:', COORDINATES.TABLE_SECTION.INVOICE_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_VALUE.y, STYLES.FONTS.LABELS);
    addStyledText(pdf, biltyData.invoice_value ? `₹${biltyData.invoice_value}` : 'N/A', COORDINATES.TABLE_SECTION.INVOICE_VALUE_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_VALUE_VALUE.y, STYLES.FONTS.VALUES);

    // PVT Marks and City Code Box
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.rect(COORDINATES.TABLE_SECTION.PVT_BOX.x, y + COORDINATES.TABLE_SECTION.PVT_BOX.y, COORDINATES.TABLE_SECTION.PVT_BOX.width, COORDINATES.TABLE_SECTION.PVT_BOX.height);
    pdf.line(COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.x, y + COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.y1, COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.x, y + COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.y2);
    addStyledText(pdf, 'PVT MARKS:', COORDINATES.TABLE_SECTION.PVT_LABEL.x, y + COORDINATES.TABLE_SECTION.PVT_LABEL.y, STYLES.FONTS.LABELS, { align: 'center' });
    addStyledText(pdf, biltyData.pvt_marks || 'N/A', COORDINATES.TABLE_SECTION.PVT_VALUE.x, y + COORDINATES.TABLE_SECTION.PVT_VALUE.y, STYLES.FONTS.VALUES, { align: 'center' });
    addStyledText(pdf, 'CITY CODE:', COORDINATES.TABLE_SECTION.CITY_LABEL.x, y + COORDINATES.TABLE_SECTION.CITY_LABEL.y, STYLES.FONTS.LABELS, { align: 'center' });
    addStyledText(pdf, toCityCode, COORDINATES.TABLE_SECTION.CITY_VALUE.x, y + COORDINATES.TABLE_SECTION.CITY_VALUE.y, STYLES.FONTS.VALUES, { align: 'center' });

    // Content and Weight
    addStyledText(pdf, 'CONTENT:', COORDINATES.TABLE_SECTION.CONTENT.x, y + COORDINATES.TABLE_SECTION.CONTENT.y, STYLES.FONTS.LABELS);
    addStyledText(pdf, biltyData.contain || 'N/A', COORDINATES.TABLE_SECTION.CONTENT_VALUE.x, y + COORDINATES.TABLE_SECTION.CONTENT_VALUE.y, STYLES.FONTS.VALUES);
    addStyledText(pdf, `PKG: ${biltyData.no_of_pkg || 0}  WT: ${biltyData.wt || 0} KG`, COORDINATES.TABLE_SECTION.WEIGHT.x, y + COORDINATES.TABLE_SECTION.WEIGHT.y, STYLES.FONTS.LABELS);

    // Charges Section (Right side)
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(COORDINATES.TABLE_SECTION.VERTICAL_LINE.x, y + COORDINATES.TABLE_SECTION.VERTICAL_LINE.y1, COORDINATES.TABLE_SECTION.VERTICAL_LINE.x, y + COORDINATES.TABLE_SECTION.VERTICAL_LINE.y2);
    pdf.line(COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.y1, COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.y2);
    pdf.line(COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.y1, COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.y2);

    // Define column positions for proper alignment
    const labelX = COORDINATES.TABLE_SECTION.AMOUNT.x;
    const valueX = labelX + 45;

    // Calculate amount
    const amount = Math.round(parseFloat(biltyData.wt || 0) * parseFloat(biltyData.rate || 0));

    // Charges with aligned columns
    addStyledText(pdf, 'AMOUNT:', labelX, y + COORDINATES.TABLE_SECTION.AMOUNT.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${amount}`, valueX, y + COORDINATES.TABLE_SECTION.AMOUNT.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    
    addStyledText(pdf, 'LABOUR CHARGE:', labelX, y + COORDINATES.TABLE_SECTION.LABOUR_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.labour_charge || 0}`, valueX, y + COORDINATES.TABLE_SECTION.LABOUR_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    
    addStyledText(pdf, 'BILTY CHARGE:', labelX, y + COORDINATES.TABLE_SECTION.BILTY_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.bill_charge || 0}`, valueX, y + COORDINATES.TABLE_SECTION.BILTY_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    
    addStyledText(pdf, 'TOLL TAX:', labelX, y + COORDINATES.TABLE_SECTION.TOLL_TAX.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.toll_charge || 0}`, valueX, y + COORDINATES.TABLE_SECTION.TOLL_TAX.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    
    addStyledText(pdf, 'PF:', labelX, y + COORDINATES.TABLE_SECTION.PF.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.pf_charge || 0}`, valueX, y + COORDINATES.TABLE_SECTION.PF.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    
    addStyledText(pdf, 'OTHER CHARGE:', labelX, y + COORDINATES.TABLE_SECTION.OTHER_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.other_charge || 0}`, valueX, y + COORDINATES.TABLE_SECTION.OTHER_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });

    // Total
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(COORDINATES.TABLE_SECTION.TOTAL_LINE.x1, y + COORDINATES.TABLE_SECTION.TOTAL_LINE.y, COORDINATES.TABLE_SECTION.TOTAL_LINE.x2, y + COORDINATES.TABLE_SECTION.TOTAL_LINE.y);
    addStyledText(pdf, 'TOTAL:', labelX, y + COORDINATES.TABLE_SECTION.TOTAL.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.total || 0}`, valueX, y + COORDINATES.TABLE_SECTION.TOTAL.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });

    // Payment Status with Delivery Type
    const paymentText = formatPaymentMode(biltyData.payment_mode || 'TO PAY');
    const deliveryTypeText = formatDeliveryType(biltyData.delivery_type);
    const combinedText = paymentText + (deliveryTypeText ? ` ${deliveryTypeText}` : '');
    addStyledText(pdf, combinedText, COORDINATES.TABLE_SECTION.PAYMENT_STATUS.x, y + COORDINATES.TABLE_SECTION.PAYMENT_STATUS.y, STYLES.FONTS.LARGE_STATUS);

    // Footer
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(COORDINATES.FOOTER_SECTION.FOOTER_LINE.x1, y + COORDINATES.FOOTER_SECTION.FOOTER_LINE.y, COORDINATES.FOOTER_SECTION.FOOTER_LINE.x2, y + COORDINATES.FOOTER_SECTION.FOOTER_LINE.y);
    addStyledText(pdf, 'www.movesure.io', COORDINATES.FOOTER_SECTION.WEBSITE.x, y + COORDINATES.FOOTER_SECTION.WEBSITE.y, STYLES.FONTS.SMALL);
    addStyledText(pdf, 'BOOKED AT OWNER\'S RISK', COORDINATES.FOOTER_SECTION.BOOKED_RISK.x, y + COORDINATES.FOOTER_SECTION.BOOKED_RISK.y, STYLES.FONTS.SMALL);
    addStyledText(pdf, `CUSTOMER CARE: ${permDetails?.mobile_number || '9690836940'}`, COORDINATES.FOOTER_SECTION.CUSTOMER_CARE.x, y + COORDINATES.FOOTER_SECTION.CUSTOMER_CARE.y, STYLES.FONTS.SMALL);
    addStyledText(pdf, 'FOR S.S TRANSPORT CORPORATION', COORDINATES.FOOTER_SECTION.SIGNATURE.x, y + COORDINATES.FOOTER_SECTION.SIGNATURE.y, STYLES.FONTS.SMALL);
  };

  const generatePDFPreview = async (permDetails = permanentDetails, fromCity = fromCityData, toCity = toCityData, transport = transportData) => {
    try {
      setIsGenerating(true);

      if (!permDetails || !fromCity || !toCity) {
        throw new Error('Missing required data for PDF generation');
      }

      console.log('Generating QR code...');
      const qrDataURL = await generateQRCode(`https://console.movesure.io/print/${biltyData.gr_no}`);
      
      console.log('Creating PDF...');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add lemon background
      pdf.setFillColor(255, 255, 210);
      pdf.rect(0, 0, 210, 297, 'F');
      pdf.setFillColor(255, 255, 255);
      
      // QR Codes
      if (qrDataURL) {
        pdf.addImage(qrDataURL, 'PNG', COORDINATES.QR_SECTION.QR_CODE.x, COORDINATES.QR_SECTION.QR_CODE.y, COORDINATES.QR_SECTION.QR_CODE.width, COORDINATES.QR_SECTION.QR_CODE.height);
        pdf.addImage(qrDataURL, 'PNG', COORDINATES.QR_SECTION.QR_CODE.x, COORDINATES.QR_SECTION.QR_CODE.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, COORDINATES.QR_SECTION.QR_CODE.width, COORDINATES.QR_SECTION.QR_CODE.height);
      }
      
      // GR Boxes
      pdf.setLineWidth(STYLES.LINES.THICK);
      pdf.rect(COORDINATES.QR_SECTION.GR_BOX.x, COORDINATES.QR_SECTION.GR_BOX.y, COORDINATES.QR_SECTION.GR_BOX.width, COORDINATES.QR_SECTION.GR_BOX.height);
      addStyledText(pdf, 'GR NO', COORDINATES.QR_SECTION.GR_LABEL.x, COORDINATES.QR_SECTION.GR_LABEL.y, STYLES.FONTS.GR_LABEL);
      pdf.setFontSize(12);
      pdf.setFont('times', 'bold');
      pdf.text(`SSTC-2025-26-${biltyData.gr_no}`, COORDINATES.QR_SECTION.GR_NUMBER.x, COORDINATES.QR_SECTION.GR_NUMBER.y);

      pdf.rect(COORDINATES.QR_SECTION.GR_BOX.x, COORDINATES.QR_SECTION.GR_BOX.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, COORDINATES.QR_SECTION.GR_BOX.width, COORDINATES.QR_SECTION.GR_BOX.height);
      addStyledText(pdf, 'GR NO', COORDINATES.QR_SECTION.GR_LABEL.x, COORDINATES.QR_SECTION.GR_LABEL.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, STYLES.FONTS.GR_LABEL);
      pdf.setFontSize(12);
      pdf.setFont('times', 'bold');
      pdf.text(`SSTC-2025-26-${biltyData.gr_no}`, COORDINATES.QR_SECTION.GR_NUMBER.x, COORDINATES.QR_SECTION.GR_NUMBER.y + COORDINATES.SPACING.SECOND_COPY_OFFSET);
      
      // Caution Boxes
      pdf.setLineWidth(STYLES.LINES.NORMAL);
      pdf.rect(COORDINATES.QR_SECTION.CAUTION_BOX.x, COORDINATES.QR_SECTION.CAUTION_BOX.y, COORDINATES.QR_SECTION.CAUTION_BOX.width, COORDINATES.QR_SECTION.CAUTION_BOX.height);
      addStyledText(pdf, 'CAUTION', COORDINATES.QR_SECTION.CAUTION_LABEL.x, COORDINATES.QR_SECTION.CAUTION_LABEL.y, STYLES.FONTS.LABELS, { align: 'center' });
      
      setStyle(pdf, STYLES.FONTS.SMALL);
      const cautionText = "The Consignment Will Not Be Diverted, Re-Routed or Re-Booked Without Consignee's Written Permission and Will Not Be Delivered Without Original Consignment Note.\nAll Subject To Aligarh Jurisdiction.";
      const textParts = cautionText.split('\n');
      const mainText = textParts[0];
      const jurisdictionText = textParts[1];
      
      addJustifiedText(pdf, mainText, COORDINATES.QR_SECTION.CAUTION_TEXT_START.x, COORDINATES.QR_SECTION.CAUTION_TEXT_START.y, 62, 3);
      const mainTextLines = pdf.splitTextToSize(mainText, 62);
      const jurisdictionY = COORDINATES.QR_SECTION.CAUTION_TEXT_START.y + (mainTextLines.length * 3) + 1.8;
      const centerX = COORDINATES.QR_SECTION.CAUTION_TEXT_START.x + (62 / 2);
      pdf.text(jurisdictionText, centerX, jurisdictionY, { align: 'center' });
      
      pdf.rect(COORDINATES.QR_SECTION.CAUTION_BOX.x, COORDINATES.QR_SECTION.CAUTION_BOX.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, COORDINATES.QR_SECTION.CAUTION_BOX.width, COORDINATES.QR_SECTION.CAUTION_BOX.height);
      addStyledText(pdf, 'CAUTION', COORDINATES.QR_SECTION.CAUTION_LABEL.x, COORDINATES.QR_SECTION.CAUTION_LABEL.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, STYLES.FONTS.LABELS, { align: 'center' });
      
      setStyle(pdf, STYLES.FONTS.SMALL);
      const offsetY = COORDINATES.SPACING.SECOND_COPY_OFFSET;
      addJustifiedText(pdf, mainText, COORDINATES.QR_SECTION.CAUTION_TEXT_START.x, COORDINATES.QR_SECTION.CAUTION_TEXT_START.y + offsetY, 62, 3);
      const secondCopyJurisdictionY = COORDINATES.QR_SECTION.CAUTION_TEXT_START.y + offsetY + (mainTextLines.length * 3) + 2;
      pdf.text(jurisdictionText, centerX, secondCopyJurisdictionY, { align: 'center' });
      
      // Add both bill copies
      addBillCopy(pdf, 0, 'CONSIGNOR', qrDataURL, permDetails, fromCity, toCity, transport);
      
      pdf.setLineWidth(STYLES.LINES.THICK);
      pdf.setLineDashPattern(STYLES.LINES.DASHED, 0);
      pdf.line(10, COORDINATES.SPACING.DASHED_LINE_Y, 200, COORDINATES.SPACING.DASHED_LINE_Y);
      pdf.setLineDashPattern([], 0);
      
      addBillCopy(pdf, COORDINATES.SPACING.SECOND_COPY_OFFSET, 'DRIVER', qrDataURL, permDetails, fromCity, toCity, transport);
      
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      
      console.log('PDF preview generated successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!pdfUrl) {
      await generatePDFPreview();
      return;
    }
    
    const fileName = `bilty_${biltyData.gr_no}_${new Date().toISOString().split('T')[0]}.pdf`;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    if (pdfUrl) {
      const printFrame = document.createElement('iframe');
      printFrame.style.display = 'none';
      printFrame.src = pdfUrl;
      
      document.body.appendChild(printFrame);
      
      printFrame.onload = () => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
          
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        } catch (error) {
          console.error('Error printing PDF:', error);
          const printWindow = window.open(pdfUrl, '_blank');
          printWindow.addEventListener('load', () => {
            printWindow.print();
          });
          document.body.removeChild(printFrame);
        }
      };
    }
  };

  const loadAllDataAndGeneratePreview = async () => {
    try {
      setLoading(true);

      const { data: permDetailsData, error: permError } = await supabase
        .from('permanent_details')
        .select('*')
        .eq('branch_id', biltyData.branch_id)
        .single();

      if (permError) throw permError;
      setPermanentDetails(permDetailsData);

      const { data: cities, error: citiesError } = await supabase
        .from('cities')
        .select('*');

      if (citiesError) throw citiesError;

      const fromCity = cities.find(c => c.city_code === branchData.city_code);
      const toCity = cities.find(c => c.id?.toString() === biltyData.to_city_id?.toString());
      
      setFromCityData(fromCity);
      setToCityData(toCity);

      if (biltyData.transport_name) {
        const { data: transportInfo, error: transportError } = await supabase
          .from('transport')
          .select('*')
          .eq('transport_name', biltyData.transport_name)
          .single();

        if (!transportError && transportInfo) {
          setTransportData(transportInfo);
        }
      }

      await generatePDFPreview(permDetailsData, fromCity, toCity, transportData);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (biltyData?.branch_id) {
      loadAllDataAndGeneratePreview();
    }
  }, [biltyData]);

  // Cleanup PDF URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Keyboard event for Enter to print
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Enter' && pdfUrl && !isGenerating && !loading) {
        printPDF();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [pdfUrl, isGenerating, loading]);

  return {
    pdfUrl,
    loading,
    isGenerating,
    permanentDetails,
    fromCityData,
    toCityData,
    transportData,
    loadAllDataAndGeneratePreview,
    downloadPDF,
    printPDF
  };
};
