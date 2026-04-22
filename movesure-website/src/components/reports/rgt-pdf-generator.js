'use client';

import React, { useEffect, useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { RefreshCw, Download, X, Printer, FileText, Package, DollarSign, TruckIcon } from 'lucide-react';

const RGT_COMPANY = {
  name: 'RGT LOGISTICS COMPANY',
  gst: '09ABCDE1234F1ZT',
  mobile: '9211350179, 8198826777',
  email: 'rgtlogisticscompany@gmail.com',
  website: 'https://www.rgtlogistics.com',
  address_ho: 'H.O. - D-78, Oil Market, Mangolpuri, Phase-1, New Delhi-110083',
  address_bo: 'B.O. - Vallabh Enclave, Near Shiv Shakti Dharam Kanta, Nagli Poona, Delhi-36',
  bank_1: '',
  ifsc_1: '',
  bank_2: '',
  ifsc_2: '',
};

// ==========================================
// COORDINATE CONFIGURATION - EXACT MATCH WITH BILTY PDF
// ==========================================
const COORDINATES = {
  HEADER: {
    LOGO: { x: 8, y: 10, width: 32, height: 26 },
    GST_NO: { x: 8, y: 8 },
    COMPANY_NAME: { x: 105, y: 18 },
    BANK_DETAIL_1: { x: 12, y: 27 },
    BANK_DETAIL_2: { x: 12, y: 30 },
    BRANCH_ADDRESS_1: { x: 120, y: 43 },
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
    ROUTE: { x: 55, y: 33 },
  },
  DELIVERY_SECTION: {
    DELIVERY_AT: { x: 12, y: 45 },
    GSTIN: { x: 12, y: 50 },
    MOBILE: { x: 60, y: 50 },
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
    GR_LABEL: { size: 10, weight: 'bold', family: 'helvetica' },
    LABELS: { size: 9.5, weight: 'bold', family: 'times' },
    VALUES: { size: 9.5, weight: 'normal', family: 'times' },
    ENHANCED_LABELS: { size: 10.5, weight: 'bold', family: 'times' },
    ENHANCED_VALUES: { size: 10, weight: 'bold', family: 'times' },
    TOTAL: { size: 14, weight: 'bold', family: 'helvetica' },
    ENHANCED_CHARGES: { size: 11, weight: 'bold', family: 'times' },
  },
  LINES: {
    NORMAL: 0.5,
    THICK: 1.0,
    EXTRA_THICK: 1.5,
    DASHED: [3, 3],
  },
};

export default function RGTPdfGenerator({ biltyData, onClose }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [blackLogoDataUrl, setBlackLogoDataUrl] = useState(null);
  const [logoReady, setLogoReady] = useState(false);
  const printButtonRef = useRef(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent || '';
      setIsMobile(/android|iphone|ipad|ipod|mobile/i.test(ua) || window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load logo and convert to BLACK
  useEffect(() => {
    const processLogo = async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = '/RGT.png';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Convert all non-transparent pixels to BLACK
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha > 30) {
              const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
              if (brightness < 240) {
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
                data[i + 3] = Math.min(255, alpha * 1.5);
              }
            }
          }
          ctx.putImageData(imageData, 0, 0);
          setBlackLogoDataUrl(canvas.toDataURL('image/png'));
          setLogoReady(true);
        };
        img.onerror = () => { setBlackLogoDataUrl(null); setLogoReady(true); };
      } catch {
        setLogoReady(true);
      }
    };
    processLogo();
  }, []);

  // Generate PDF once logo ready
  useEffect(() => {
    if (logoReady) generatePDFPreview();
  }, [logoReady]);

  useEffect(() => {
    if (printButtonRef.current && pdfUrl) setTimeout(() => printButtonRef.current?.focus(), 100);
  }, [pdfUrl]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' && pdfUrl) { e.preventDefault(); printPDF(); }
      if (e.ctrlKey && e.key === 'p' && pdfUrl) { e.preventDefault(); printPDF(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pdfUrl]);

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  const setStyle = (pdf, style) => {
    pdf.setFontSize(style.size);
    pdf.setFont(style.family || 'helvetica', style.weight);
  };

  const addText = (pdf, text, x, y, style = STYLES.FONTS.NORMAL, options = {}) => {
    setStyle(pdf, style);
    pdf.text(text, x, y, options);
  };

  const addHeaderText = (pdf, text, x, y, size = 16, options = {}) => {
    pdf.setFontSize(size);
    pdf.setFont('times', 'bold');
    pdf.text(text, x, y, options);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatPaymentMode = (mode) => {
    if (!mode) return 'TO PAY';
    switch (mode.toLowerCase()) {
      case 'to-pay': return 'TO PAY';
      case 'paid': return 'PAID';
      case 'freeofcost': return 'FOC';
      default: return mode.toUpperCase();
    }
  };

  const formatDeliveryType = (dt) => {
    if (dt === 'door-delivery') return '/ DD';
    if (dt === 'godown-delivery') return '/ GD';
    return '';
  };

  const addJustifiedText = (pdf, text, x, y, maxWidth, lineHeight = 3) => {
    const words = text.split(' ');
    let line = '';
    let curY = y;
    for (let i = 0; i < words.length; i++) {
      const testLine = line ? `${line} ${words[i]}` : words[i];
      const testWidth = pdf.getTextWidth(testLine);
      if (testWidth > maxWidth && line) {
        const wordsInLine = line.split(' ');
        if (wordsInLine.length > 1) {
          const totalWordWidth = wordsInLine.reduce((sum, w) => sum + pdf.getTextWidth(w), 0);
          const totalSpace = maxWidth - totalWordWidth;
          const spaceWidth = totalSpace / (wordsInLine.length - 1);
          let curX = x;
          wordsInLine.forEach((word, idx) => {
            pdf.text(word, curX, curY);
            curX += pdf.getTextWidth(word) + (idx < wordsInLine.length - 1 ? spaceWidth : 0);
          });
        } else {
          pdf.text(line, x, curY);
        }
        line = words[i];
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) {
      if (line.includes('Jurisdiction')) {
        pdf.text(line, x + (maxWidth / 2), curY, { align: 'center' });
      } else {
        pdf.text(line, x, curY);
      }
    }
  };

  const generateQRCode = async (text) => {
    try {
      return await QRCode.toDataURL(text, {
        width: 100, height: 100, margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch { return null; }
  };

  // ==========================================
  // BILL COPY - EXACT LAYOUT MATCH WITH BILTY PDF
  // ==========================================
  const addBillCopy = (pdf, yStart, copyType, qrDataURL) => {
    const y = yStart;
    const fromCity = (biltyData.from_city || '').toUpperCase();
    const toCity = (biltyData.to_city || '').toUpperCase();

    // LOGO (black) - top left
    if (blackLogoDataUrl) {
      try {
        pdf.addImage(blackLogoDataUrl, 'PNG',
          COORDINATES.HEADER.LOGO.x, y + COORDINATES.HEADER.LOGO.y,
          COORDINATES.HEADER.LOGO.width, COORDINATES.HEADER.LOGO.height);
      } catch (e) { console.warn('Logo add failed', e); }
    }

    // GST Number - top left
    if (RGT_COMPANY.gst) {
      addText(pdf, `GST No: ${RGT_COMPANY.gst}`,
        COORDINATES.HEADER.GST_NO.x, y + COORDINATES.HEADER.GST_NO.y, STYLES.FONTS.LABELS);
    }

    // Website - top right
    if (RGT_COMPANY.website) {
      addText(pdf, RGT_COMPANY.website, 205, y + COORDINATES.HEADER.GST_NO.y, STYLES.FONTS.LABELS, { align: 'right' });
    }

    // Company Name (center)
    addHeaderText(pdf, RGT_COMPANY.name,
      COORDINATES.HEADER.COMPANY_NAME.x, y + COORDINATES.HEADER.COMPANY_NAME.y, 20, { align: 'center' });

    // Bank Details
    if (RGT_COMPANY.bank_1) {
      addText(pdf, `BANK A/C No: ${RGT_COMPANY.bank_1} IFSC CODE ${RGT_COMPANY.ifsc_1}`,
        COORDINATES.HEADER.BANK_DETAIL_1.x, y + COORDINATES.HEADER.BANK_DETAIL_1.y, STYLES.FONTS.TINY);
    }
    if (RGT_COMPANY.bank_2) {
      addText(pdf, `BANK A/C No: ${RGT_COMPANY.bank_2} IFSC CODE ${RGT_COMPANY.ifsc_2}`,
        COORDINATES.HEADER.BANK_DETAIL_2.x, y + COORDINATES.HEADER.BANK_DETAIL_2.y, STYLES.FONTS.TINY);
    }

    // Address (H.O. & B.O.)
    if (RGT_COMPANY.address_ho) {
      addText(pdf, RGT_COMPANY.address_ho,
        105, y + 25, STYLES.FONTS.TINY, { align: 'center' });
    }
    if (RGT_COMPANY.address_bo) {
      addText(pdf, RGT_COMPANY.address_bo,
        105, y + 28, STYLES.FONTS.TINY, { align: 'center' });
    }
    // Email
    if (RGT_COMPANY.email) {
      addText(pdf, `Email: ${RGT_COMPANY.email}`,
        105, y + 31, STYLES.FONTS.TINY, { align: 'center' });
    }

    // COPY TYPE
    addText(pdf, `${copyType.toUpperCase()} COPY`,
      COORDINATES.COPY_SECTION.COPY_TYPE.x, y + COORDINATES.COPY_SECTION.COPY_TYPE.y,
      STYLES.FONTS.NOTICE, { align: 'center' });
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(COORDINATES.COPY_SECTION.COPY_UNDERLINE.x1, y + COORDINATES.COPY_SECTION.COPY_UNDERLINE.y,
      COORDINATES.COPY_SECTION.COPY_UNDERLINE.x2, y + COORDINATES.COPY_SECTION.COPY_UNDERLINE.y);

    // Date
    addText(pdf, `Date: ${formatDate(biltyData.bilty_date)}`,
      COORDINATES.COPY_SECTION.DATE.x, y + COORDINATES.COPY_SECTION.DATE.y, STYLES.FONTS.LABELS);

    // Route
    const toCityCode = toCity.length > 3 ? toCity.substring(0, 3) : toCity;
    addText(pdf, `${fromCity} TO ${toCity} (${toCityCode})`,
      COORDINATES.COPY_SECTION.ROUTE.x, y + COORDINATES.COPY_SECTION.ROUTE.y, STYLES.FONTS.NOTICE);

    // DELIVERY AT
    addText(pdf, `DELIVERY AT: ${biltyData.transport_name || ''}`,
      COORDINATES.DELIVERY_SECTION.DELIVERY_AT.x, y + COORDINATES.DELIVERY_SECTION.DELIVERY_AT.y, STYLES.FONTS.ENHANCED_LABELS);
    addText(pdf, `GSTIN: ${biltyData.transport_gst || ''}`,
      COORDINATES.DELIVERY_SECTION.GSTIN.x, y + COORDINATES.DELIVERY_SECTION.GSTIN.y, STYLES.FONTS.ENHANCED_LABELS);
    if (biltyData.transport_number || RGT_COMPANY.mobile) {
      addText(pdf, `MOB: ${biltyData.transport_number || RGT_COMPANY.mobile}`,
        COORDINATES.DELIVERY_SECTION.MOBILE.x, y + COORDINATES.DELIVERY_SECTION.MOBILE.y, STYLES.FONTS.ENHANCED_LABELS);
    }

    // CONSIGNOR
    addText(pdf, `CONSIGNOR: ${(biltyData.consignor_name || '').toUpperCase()}`,
      COORDINATES.PEOPLE_SECTION.CONSIGNOR_NAME.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_NAME.y, STYLES.FONTS.ENHANCED_LABELS);
    addText(pdf, `GSTIN: ${biltyData.consignor_gst || ''}`,
      COORDINATES.PEOPLE_SECTION.CONSIGNOR_GST.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_GST.y, STYLES.FONTS.ENHANCED_VALUES);
    if (biltyData.consignor_number) {
      addText(pdf, `MOB: ${biltyData.consignor_number}`,
        COORDINATES.PEOPLE_SECTION.CONSIGNOR_MOBILE.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_MOBILE.y, STYLES.FONTS.ENHANCED_VALUES);
    }

    // CONSIGNEE
    addText(pdf, `CONSIGNEE: ${(biltyData.consignee_name || '').toUpperCase()}`,
      COORDINATES.PEOPLE_SECTION.CONSIGNEE_NAME.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_NAME.y, STYLES.FONTS.ENHANCED_LABELS);
    let gstText = biltyData.consignee_gst || '';
    if (gstText.startsWith('AD-')) {
      addText(pdf, `AADHAR NO: ${gstText.replace('AD-', '')}`,
        COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y, STYLES.FONTS.ENHANCED_VALUES);
    } else if (gstText.toLowerCase().startsWith('pan')) {
      addText(pdf, `PAN NO: ${gstText.substring(3)}`,
        COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y, STYLES.FONTS.ENHANCED_VALUES);
    } else {
      addText(pdf, `GSTIN: ${gstText}`,
        COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y, STYLES.FONTS.ENHANCED_VALUES);
    }
    if (biltyData.consignee_number) {
      addText(pdf, `MOB: ${biltyData.consignee_number}`,
        COORDINATES.PEOPLE_SECTION.CONSIGNEE_MOBILE.x, y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_MOBILE.y, STYLES.FONTS.ENHANCED_VALUES);
    }

    // E-WAY BILL
    addText(pdf, 'E-WAY BILL: ',
      COORDINATES.PEOPLE_SECTION.EWAY_BILL.x, y + COORDINATES.PEOPLE_SECTION.EWAY_BILL.y, STYLES.FONTS.LABELS);
    addText(pdf, `${biltyData.e_way_bill || ''}`,
      COORDINATES.PEOPLE_SECTION.EWAY_BILL.x + 25, y + COORDINATES.PEOPLE_SECTION.EWAY_BILL.y, STYLES.FONTS.ENHANCED_VALUES);

    // ===== TABLE SECTION =====
    pdf.setLineWidth(STYLES.LINES.THICK);
    pdf.line(COORDINATES.TABLE_SECTION.TOP_LINE.x1, y + COORDINATES.TABLE_SECTION.TOP_LINE.y,
      COORDINATES.TABLE_SECTION.TOP_LINE.x2, y + COORDINATES.TABLE_SECTION.TOP_LINE.y);

    // Invoice details (left)
    addText(pdf, 'INVOICE DATE:', COORDINATES.TABLE_SECTION.INVOICE_DATE.x, y + COORDINATES.TABLE_SECTION.INVOICE_DATE.y, STYLES.FONTS.LABELS);
    addText(pdf, biltyData.invoice_date ? formatDate(biltyData.invoice_date) : '',
      COORDINATES.TABLE_SECTION.INVOICE_DATE_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_DATE_VALUE.y, STYLES.FONTS.VALUES);
    addText(pdf, 'INVOICE NO:', COORDINATES.TABLE_SECTION.INVOICE_NO.x, y + COORDINATES.TABLE_SECTION.INVOICE_NO.y, STYLES.FONTS.LABELS);
    addText(pdf, `${biltyData.invoice_no || ''}`,
      COORDINATES.TABLE_SECTION.INVOICE_NO_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_NO_VALUE.y, STYLES.FONTS.VALUES);
    addText(pdf, 'INVOICE VALUE:', COORDINATES.TABLE_SECTION.INVOICE_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_VALUE.y, STYLES.FONTS.LABELS);
    addText(pdf, `${biltyData.invoice_value || ''}`,
      COORDINATES.TABLE_SECTION.INVOICE_VALUE_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_VALUE_VALUE.y, STYLES.FONTS.VALUES);
    addText(pdf, 'CONTENT:', COORDINATES.TABLE_SECTION.CONTENT.x, y + COORDINATES.TABLE_SECTION.CONTENT.y, STYLES.FONTS.LABELS);
    addText(pdf, `${biltyData.contain || ''}`,
      COORDINATES.TABLE_SECTION.CONTENT_VALUE.x, y + COORDINATES.TABLE_SECTION.CONTENT_VALUE.y, STYLES.FONTS.VALUES);

    // PVT MARKS / CITY CODE box
    pdf.setLineWidth(STYLES.LINES.THICK);
    pdf.rect(COORDINATES.TABLE_SECTION.PVT_BOX.x, y + COORDINATES.TABLE_SECTION.PVT_BOX.y,
      COORDINATES.TABLE_SECTION.PVT_BOX.width, COORDINATES.TABLE_SECTION.PVT_BOX.height);
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.x, y + COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.y1,
      COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.x, y + COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.y2);

    addText(pdf, 'PVT MARKS:', COORDINATES.TABLE_SECTION.PVT_LABEL.x, y + COORDINATES.TABLE_SECTION.PVT_LABEL.y, STYLES.FONTS.LABELS, { align: 'center' });
    addText(pdf, `${biltyData.pvt_marks || ''} / ${biltyData.no_of_pkg || ''}`,
      COORDINATES.TABLE_SECTION.PVT_VALUE.x, y + COORDINATES.TABLE_SECTION.PVT_VALUE.y, STYLES.FONTS.LARGE_STATUS, { align: 'center' });

    addText(pdf, 'CITY CODE:', COORDINATES.TABLE_SECTION.CITY_LABEL.x, y + COORDINATES.TABLE_SECTION.CITY_LABEL.y, STYLES.FONTS.LABELS, { align: 'center' });
    addText(pdf, toCity, COORDINATES.TABLE_SECTION.CITY_VALUE.x, y + COORDINATES.TABLE_SECTION.CITY_VALUE.y, STYLES.FONTS.LARGE_STATUS, { align: 'center' });

    // Weight
    addText(pdf, `WEIGHT: ${biltyData.wt || 0} KG`,
      COORDINATES.TABLE_SECTION.WEIGHT.x, y + COORDINATES.TABLE_SECTION.WEIGHT.y, STYLES.FONTS.NOTICE);

    // Vertical lines
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(COORDINATES.TABLE_SECTION.VERTICAL_LINE.x, y + COORDINATES.TABLE_SECTION.VERTICAL_LINE.y1,
      COORDINATES.TABLE_SECTION.VERTICAL_LINE.x, y + COORDINATES.TABLE_SECTION.VERTICAL_LINE.y2);
    pdf.line(COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.y1,
      COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.y2);
    pdf.line(COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.y1,
      COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.x, y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.y2);

    // CHARGES
    const amount = biltyData.freight_amount || Math.round((parseFloat(biltyData.wt) || 0) * (parseFloat(biltyData.rate) || 0));
    const labelX = COORDINATES.TABLE_SECTION.AMOUNT.x;
    const valueX = labelX + 45;

    addText(pdf, 'AMOUNT:', labelX, y + COORDINATES.TABLE_SECTION.AMOUNT.y, STYLES.FONTS.ENHANCED_CHARGES);
    addText(pdf, `${amount}`, valueX, y + COORDINATES.TABLE_SECTION.AMOUNT.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    addText(pdf, 'LABOUR CHARGE:', labelX, y + COORDINATES.TABLE_SECTION.LABOUR_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
    addText(pdf, `${biltyData.labour_charge || 0}`, valueX, y + COORDINATES.TABLE_SECTION.LABOUR_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    addText(pdf, 'BILTY CHARGE:', labelX, y + COORDINATES.TABLE_SECTION.BILTY_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
    addText(pdf, `${biltyData.bill_charge || 0}`, valueX, y + COORDINATES.TABLE_SECTION.BILTY_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    addText(pdf, 'TOLL TAX:', labelX, y + COORDINATES.TABLE_SECTION.TOLL_TAX.y, STYLES.FONTS.ENHANCED_CHARGES);
    addText(pdf, `${biltyData.toll_charge || 0}`, valueX, y + COORDINATES.TABLE_SECTION.TOLL_TAX.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    addText(pdf, 'PF:', labelX, y + COORDINATES.TABLE_SECTION.PF.y, STYLES.FONTS.ENHANCED_CHARGES);
    addText(pdf, `${biltyData.pf_charge || 0}`, valueX, y + COORDINATES.TABLE_SECTION.PF.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    addText(pdf, 'OTHER CHARGE:', labelX, y + COORDINATES.TABLE_SECTION.OTHER_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
    addText(pdf, `${biltyData.other_charge || 0}`, valueX, y + COORDINATES.TABLE_SECTION.OTHER_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });

    // Total line
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(COORDINATES.TABLE_SECTION.TOTAL_LINE.x1, y + COORDINATES.TABLE_SECTION.TOTAL_LINE.y,
      COORDINATES.TABLE_SECTION.TOTAL_LINE.x2, y + COORDINATES.TABLE_SECTION.TOTAL_LINE.y);
    addText(pdf, 'TOTAL:', labelX, y + COORDINATES.TABLE_SECTION.TOTAL.y, STYLES.FONTS.ENHANCED_CHARGES);
    addText(pdf, `${biltyData.total || 0}`, valueX, y + COORDINATES.TABLE_SECTION.TOTAL.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });

    // Payment Status
    const paymentText = formatPaymentMode(biltyData.payment_mode);
    const deliveryTypeText = formatDeliveryType(biltyData.delivery_type);
    addText(pdf, paymentText + (deliveryTypeText ? ` ${deliveryTypeText}` : ''),
      COORDINATES.TABLE_SECTION.PAYMENT_STATUS.x, y + COORDINATES.TABLE_SECTION.PAYMENT_STATUS.y, STYLES.FONTS.LARGE_STATUS);

    // NOTICE
    addText(pdf, 'NOTICE', COORDINATES.NOTICE_SECTION.NOTICE_LABEL.x, y + COORDINATES.NOTICE_SECTION.NOTICE_LABEL.y, STYLES.FONTS.NOTICE);
    setStyle(pdf, STYLES.FONTS.TINY);
    let noticeY = COORDINATES.NOTICE_SECTION.NOTICE_LABEL.y + 3;
    const n1 = "The Consignment covered by this Lorry Receipt shall be stored at destination under the control of the Transport Operator & shall be delivered to or to the order of the Consignee.";
    const n2 = "We are not responsible for leakage, breakage & illegal goods. All disputes subject to jurisdiction.";
    pdf.splitTextToSize(n1, 130).forEach(line => { pdf.text(line, 8, y + noticeY); noticeY += 2.5; });
    pdf.splitTextToSize(n2, 130).forEach(line => { pdf.text(line, 8, y + noticeY); noticeY += 2.5; });

    // Footer
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(COORDINATES.FOOTER_SECTION.FOOTER_LINE.x1, y + COORDINATES.FOOTER_SECTION.FOOTER_LINE.y,
      COORDINATES.FOOTER_SECTION.FOOTER_LINE.x2, y + COORDINATES.FOOTER_SECTION.FOOTER_LINE.y);
    if (RGT_COMPANY.website) addText(pdf, RGT_COMPANY.website, COORDINATES.FOOTER_SECTION.WEBSITE.x, y + COORDINATES.FOOTER_SECTION.WEBSITE.y, STYLES.FONTS.LABELS);
    addText(pdf, "BOOKED AT OWNER'S RISK", COORDINATES.FOOTER_SECTION.BOOKED_RISK.x, y + COORDINATES.FOOTER_SECTION.BOOKED_RISK.y, STYLES.FONTS.LABELS);
    if (RGT_COMPANY.mobile) addText(pdf, `Customer Care: ${RGT_COMPANY.mobile}`, COORDINATES.FOOTER_SECTION.CUSTOMER_CARE.x, y + COORDINATES.FOOTER_SECTION.CUSTOMER_CARE.y, STYLES.FONTS.TINY);
    if (RGT_COMPANY.email) addText(pdf, `Email: ${RGT_COMPANY.email}`, COORDINATES.FOOTER_SECTION.CUSTOMER_CARE.x, y + COORDINATES.FOOTER_SECTION.CUSTOMER_CARE.y + 3, STYLES.FONTS.TINY);
    addText(pdf, 'SIGNATURE OF BOOKING CLERK', COORDINATES.FOOTER_SECTION.SIGNATURE.x, y + COORDINATES.FOOTER_SECTION.SIGNATURE.y, STYLES.FONTS.LABELS);
  };

  // ==========================================
  // GENERATE PDF PREVIEW
  // ==========================================
  const generatePDFPreview = async () => {
    setIsGenerating(true);
    setLoading(true);
    try {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);

      const qrDataURL = await generateQRCode(`RGT-${biltyData.gr_no}`);
      const pdf = new jsPDF('p', 'mm', 'a4');

      // White background
      pdf.setFillColor(255, 255, 255);

      // QR CODES
      if (qrDataURL) {
        pdf.addImage(qrDataURL, 'PNG',
          COORDINATES.QR_SECTION.QR_CODE.x, COORDINATES.QR_SECTION.QR_CODE.y,
          COORDINATES.QR_SECTION.QR_CODE.width, COORDINATES.QR_SECTION.QR_CODE.height);
        pdf.addImage(qrDataURL, 'PNG',
          COORDINATES.QR_SECTION.QR_CODE.x,
          COORDINATES.QR_SECTION.QR_CODE.y + COORDINATES.SPACING.SECOND_COPY_OFFSET,
          COORDINATES.QR_SECTION.QR_CODE.width, COORDINATES.QR_SECTION.QR_CODE.height);
      }

      // GR BOX - First copy
      pdf.setLineWidth(STYLES.LINES.THICK);
      pdf.rect(COORDINATES.QR_SECTION.GR_BOX.x, COORDINATES.QR_SECTION.GR_BOX.y,
        COORDINATES.QR_SECTION.GR_BOX.width, COORDINATES.QR_SECTION.GR_BOX.height);
      addText(pdf, 'GR NO', COORDINATES.QR_SECTION.GR_LABEL.x, COORDINATES.QR_SECTION.GR_LABEL.y, STYLES.FONTS.GR_LABEL);
      pdf.setFontSize(12); pdf.setFont('times', 'bold');
      pdf.text(`RGT-26-27-${biltyData.gr_no}`, COORDINATES.QR_SECTION.GR_NUMBER.x, COORDINATES.QR_SECTION.GR_NUMBER.y);

      // GR BOX - Second copy
      pdf.setLineWidth(STYLES.LINES.THICK);
      pdf.rect(COORDINATES.QR_SECTION.GR_BOX.x,
        COORDINATES.QR_SECTION.GR_BOX.y + COORDINATES.SPACING.SECOND_COPY_OFFSET,
        COORDINATES.QR_SECTION.GR_BOX.width, COORDINATES.QR_SECTION.GR_BOX.height);
      addText(pdf, 'GR NO', COORDINATES.QR_SECTION.GR_LABEL.x,
        COORDINATES.QR_SECTION.GR_LABEL.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, STYLES.FONTS.GR_LABEL);
      pdf.setFontSize(12); pdf.setFont('times', 'bold');
      pdf.text(`RGT-26-27-${biltyData.gr_no}`, COORDINATES.QR_SECTION.GR_NUMBER.x,
        COORDINATES.QR_SECTION.GR_NUMBER.y + COORDINATES.SPACING.SECOND_COPY_OFFSET);

      // CAUTION BOXES
      const cautionMain = "The Consignment Will Not Be Diverted, Re-Routed or Re-Booked Without Consignee's Written Permission and Will Not Be Delivered Without Original Consignment Note.";
      const jurisdictionText = "All Subject To Jurisdiction.";

      const addCautionBox = (offsetY) => {
        pdf.setLineWidth(STYLES.LINES.NORMAL);
        pdf.rect(COORDINATES.QR_SECTION.CAUTION_BOX.x, COORDINATES.QR_SECTION.CAUTION_BOX.y + offsetY,
          COORDINATES.QR_SECTION.CAUTION_BOX.width, COORDINATES.QR_SECTION.CAUTION_BOX.height);
        addText(pdf, 'CAUTION', COORDINATES.QR_SECTION.CAUTION_LABEL.x, COORDINATES.QR_SECTION.CAUTION_LABEL.y + offsetY, STYLES.FONTS.LABELS, { align: 'center' });
        setStyle(pdf, STYLES.FONTS.SMALL);
        addJustifiedText(pdf, cautionMain, COORDINATES.QR_SECTION.CAUTION_TEXT_START.x, COORDINATES.QR_SECTION.CAUTION_TEXT_START.y + offsetY, 62, 3);
        const mainLines = pdf.splitTextToSize(cautionMain, 62);
        const jurY = COORDINATES.QR_SECTION.CAUTION_TEXT_START.y + offsetY + (mainLines.length * 3) + 1.8;
        pdf.text(jurisdictionText, COORDINATES.QR_SECTION.CAUTION_TEXT_START.x + 31, jurY, { align: 'center' });
      };
      addCautionBox(0);
      addCautionBox(COORDINATES.SPACING.SECOND_COPY_OFFSET);

      // BILL COPIES
      addBillCopy(pdf, 0, 'CONSIGNOR', qrDataURL);

      // DASHED SEPARATOR
      pdf.setLineWidth(STYLES.LINES.THICK);
      pdf.setLineDashPattern(STYLES.LINES.DASHED, 0);
      pdf.line(10, COORDINATES.SPACING.DASHED_LINE_Y, 200, COORDINATES.SPACING.DASHED_LINE_Y);
      pdf.setLineDashPattern([], 0);

      addBillCopy(pdf, COORDINATES.SPACING.SECOND_COPY_OFFSET, 'DRIVER', qrDataURL);

      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error.message);
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `RGT_bilty_${biltyData.gr_no}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    if (!pdfUrl) { alert('PDF not ready yet'); return; }
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.src = pdfUrl;
    document.body.appendChild(frame);
    frame.onload = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => document.body.removeChild(frame), 1000);
      } catch {
        const w = window.open(pdfUrl, '_blank');
        w.addEventListener('load', () => w.print());
        document.body.removeChild(frame);
      }
    };
  };

  // LOADING STATE
  if (loading && !pdfUrl) {
    return (
      <div className="fixed inset-0 bg-slate-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="animate-spin h-8 w-8 text-white" />
          </div>
          <div className="text-2xl font-bold text-black mb-2">RGT Logistics</div>
          <div className="w-16 h-0.5 bg-red-500 mx-auto rounded-full mb-4"></div>
          <p className="text-lg font-semibold text-black mb-2">Generating Bilty PDF...</p>
          <p className="text-sm text-gray-600">Please wait while we prepare your document</p>
        </div>
      </div>
    );
  }

  // MOBILE UI
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex flex-col z-50">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-lg"><FileText className="w-5 h-5" /></div>
              <div>
                <h3 className="text-base font-bold">RGT Bilty</h3>
                <p className="text-xs text-red-100">GR: RGT-26-27-{biltyData.gr_no}</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-2">
            <button onClick={generatePDFPreview} disabled={isGenerating}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Loading...' : 'Refresh'}
            </button>
            <button onClick={printPDF} disabled={!pdfUrl}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={downloadPDF} disabled={!pdfUrl}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100 overflow-hidden">
          {pdfUrl ? (
            <iframe src={`${pdfUrl}#zoom=100`} className="w-full h-full border-0" title="PDF Preview" />
          ) : (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center"><FileText className="w-16 h-16 text-red-400 mx-auto mb-4" /><p className="text-gray-600">Click refresh to generate</p></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // DESKTOP UI
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-gray-900/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl"><FileText className="w-6 h-6" /></div>
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  RGT Logistics - Bilty
                  <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-mono">RGT-26-27-{biltyData.gr_no}</span>
                </h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-red-100">
                  <span className="flex items-center gap-1"><TruckIcon className="w-4 h-4" />{biltyData.from_city || 'N/A'} → {biltyData.to_city || 'N/A'}</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />₹{biltyData.total || 0}</span>
                  <span className="flex items-center gap-1"><Package className="w-4 h-4" />{biltyData.no_of_pkg || 0} Pkg</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={generatePDFPreview} disabled={isGenerating}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 border border-white/20 disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Refresh'}</span>
              </button>
              <button ref={printButtonRef} onClick={printPDF} disabled={!pdfUrl}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg focus:ring-4 focus:ring-green-300 disabled:opacity-50">
                <Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span>
              </button>
              <button onClick={downloadPDF} disabled={!pdfUrl}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg disabled:opacity-50">
                <Download className="w-4 h-4" /><span className="hidden sm:inline">Download</span>
              </button>
              <button onClick={onClose} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden bg-gray-50">
          {/* Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${pdfUrl ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`}></div>
                  <h4 className="font-bold text-gray-800">Document Status</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Status:</span>
                    <span className={`font-semibold ${pdfUrl ? 'text-green-600' : 'text-orange-600'}`}>{pdfUrl ? '✓ Ready' : isGenerating ? 'Generating...' : 'Not Generated'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Date:</span>
                    <span className="font-semibold text-gray-800">{formatDate(biltyData.bilty_date)}</span></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Consignor</div>
                  <div className="font-bold text-sm text-gray-900 mb-1 truncate">{biltyData.consignor_name || 'N/A'}</div>
                  {biltyData.consignor_number && <div className="text-xs text-gray-600">MOB: {biltyData.consignor_number}</div>}
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Consignee</div>
                  <div className="font-bold text-sm text-gray-900 mb-1 truncate">{biltyData.consignee_name || 'N/A'}</div>
                  {biltyData.consignee_number && <div className="text-xs text-gray-600">MOB: {biltyData.consignee_number}</div>}
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">Package Info</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center"><div className="text-xs text-gray-600 mb-1">Pkgs</div><div className="font-bold text-lg text-purple-600">{biltyData.no_of_pkg || 0}</div></div>
                  <div className="text-center"><div className="text-xs text-gray-600 mb-1">Weight</div><div className="font-bold text-lg text-purple-600">{biltyData.wt || 0}</div></div>
                  <div className="text-center"><div className="text-xs text-gray-600 mb-1">Rate</div><div className="font-bold text-lg text-purple-600">₹{biltyData.rate || 0}</div></div>
                </div>
              </div>
              <div className={`rounded-lg p-3 ${biltyData.payment_mode === 'paid' ? 'bg-green-100 border-green-300' : 'bg-orange-100 border-orange-300'} border`}>
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">Payment</div>
                  <div className={`text-lg font-bold ${biltyData.payment_mode === 'paid' ? 'text-green-700' : 'text-orange-700'}`}>{formatPaymentMode(biltyData.payment_mode)}</div>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-red-600 text-lg">₹{biltyData.total || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* PDF Preview */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 m-4 bg-white border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg">
              {pdfUrl ? (
                <iframe src={`${pdfUrl}#zoom=110`} className="w-full h-full border-0" title="PDF Preview" />
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="text-center p-8">
                    <div className="bg-gradient-to-br from-red-500 to-red-700 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <FileText className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">{isGenerating ? 'Generating...' : 'PDF Preview'}</h3>
                    {isGenerating && <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>}
                    {!isGenerating && (
                      <button onClick={generatePDFPreview}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto shadow-lg">
                        <RefreshCw className="w-5 h-5" /> Generate PDF
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${pdfUrl ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`}></div>
                <span className="font-semibold text-gray-700">{pdfUrl ? 'Ready' : isGenerating ? 'Generating...' : 'Not Generated'}</span>
              </div>
              <span className="text-gray-600"><span className="font-medium">GR:</span> RGT-26-27-{biltyData.gr_no}</span>
              <span className="text-gray-600"><span className="font-medium">Amount:</span> ₹{biltyData.total || 0}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span><kbd className="px-2 py-1 bg-white border rounded shadow-sm font-mono">Enter</kbd> Print</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
