'use client';

import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import supabase from '../../app/utils/supabase';
import { Download, X, RefreshCw, Printer, FileText, Eye } from 'lucide-react';

const PDFGenerator = ({ 
  biltyData, 
  branchData, 
  onClose 
}) => {
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
  // All coordinates are in millimeters (mm) for A4 paper (210 x 297 mm)
  // You can easily modify these coordinates to adjust the layout

  const COORDINATES = {
    // 🏢 HEADER SECTION
    HEADER: {
      GST_NO: { x: 8, y: 8 },                    // Top left GST number
      COMPANY_NAME: { x: 105, y: 18 },             // Center company name
      BANK_DETAIL_1: { x: 12, y: 25 },             // First bank detail line
      BANK_DETAIL_2: { x: 12, y: 28 },             // Second bank detail line
      BRANCH_ADDRESS_1: { x:130, y: 40 },         // Right side address line 1
      BRANCH_ADDRESS_2: { x: 130, y: 40 },         // Right side address line 2
    },

    // 📱 QR CODE AND GR NUMBER SECTION
    QR_SECTION: {                
      QR_CODE: { x: 180, y: 10, width: 25, height: 25 },  // QR code position and size
      GR_BOX: { x: 147, y: 45, width: 60, height: 10 },   // GR number box
      GR_LABEL: { x: 150, y: 51.4 },                         // "GR NO" text
      GR_NUMBER: { x: 163.5, y: 51.4 },                        // Actual GR number
      CAUTION_BOX: { x: 147, y: 55, width: 60, height: 20 }, // Caution box
      CAUTION_LABEL: { x: 177, y: 58.5 },                    // "CAUTION" text
      CAUTION_TEXT_START: { x: 150, y: 61.5 },               // Caution description start
    },

    // 🎯 COPY TYPE AND DATE SECTION
    COPY_SECTION: {
      COPY_TYPE: { x: 105, y: 10 },               // "CONSIGNEE COPY" / "DRIVER COPY"
      COPY_UNDERLINE: { x1: 85, y: 10, x2: 125 }, // Underline for copy type
      DATE: { x: 12, y: 35 },                     // Date field
      ROUTE: { x: 55, y: 37 },                    // Route (FROM TO CITY)
    },

    // 🚚 DELIVERY AND CONTACT SECTION
    DELIVERY_SECTION: {
      DELIVERY_AT: { x: 12, y: 45 },              // Delivery at transport (without delivery type)
      GSTIN: { x: 12, y: 50 },                    // GSTIN number
      MOBILE: { x: 60, y: 50 },                  // Mobile number
      DELIVERY_TYPE: { x: 190, y: 95 },          // NEW: Delivery type near payment mode
    },

    // 👥 CONSIGNOR AND CONSIGNEE SECTION
    PEOPLE_SECTION: {
      CONSIGNOR_NAME: { x: 12, y: 60 },           // Consignor name
      CONSIGNOR_GST: { x: 12, y: 65 },            // Consignor GST
      CONSIGNOR_MOBILE: { x: 60, y: 65 },        // Consignor mobile
      
      CONSIGNEE_NAME: { x: 12, y: 75 },           // Consignee name
      CONSIGNEE_GST: { x: 12, y: 80 },           // Consignee GST/Aadhar/PAN
      CONSIGNEE_MOBILE: { x: 60, y: 80 },       // Consignee mobile
      
      EWAY_BILL: { x: 12, y: 90 },               // E-way bill
    },

    // 📋 MAIN TABLE SECTION
    TABLE_SECTION: {
      TOP_LINE: { x1: 0, y: 136, x2: 250 },      // Top horizontal line
      
      // Left section - Invoice details
      INVOICE_DATE: { x: 12, y: 100 },
      INVOICE_DATE_VALUE: { x: 45, y: 100},
      INVOICE_NO: { x: 12, y: 105 },
      INVOICE_NO_VALUE: { x: 45, y: 105 },
      INVOICE_VALUE: { x: 12, y: 110 },
      INVOICE_VALUE_VALUE: { x: 45, y: 110 },
      CONTENT: { x: 80, y: 110 },
      CONTENT_VALUE: { x: 100, y: 110 },
      
      // Middle section - Package details
      PVT_MARKS: { x: 80, y: 100 },
      PACKAGE_COUNT: { x: 115, y: 100 },
      CITY_CODE: { x: 130, y: 100 },
      WEIGHT: { x: 80, y: 105 },
      
      // Right section - Charges (vertical line separates this)
      VERTICAL_LINE: { x: 150, y1: 95, y2: 136 }, // Vertical separator line
      
      AMOUNT: { x: 155, y: 100 },
      LABOUR_CHARGE: { x: 155, y: 104 },
      BILTY_CHARGE: { x: 155, y: 108 },
      TOLL_TAX: { x: 155, y: 112 },
      PF: { x: 155, y: 116 },
      OTHER_CHARGE: { x: 155, y: 120 },
      
      // Total section
      TOTAL_LINE: { x1: 150, y: 125, x2: 250 },    // Line above total
      TOTAL: { x: 155, y: 132 },                    // Total amount
      
      PAYMENT_STATUS: { x: 165, y: 95 },           // PAID/TO PAY status
    },

    // 📢 NOTICE SECTION
    NOTICE_SECTION: {
      NOTICE_LABEL: { x: 67, y: 122 },             // "NOTICE" text
      NOTICE_BOX: { x: 10, y: 150, width: 30, height: 15 }, // Box around notice (optional)
    },

    // 📄 FOOTER SECTION
    FOOTER_SECTION: {
      FOOTER_LINE: { x1: 0, y: 118, x2: 150 },    // Bottom horizontal line
      WEBSITE: { x: 12, y: 141 },                   // Website
      BOOKED_RISK: { x: 80, y: 140 },              // "BOOKED AT OWNER'S RISK"
      CUSTOMER_CARE: { x: 12, y: 145 },            // Customer care
      SIGNATURE: { x: 155, y: 146 },               // Signature line
    },

    // 📏 NEW: EXTRA VERTICAL LINES SECTION
    EXTRA_LINES: {
      VERTICAL_LINE_1: { x: 70, y1: 95, y2: 118 },   // First extra vertical line
      VERTICAL_LINE_2: { x: 162.5, y1: 45, y2: 55.5 },  // Second extra vertical line
    },

    // 📏 SPACING AND OFFSETS
    SPACING: {
      SECOND_COPY_OFFSET: 148,                      // Y offset for driver copy
      DASHED_LINE_Y: 148,                           // Y position of dashed separator
      LINE_HEIGHT: 5,                               // Standard line height
      SECTION_SPACING: 10,                          // Space between sections
    }
  };

  // ==========================================
  // 🎨 ENHANCED STYLING CONFIGURATION
  // ==========================================
  const STYLES = {
    FONTS: {
      HEADER: { size: 18, weight: 'bold' },        // Increased header size
      NORMAL: { size: 10, weight: 'normal' },      // Increased normal size
      SMALL: { size: 9, weight: 'normal' },        // Increased small size
      TINY: { size: 7, weight: 'normal' },         // Increased tiny size
      LARGE_STATUS: { size: 14, weight: 'bold' },  // Increased and bold status
      NOTICE: { size: 12, weight: 'bold' },        // Increased notice size
      COMPANY_NAME: { size: 20, weight: 'bold' },  // NEW: Special company name style
      GR_NUMBER: { size: 11, weight: 'bold' },     // NEW: Bold GR number
      LABELS: { size: 9, weight: 'bold' },         // NEW: Bold labels
      VALUES: { size: 9, weight: 'normal' },       // NEW: Normal values
      TOTAL: { size: 14, weight: 'bold' },         // NEW: Large bold total
    },
    LINES: {
      NORMAL: 0.5,      // Normal line width
      THICK: 1.0,       // Thick line width
      EXTRA_THICK: 1.5, // NEW: Extra thick lines
      DASHED: [3, 3],   // Dashed line pattern [dash, gap]
    }
  };

  // ==========================================
  // 🎨 ENHANCED TEXT STYLING HELPER FUNCTIONS
  // ==========================================
  const setStyle = (pdf, style) => {
    pdf.setFontSize(style.size);
    pdf.setFont('helvetica', style.weight);
  };

  const addStyledText = (pdf, text, x, y, style = STYLES.FONTS.NORMAL, options = {}) => {
    setStyle(pdf, style);
    pdf.text(text, x, y, options);
  };

  useEffect(() => {
    if (biltyData?.branch_id) {
      loadAllDataAndGeneratePreview();
    }
  }, [biltyData]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // NEW: Add keyboard event listener for Enter key to print PDF
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Check if Enter key is pressed
      if (event.key === 'Enter' && pdfUrl) {
        event.preventDefault(); // Prevent default browser behavior
        printPDF(); // Print the PDF from embedded preview
      }
      
      // Optional: Also handle Ctrl+P to print PDF instead of page
      if (event.ctrlKey && event.key === 'p' && pdfUrl) {
        event.preventDefault(); // Prevent default browser print dialog
        printPDF(); // Print the PDF instead
      }
    };

    // Add event listener when component mounts
    document.addEventListener('keydown', handleKeyPress);
    
    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [pdfUrl]); // Re-run when pdfUrl changes

  const loadAllDataAndGeneratePreview = async () => {
    try {
      setLoading(true);
      
      // Load all required data in parallel
      const [permRes, fromCityRes, toCityRes] = await Promise.all([
        supabase.from('permanent_details').select('*').eq('branch_id', biltyData.branch_id).single(),
        biltyData.from_city_id ? 
          supabase.from('cities').select('*').eq('id', biltyData.from_city_id).single() : 
          Promise.resolve({ data: null }),
        biltyData.to_city_id ? 
          supabase.from('cities').select('*').eq('id', biltyData.to_city_id).single() : 
          Promise.resolve({ data: null })
      ]);

      setPermanentDetails(permRes.data);
      setFromCityData(fromCityRes.data);
      setToCityData(toCityRes.data);

      // Load transport data based on to_city_id
      let transportRes = { data: null };
      if (biltyData.to_city_id) {
        transportRes = await supabase
          .from('transports')
          .select('*')
          .eq('city_id', biltyData.to_city_id)
          .limit(1)
          .single();
      }
      setTransportData(transportRes.data);

      await generatePDFPreview(permRes.data, fromCityRes.data, toCityRes.data, transportRes.data);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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
    if (deliveryType === 'door-delivery') return '/ DD';
    if (deliveryType === 'godown-delivery') return '';
    return '';
  };

  const formatPaymentMode = (paymentMode) => {
    switch(paymentMode.toLowerCase()) {
      case 'to-pay': return 'TO PAY';
      case 'paid': return 'PAID';
      case 'freeofcost': return 'FOC';
      default: return paymentMode.toUpperCase();
    }
  };

  const generateQRCode = async (text) => {
    try {
      const qrDataURL = await QRCode.toDataURL(text, { 
        width: 100, height: 100, margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      return qrDataURL;
    } catch (error) {
      console.error('QR Code generation error:', error);
      return null;
    }
  };

  // ==========================================
  // 🎯 MAIN PDF GENERATION FUNCTION WITH ENHANCED STYLING
  // ==========================================
  const addBillCopy = (pdf, yStart, copyType, qrDataURL, permDetails, fromCity, toCity, transport) => {
    const y = yStart; // Base Y offset for this copy

    // 🏢 HEADER SECTION WITH ENHANCED STYLING
    // GST Number (top left) - Bold label
    addStyledText(
      pdf, 
      `GST No: ${permDetails?.gst || '09COVPS5556J1ZT'}`, 
      COORDINATES.HEADER.GST_NO.x, 
      y + COORDINATES.HEADER.GST_NO.y,
      STYLES.FONTS.NOTICE
    );
    
    // Company Name (center, large and bold)
    addStyledText(
      pdf, 
      'S. S. TRANSPORT CORPORATION', 
      COORDINATES.HEADER.COMPANY_NAME.x, 
      y + COORDINATES.HEADER.COMPANY_NAME.y,
      STYLES.FONTS.COMPANY_NAME,
      { align: 'center' }
    );
    
    // Bank Details (left side) - Enhanced styling
    addStyledText(
      pdf, 
      `PNB BANK A/C No: ${permDetails?.bank_act_no_1 || '0010002100076368'} IFSC CODE ${permDetails?.ifsc_code_1 || '0001000'}`, 
      COORDINATES.HEADER.BANK_DETAIL_1.x, 
      y + COORDINATES.HEADER.BANK_DETAIL_1.y,
      STYLES.FONTS.LABELS
    );
    addStyledText(
      pdf, 
      `AXIS BANK A/C No: ${permDetails?.bank_act_no_2 || '923010361683636'} IFSC CODE ${permDetails?.ifsc_code_2 || '0001837'}`, 
      COORDINATES.HEADER.BANK_DETAIL_2.x, 
      y + COORDINATES.HEADER.BANK_DETAIL_2.y,
      STYLES.FONTS.LABELS
    );
    
    // Branch Address (right side)
    const address = permDetails?.transport_address || 'GANDHI MARKET, G T ROAD, ALIGARH-202001\nSHIVA PETROL PUMP, G T ROAD, ALIGARH-202001';
    const addressLines = address.split('\n');
    addStyledText(
      pdf, 
      addressLines[0], 
      COORDINATES.HEADER.BRANCH_ADDRESS_1.x, 
      y + COORDINATES.HEADER.BRANCH_ADDRESS_1.y,
      STYLES.FONTS.SMALL
    );
    if (addressLines[1]) {
      addStyledText(
        pdf, 
        addressLines[1], 
        COORDINATES.HEADER.BRANCH_ADDRESS_2.x, 
        y + COORDINATES.HEADER.BRANCH_ADDRESS_2.y,
        STYLES.FONTS.SMALL
      );
    }
    
    // 🎯 COPY TYPE SECTION - Enhanced
    addStyledText(
      pdf, 
      `${copyType.toUpperCase()} COPY`, 
      COORDINATES.COPY_SECTION.COPY_TYPE.x, 
      y + COORDINATES.COPY_SECTION.COPY_TYPE.y,
      STYLES.FONTS.NOTICE,
      { align: 'center' }
    );
    
    // Underline for copy type - Thicker line
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(
      COORDINATES.COPY_SECTION.COPY_UNDERLINE.x1, 
      y + COORDINATES.COPY_SECTION.COPY_UNDERLINE.y,
      COORDINATES.COPY_SECTION.COPY_UNDERLINE.x2, 
      y + COORDINATES.COPY_SECTION.COPY_UNDERLINE.y
    );
    
    // 📅 DATE AND ROUTE SECTION - Enhanced
    // Date - Bold label
    addStyledText(
      pdf, 
      `Date: ${formatDate(biltyData.bilty_date)}`, 
      COORDINATES.COPY_SECTION.DATE.x, 
      y + COORDINATES.COPY_SECTION.DATE.y,
      STYLES.FONTS.LABELS
    );
    
    // Route with city names - Bold
    const fromCityName = fromCity?.city_name || 'ALIGARH';
    const toCityName = toCity?.city_name || 'DEORIA';
    const toCityCode = toCity?.city_code || 'DRO';
    addStyledText(
      pdf, 
      `${fromCityName} TO ${toCityName} (${toCityCode})`, 
      COORDINATES.COPY_SECTION.ROUTE.x, 
      y + COORDINATES.COPY_SECTION.ROUTE.y,
      STYLES.FONTS.NOTICE
    );
    
    // 🚚 DELIVERY SECTION - Transport name only (delivery type moved)
    const deliveryText = transport?.transport_name || biltyData.transport_name || 'SWASTIK TRANSPORT';
    
    addStyledText(
      pdf, 
      `DELIVERY AT: ${deliveryText}`, 
      COORDINATES.DELIVERY_SECTION.DELIVERY_AT.x, 
      y + COORDINATES.DELIVERY_SECTION.DELIVERY_AT.y,
      STYLES.FONTS.LABELS
    );
    
    // GSTIN - Bold label
    addStyledText(
      pdf, 
      `GSTIN: ${transport?.gst_number || '24503825250'}`, 
      COORDINATES.DELIVERY_SECTION.GSTIN.x, 
      y + COORDINATES.DELIVERY_SECTION.GSTIN.y,
      STYLES.FONTS.LABELS
    );
    
    // Mobile number - Bold label
    const mobileNumber = transport?.mob_number || permDetails?.mobile_number || '7668291228';
    addStyledText(
      pdf, 
      `MOB: ${mobileNumber}`, 
      COORDINATES.DELIVERY_SECTION.MOBILE.x, 
      y + COORDINATES.DELIVERY_SECTION.MOBILE.y,
      STYLES.FONTS.LABELS
    );
    
    // NEW: Delivery Type near Payment Mode
    const deliveryTypeFormatted = formatDeliveryType(biltyData.delivery_type);
    if (deliveryTypeFormatted) {
      addStyledText(
        pdf, 
        deliveryTypeFormatted, 
        COORDINATES.DELIVERY_SECTION.DELIVERY_TYPE.x, 
        y + COORDINATES.DELIVERY_SECTION.DELIVERY_TYPE.y,
        STYLES.FONTS.LARGE_STATUS
      );
    }
    
    // 👥 PEOPLE SECTION - Enhanced styling
    // Consignor
    addStyledText(
      pdf, 
      `CONSIGNOR: ${biltyData.consignor_name.toUpperCase()}`, 
      COORDINATES.PEOPLE_SECTION.CONSIGNOR_NAME.x, 
      y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_NAME.y,
      STYLES.FONTS.LABELS
    );
    addStyledText(
      pdf, 
      `GSTIN: ${biltyData.consignor_gst || 'N/A'}`, 
      COORDINATES.PEOPLE_SECTION.CONSIGNOR_GST.x, 
      y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_GST.y,
      STYLES.FONTS.VALUES
    );
    if (biltyData.consignor_number) {
      addStyledText(
        pdf, 
        `MOB: ${biltyData.consignor_number}`, 
        COORDINATES.PEOPLE_SECTION.CONSIGNOR_MOBILE.x, 
        y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_MOBILE.y,
        STYLES.FONTS.VALUES
      );
    }
    
    // Consignee
    addStyledText(
      pdf, 
      `CONSIGNEE: ${biltyData.consignee_name.toUpperCase()}`, 
      COORDINATES.PEOPLE_SECTION.CONSIGNEE_NAME.x, 
      y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_NAME.y,
      STYLES.FONTS.LABELS
    );
    
    // Handle different GST formats (GST/Aadhar/PAN)
    let gstText = biltyData.consignee_gst || '';
    if (gstText.startsWith('AD-')) {
        addStyledText(
          pdf, 
          `AADHAR NO: ${gstText.replace('AD-', '')}`, 
          COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, 
          y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y,
          STYLES.FONTS.VALUES
        );
    } else if (gstText.toLowerCase().startsWith('pan')) {
        addStyledText(
          pdf, 
          `PAN NO: ${gstText.substring(3)}`, 
          COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, 
          y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y,
          STYLES.FONTS.VALUES
        );
    } else {
        addStyledText(
          pdf, 
          `GSTIN: ${gstText || 'N/A'}`, 
          COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, 
          y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y,
          STYLES.FONTS.VALUES
        );
    }
    
    if (biltyData.consignee_number) {
      addStyledText(
        pdf, 
        `MOB: ${biltyData.consignee_number}`, 
        COORDINATES.PEOPLE_SECTION.CONSIGNEE_MOBILE.x, 
        y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_MOBILE.y,
        STYLES.FONTS.VALUES
      );
    }
    
    // E-WAY BILL
    addStyledText(
      pdf, 
      `E-WAY BILL: ${biltyData.e_way_bill || 'N/A'}`, 
      COORDINATES.PEOPLE_SECTION.EWAY_BILL.x, 
      y + COORDINATES.PEOPLE_SECTION.EWAY_BILL.y,
      STYLES.FONTS.LABELS
    );
    
    // 📋 TABLE SECTION WITH ENHANCED STYLING
    // Top horizontal line - Thicker
    pdf.setLineWidth(STYLES.LINES.THICK);
    pdf.line(
      COORDINATES.TABLE_SECTION.TOP_LINE.x1, 
      y + COORDINATES.TABLE_SECTION.TOP_LINE.y,
      COORDINATES.TABLE_SECTION.TOP_LINE.x2, 
      y + COORDINATES.TABLE_SECTION.TOP_LINE.y
    );
    
    // LEFT SECTION - Invoice details with enhanced styling
    addStyledText(pdf, `INVOICE DATE:`, COORDINATES.TABLE_SECTION.INVOICE_DATE.x, y + COORDINATES.TABLE_SECTION.INVOICE_DATE.y, STYLES.FONTS.LABELS);
    addStyledText(
      pdf, 
      `${biltyData.invoice_date ? formatDate(biltyData.invoice_date) : 'N/A'}`, 
      COORDINATES.TABLE_SECTION.INVOICE_DATE_VALUE.x, 
      y + COORDINATES.TABLE_SECTION.INVOICE_DATE_VALUE.y,
      STYLES.FONTS.VALUES
    );
    
    addStyledText(pdf, `INVOICE NO:`, COORDINATES.TABLE_SECTION.INVOICE_NO.x, y + COORDINATES.TABLE_SECTION.INVOICE_NO.y, STYLES.FONTS.LABELS);
    addStyledText(
      pdf, 
      `${biltyData.invoice_no || 'N/A'}`, 
      COORDINATES.TABLE_SECTION.INVOICE_NO_VALUE.x, 
      y + COORDINATES.TABLE_SECTION.INVOICE_NO_VALUE.y,
      STYLES.FONTS.VALUES
    );
    
    addStyledText(pdf, `INVOICE VALUE:`, COORDINATES.TABLE_SECTION.INVOICE_VALUE.x, y + COORDINATES.TABLE_SECTION.INVOICE_VALUE.y, STYLES.FONTS.LABELS);
    addStyledText(
      pdf, 
      `${biltyData.invoice_value || '0'}`, 
      COORDINATES.TABLE_SECTION.INVOICE_VALUE_VALUE.x, 
      y + COORDINATES.TABLE_SECTION.INVOICE_VALUE_VALUE.y,
      STYLES.FONTS.VALUES
    );
    
    addStyledText(pdf, `CONTENT:`, COORDINATES.TABLE_SECTION.CONTENT.x, y + COORDINATES.TABLE_SECTION.CONTENT.y, STYLES.FONTS.LABELS);
    addStyledText(
      pdf, 
      `${biltyData.contain || 'HARDWARE'}`, 
      COORDINATES.TABLE_SECTION.CONTENT_VALUE.x, 
      y + COORDINATES.TABLE_SECTION.CONTENT_VALUE.y,
      STYLES.FONTS.VALUES
    );
    
    // MIDDLE SECTION - Package details with enhanced styling
    addStyledText(
      pdf, 
      `PVT MARKS: ${biltyData.pvt_marks || 'SS'} / ${biltyData.no_of_pkg}`, 
      COORDINATES.TABLE_SECTION.PVT_MARKS.x, 
      y + COORDINATES.TABLE_SECTION.PVT_MARKS.y,
      STYLES.FONTS.LABELS
    );
    addStyledText(
      pdf, 
      `${toCityCode}`, 
      COORDINATES.TABLE_SECTION.CITY_CODE.x, 
      y + COORDINATES.TABLE_SECTION.CITY_CODE.y,
      STYLES.FONTS.NOTICE
    );
    addStyledText(
      pdf, 
      `WEIGHT: ${biltyData.wt} kg`, 
      COORDINATES.TABLE_SECTION.WEIGHT.x, 
      y + COORDINATES.TABLE_SECTION.WEIGHT.y,
      STYLES.FONTS.LABELS
    );
    
    // Main vertical divider line - Thicker
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(
      COORDINATES.TABLE_SECTION.VERTICAL_LINE.x, 
      y + COORDINATES.TABLE_SECTION.VERTICAL_LINE.y1,
      COORDINATES.TABLE_SECTION.VERTICAL_LINE.x, 
      y + COORDINATES.TABLE_SECTION.VERTICAL_LINE.y2
    );
    
    // NEW: Add Extra Vertical Lines
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    
    // Extra vertical line 1
    pdf.line(
      COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.x, 
      y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.y1,
      COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.x, 
      y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_1.y2
    );
    
    // Extra vertical line 2
    pdf.line(
      COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.x, 
      y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.y1,
      COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.x, 
      y + COORDINATES.EXTRA_LINES.VERTICAL_LINE_2.y2
    );
    
    
    // RIGHT SECTION - Charges with enhanced styling and proper alignment
    const amount = (parseFloat(biltyData.wt) * parseFloat(biltyData.rate)).toFixed(2);
    
    // Define column positions for proper alignment
    const labelX = COORDINATES.TABLE_SECTION.AMOUNT.x;     // Label column at x=155
    const valueX = labelX + 45;                            // Value column at x=200 (45mm offset)
    
    // Charges section with aligned columns
    addStyledText(pdf, `AMOUNT:`, labelX, y + COORDINATES.TABLE_SECTION.AMOUNT.y, STYLES.FONTS.LABELS);
    addStyledText(pdf, `${amount}`, valueX, y + COORDINATES.TABLE_SECTION.AMOUNT.y, STYLES.FONTS.VALUES, { align: 'right' });
    
    addStyledText(pdf, `LABOUR CHARGE:`, labelX, y + COORDINATES.TABLE_SECTION.LABOUR_CHARGE.y, STYLES.FONTS.LABELS);
    addStyledText(pdf, `${biltyData.labour_charge}`, valueX, y + COORDINATES.TABLE_SECTION.LABOUR_CHARGE.y, STYLES.FONTS.VALUES, { align: 'right' });
    
    addStyledText(pdf, `BILTY CHARGE:`, labelX, y + COORDINATES.TABLE_SECTION.BILTY_CHARGE.y, STYLES.FONTS.LABELS);
    addStyledText(pdf, `${biltyData.bill_charge}`, valueX, y + COORDINATES.TABLE_SECTION.BILTY_CHARGE.y, STYLES.FONTS.VALUES, { align: 'right' });
    
    addStyledText(pdf, `TOLL TAX:`, labelX, y + COORDINATES.TABLE_SECTION.TOLL_TAX.y, STYLES.FONTS.LABELS);
    addStyledText(pdf, `${biltyData.toll_charge}`, valueX, y + COORDINATES.TABLE_SECTION.TOLL_TAX.y, STYLES.FONTS.VALUES, { align: 'right' });
    
    addStyledText(pdf, `PF:`, labelX, y + COORDINATES.TABLE_SECTION.PF.y, STYLES.FONTS.LABELS);
    addStyledText(pdf, `${biltyData.pf_charge}`, valueX, y + COORDINATES.TABLE_SECTION.PF.y, STYLES.FONTS.VALUES, { align: 'right' });
    
    addStyledText(pdf, `OTHER CHARGE:`, labelX, y + COORDINATES.TABLE_SECTION.OTHER_CHARGE.y, STYLES.FONTS.LABELS);
    addStyledText(pdf, `${biltyData.other_charge}`, valueX, y + COORDINATES.TABLE_SECTION.OTHER_CHARGE.y, STYLES.FONTS.VALUES, { align: 'right' });
    
    // Total section - Extra thick line
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(
      COORDINATES.TABLE_SECTION.TOTAL_LINE.x1, 
      y + COORDINATES.TABLE_SECTION.TOTAL_LINE.y,
      COORDINATES.TABLE_SECTION.TOTAL_LINE.x2, 
      y + COORDINATES.TABLE_SECTION.TOTAL_LINE.y
    );
    
    // Total amount - Aligned with charges section using same column structure
    addStyledText(pdf, `TOTAL:`, labelX, y + COORDINATES.TABLE_SECTION.TOTAL.y, STYLES.FONTS.TOTAL);
    addStyledText(pdf, `${biltyData.total}`, valueX, y + COORDINATES.TABLE_SECTION.TOTAL.y, STYLES.FONTS.TOTAL, { align: 'right' });
    
    // Payment Status - Large and bold
    addStyledText(
      pdf, 
      formatPaymentMode(biltyData.payment_mode), 
      COORDINATES.TABLE_SECTION.PAYMENT_STATUS.x, 
      y + COORDINATES.TABLE_SECTION.PAYMENT_STATUS.y,
      STYLES.FONTS.LARGE_STATUS
    );
    
    // 📢 NOTICE SECTION - Enhanced with additional important notices
    addStyledText(
      pdf, 
      'NOTICE', 
      COORDINATES.NOTICE_SECTION.NOTICE_LABEL.x, 
      y + COORDINATES.NOTICE_SECTION.NOTICE_LABEL.y,
      STYLES.FONTS.NOTICE
    );
    
    // NEW: Important notices section with proper spacing
    let noticeY = COORDINATES.NOTICE_SECTION.NOTICE_LABEL.y + 3; // Start below "NOTICE" label
    
    // Notice 1: Bank authorization notice
    setStyle(pdf, STYLES.FONTS.TINY);
    const notice1Text = "The Consignment covered by this set of special Lorry Receipt from shall be stored at the destination under the cannot of the Transport Operator & shall be delivered to of the order of the Consignee Bank whose name is mentioned in the Lorry Receipt. It will under no circumstance be delivered to anyone without the written authority from the consignee bank or it's order endored of the consignee copy or on a seperate letter of authority. We are not responsible for leakage n illegal goods. The Consignee Copy is only for BILL CLEARING not for Bank Advance.";
    const notice1Lines = pdf.splitTextToSize(notice1Text, 130); // Fit within available width
    notice1Lines.forEach(line => {
      pdf.text(line, 12, y + noticeY);
      noticeY += 2.5;
    });
    
    // Add spacing between notices
    noticeY += 2;
    
    // Notice 2: Responsibility disclaimer
    const notice2Text = "";
    const notice2Lines = pdf.splitTextToSize(notice2Text, 130);
    notice2Lines.forEach(line => {
      pdf.text(line, 12, y + noticeY);
      noticeY += 2.5;
    });
    
    // Add spacing between notices
    noticeY += 2;
    
    // Notice 3: Consignee copy purpose (only for consignee copy)
    if (copyType.toLowerCase() === 'consignee') {
      const notice3Text = "";
      const notice3Lines = pdf.splitTextToSize(notice3Text, 130);
      notice3Lines.forEach(line => {
        pdf.text(line, 12, y + noticeY);
        noticeY += 2.5;
      });
    }
    
    // Notice 3: Driver copy notice (only for driver copy)
    if (copyType.toLowerCase() === 'driver') {
      const notice3Text = "";
      const notice3Lines = pdf.splitTextToSize(notice3Text, 130);
      notice3Lines.forEach(line => {
        pdf.text(line, 12, y + noticeY);
        noticeY += 2.5;
      });
    }
    
    // 📄 FOOTER SECTION - Enhanced styling
    // Bottom horizontal line - Thick
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(
      COORDINATES.FOOTER_SECTION.FOOTER_LINE.x1, 
      y + COORDINATES.FOOTER_SECTION.FOOTER_LINE.y,
      COORDINATES.FOOTER_SECTION.FOOTER_LINE.x2, 
      y + COORDINATES.FOOTER_SECTION.FOOTER_LINE.y
    );
    
    // Footer text with enhanced styling
    addStyledText(
      pdf, 
      `OUR WEBSITE: ${permDetails?.website || 'SSTRANSPORTCO.COM'}`, 
      COORDINATES.FOOTER_SECTION.WEBSITE.x, 
      y + COORDINATES.FOOTER_SECTION.WEBSITE.y,
      STYLES.FONTS.LABELS
    );
    addStyledText(
      pdf, 
      "BOOKED AT OWNER'S RISK", 
      COORDINATES.FOOTER_SECTION.BOOKED_RISK.x, 
      y + COORDINATES.FOOTER_SECTION.BOOKED_RISK.y,
      STYLES.FONTS.LABELS
    );
    addStyledText(
      pdf, 
      `CUSTOMER CARE: ${permDetails?.mobile_number || '9690836940'}`, 
      COORDINATES.FOOTER_SECTION.CUSTOMER_CARE.x, 
      y + COORDINATES.FOOTER_SECTION.CUSTOMER_CARE.y,
      STYLES.FONTS.LABELS
    );
    addStyledText(
      pdf, 
      'SIGNATURE OF BOOKING CLERK', 
      COORDINATES.FOOTER_SECTION.SIGNATURE.x, 
      y + COORDINATES.FOOTER_SECTION.SIGNATURE.y,
      STYLES.FONTS.LABELS
    );
  };

  const generatePDFPreview = async (permDetails = permanentDetails, fromCity = fromCityData, toCity = toCityData, transport = transportData) => {
    setIsGenerating(true);

    try {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      console.log('Generating QR code...');
      const qrDataURL = await generateQRCode(biltyData.gr_no);
      
      console.log('Creating PDF...');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // 📱 QR CODES AND BOXES
      // First copy QR code
      if (qrDataURL) {
        pdf.addImage(
          qrDataURL, 
          'PNG', 
          COORDINATES.QR_SECTION.QR_CODE.x, 
          COORDINATES.QR_SECTION.QR_CODE.y, 
          COORDINATES.QR_SECTION.QR_CODE.width, 
          COORDINATES.QR_SECTION.QR_CODE.height
        );
        
        // Second copy QR code (with Y offset)
        pdf.addImage(
          qrDataURL, 
          'PNG', 
          COORDINATES.QR_SECTION.QR_CODE.x, 
          COORDINATES.QR_SECTION.QR_CODE.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, 
          COORDINATES.QR_SECTION.QR_CODE.width, 
          COORDINATES.QR_SECTION.QR_CODE.height
        );
      }
      
      // 📦 GR NUMBER BOXES WITH ENHANCED STYLING
      // First copy GR box
      pdf.setLineWidth(STYLES.LINES.THICK);
      pdf.rect(
        COORDINATES.QR_SECTION.GR_BOX.x, 
        COORDINATES.QR_SECTION.GR_BOX.y, 
        COORDINATES.QR_SECTION.GR_BOX.width, 
        COORDINATES.QR_SECTION.GR_BOX.height
      );
      
      addStyledText(pdf, 'GR NO', COORDINATES.QR_SECTION.GR_LABEL.x, COORDINATES.QR_SECTION.GR_LABEL.y, STYLES.FONTS.LABELS);
      addStyledText(pdf, `SSTC-2025-26-${biltyData.gr_no}`, COORDINATES.QR_SECTION.GR_NUMBER.x, COORDINATES.QR_SECTION.GR_NUMBER.y, STYLES.FONTS.GR_NUMBER);
      
      // Second copy GR box (with Y offset)
      pdf.rect(
        COORDINATES.QR_SECTION.GR_BOX.x, 
        COORDINATES.QR_SECTION.GR_BOX.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, 
        COORDINATES.QR_SECTION.GR_BOX.width, 
        COORDINATES.QR_SECTION.GR_BOX.height
      );
      
      addStyledText(pdf, 'GR NO', COORDINATES.QR_SECTION.GR_LABEL.x, COORDINATES.QR_SECTION.GR_LABEL.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, STYLES.FONTS.LABELS);
      addStyledText(pdf, `SSTC-2025-26-${biltyData.gr_no}`, COORDINATES.QR_SECTION.GR_NUMBER.x, COORDINATES.QR_SECTION.GR_NUMBER.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, STYLES.FONTS.GR_NUMBER);
      
      // ⚠️ CAUTION BOXES WITH ENHANCED STYLING
      // First copy caution box
      pdf.setLineWidth(STYLES.LINES.NORMAL);
      pdf.rect(
        COORDINATES.QR_SECTION.CAUTION_BOX.x, 
        COORDINATES.QR_SECTION.CAUTION_BOX.y, 
        COORDINATES.QR_SECTION.CAUTION_BOX.width, 
        COORDINATES.QR_SECTION.CAUTION_BOX.height
      );
      
      addStyledText(
        pdf, 
        'CAUTION', 
        COORDINATES.QR_SECTION.CAUTION_LABEL.x, 
        COORDINATES.QR_SECTION.CAUTION_LABEL.y,
        STYLES.FONTS.LABELS,
        { align: 'center' }
      );
      
      // Caution description text
      setStyle(pdf, STYLES.FONTS.SMALL);
      const cautionText = "The Consignment Will Not Be Declared Diverted Re-Routed or Re-Booked Without Consignee Bank's Written Permission Will Not Be Delivered, All Subject To Aligarh Jurisdiction.";
      const lines = pdf.splitTextToSize(cautionText, 55);
      let lineY = COORDINATES.QR_SECTION.CAUTION_TEXT_START.y;
      lines.forEach(line => {
        pdf.text(line, COORDINATES.QR_SECTION.CAUTION_TEXT_START.x, lineY);
        lineY += 3; // Increased spacing from 2 to 2.5 for better readability
      });
      
      // Second copy caution box (with Y offset)
      pdf.rect(
        COORDINATES.QR_SECTION.CAUTION_BOX.x, 
        COORDINATES.QR_SECTION.CAUTION_BOX.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, 
        COORDINATES.QR_SECTION.CAUTION_BOX.width, 
        COORDINATES.QR_SECTION.CAUTION_BOX.height
      );
      
      addStyledText(
        pdf, 
        'CAUTION', 
        COORDINATES.QR_SECTION.CAUTION_LABEL.x, 
        COORDINATES.QR_SECTION.CAUTION_LABEL.y + COORDINATES.SPACING.SECOND_COPY_OFFSET,
        STYLES.FONTS.LABELS,
        { align: 'center' }
      );
      
      // Second copy caution text
      setStyle(pdf, STYLES.FONTS.SMALL);
      lineY = COORDINATES.QR_SECTION.CAUTION_TEXT_START.y + COORDINATES.SPACING.SECOND_COPY_OFFSET;
      lines.forEach(line => {
        pdf.text(line, COORDINATES.QR_SECTION.CAUTION_TEXT_START.x, lineY);
        lineY += 3; // Increased spacing from 2 to 2.5 for better readability
      });
      
      // 📋 ADD BOTH BILL COPIES WITH ENHANCED STYLING
      // First copy (Consignee)
      addBillCopy(pdf, 0, 'CONSIGNOR', qrDataURL, permDetails, fromCity, toCity, transport);
      
      // ➖ DASHED SEPARATOR LINE - Enhanced
      pdf.setLineWidth(STYLES.LINES.THICK);
      pdf.setLineDashPattern(STYLES.LINES.DASHED, 0);
      pdf.line(10, COORDINATES.SPACING.DASHED_LINE_Y, 200, COORDINATES.SPACING.DASHED_LINE_Y);
      pdf.setLineDashPattern([], 0); // Reset to solid line
      
      // Second copy (Driver) with Y offset
      addBillCopy(pdf, COORDINATES.SPACING.SECOND_COPY_OFFSET, 'DRIVER', qrDataURL, permDetails, fromCity, toCity, transport);
      
      // Create blob URL for preview
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
      // Create a hidden iframe to print the PDF
      const printFrame = document.createElement('iframe');
      printFrame.style.display = 'none';
      printFrame.src = pdfUrl;
      
      document.body.appendChild(printFrame);
      
      printFrame.onload = () => {
        try {
          // Focus on the iframe content and print
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
          
          // Remove the iframe after a short delay
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        } catch (error) {
          console.error('Error printing PDF:', error);
          // Fallback: Open in new window and print
          const printWindow = window.open(pdfUrl, '_blank');
          printWindow.addEventListener('load', () => {
            printWindow.print();
          });
          document.body.removeChild(printFrame);
        }
      };
    } else {
      alert('PDF is not ready yet. Please wait for the preview to load.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-blue-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center border border-purple-200">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="animate-spin h-8 w-8 text-white" />
          </div>
          <div className="text-2xl font-bold text-black mb-2">movesure.io</div>
          <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-blue-500 mx-auto rounded-full mb-4"></div>
          <p className="text-lg font-semibold text-black mb-2">Loading Bill Details...</p>
          <p className="text-sm text-gray-600">Please wait while we prepare your document</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-blue-50 z-50 flex flex-col">
      {/* Modern Header with movesure.io branding - Made smaller */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-500 shadow-2xl">
        <div className="px-6 py-4">
          {/* Updated navbar layout */}
          <div className="flex justify-between items-center">
            {/* Left side - movesure.io branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">movesure.io</div>
                <div className="w-16 h-0.5 bg-white bg-opacity-40 rounded-full"></div>
              </div>
            </div>

            {/* Right side - Document info and action buttons */}
            <div className="flex items-center gap-6">
              {/* Document info */}
              <div className="flex items-center gap-4 text-white text-opacity-90 text-sm">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  GR: <span className="font-semibold">SSTC-2025-26-{biltyData.gr_no}</span>
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  Route: {fromCityData?.city_name || 'N/A'} → {toCityData?.city_name || 'N/A'}
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  Amount: ₹{biltyData.total}
                </span>
              </div>

              {/* Action buttons with fixed colors */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadAllDataAndGeneratePreview()}
                  disabled={isGenerating}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center gap-2 border border-gray-600"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Refresh'}
                </button>
                
                <button
                  onClick={printPDF}
                  disabled={!pdfUrl}
                  className="bg-white text-purple-600 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center gap-2 shadow-lg"
                >
                  <Printer className="w-4 h-4" />
                  Print PDF
                </button>
                
                <button
                  onClick={downloadPDF}
                  disabled={!pdfUrl}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                
                <button
                  onClick={onClose}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-2.5 rounded-lg transition-all transform hover:scale-105 border border-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Area with modern design */}
      <div className="flex-1 p-6">
        <div className="h-full bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden">
          {pdfUrl ? (
            <>
              {/* Preview header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Document Preview</h3>
                    <p className="text-white text-opacity-80 text-sm">Bilty Document - Ready for print</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">Live Preview</span>
                </div>
              </div>

              {/* PDF iframe */}
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
                style={{ height: 'calc(100% - 70px)' }}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-3">Document Preview</h3>
                <p className="text-gray-600 mb-4">Your PDF preview will appear here</p>
                {isGenerating && (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-purple-600 font-medium">Generating preview...</span>
                  </div>
                )}
                {!isGenerating && !pdfUrl && (
                  <button
                    onClick={() => loadAllDataAndGeneratePreview()}
                    className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-600 transition-all transform hover:scale-105 flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Generate Preview
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Status Bar */}
      <div className="bg-white border-t border-purple-200 px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${pdfUrl ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`}></div>
              <span className="font-medium text-black">
                Status: {pdfUrl ? 'Ready for Print' : 'Loading...'}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <span className="text-gray-600">
              <span className="font-medium text-purple-600">GR:</span> {biltyData.gr_no}
            </span>
            <div className="h-4 w-px bg-gray-300"></div>
            <span className="text-gray-600">
              <span className="font-medium text-purple-600">Route:</span> {fromCityData?.city_name || 'N/A'} → {toCityData?.city_name || 'N/A'}
            </span>
            <div className="h-4 w-px bg-gray-300"></div>
            <span className="text-gray-600">
              <span className="font-medium text-purple-600">Total:</span> ₹{biltyData.total}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-purple-600" />
              <span>Press <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs font-mono">Ctrl+P</kbd> for browser print</span>
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs font-mono">Enter</kbd>
              <span>Direct PDF print</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFGenerator;