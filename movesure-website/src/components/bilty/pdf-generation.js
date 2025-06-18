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
    },    // 📱 QR CODE AND GR NUMBER SECTION
    QR_SECTION: {                
      QR_CODE: { x: 180, y: 10, width: 25, height: 25 },  // QR code position and size
      GR_BOX: { x: 140, y: 45, width: 65, height: 12 },   // GR number box - made bigger (width: 60→65, height: 10→12)
      GR_LABEL: { x: 143, y: 52.5 },                      // "GR NO" text - centered in left half of box
      GR_NUMBER: { x: 158.5, y: 52.5 },                     // Actual GR number - centered in right half of box
      CAUTION_BOX: { x: 140, y: 57, width: 65, height: 22 }, // Caution box - matched GR box width and made taller
      CAUTION_LABEL: { x: 172, y: 61 },                 // "CAUTION" text - centered horizontally
      CAUTION_TEXT_START: { x: 142, y: 64 },              // Caution description start - with proper margins
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
      DELIVERY_TYPE: { x: 175, y: 95 },          // NEW: Delivery type near payment mode (moved closer)
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
    },    // 📋 MAIN TABLE SECTION
    TABLE_SECTION: {
      TOP_LINE: { x1: 0, y: 136, x2: 250 },      // Top horizontal line
      
      // Left section - Invoice details
      INVOICE_DATE: { x: 12, y: 100 },
      INVOICE_DATE_VALUE: { x: 45, y: 100},
      INVOICE_NO: { x: 12, y: 105 },
      INVOICE_NO_VALUE: { x: 45, y: 105 },
      INVOICE_VALUE: { x: 12, y: 110 },
      INVOICE_VALUE_VALUE: { x: 45, y: 110 },      CONTENT: { x: 80, y: 115 },                         // Content positioned a little down
      CONTENT_VALUE: { x: 100, y: 115 },                  // Content value positioned a little down
        // Middle section - Package details with box
      PVT_BOX: { x: 70, y: 91, width: 80, height: 14 },    // Box around PVT MARKS and CITY CODE (moved down a little)
      PVT_BOX_DIVIDER: { x: 110, y1: 91, y2: 105 },       // Vertical divider in middle of box
        // PVT MARKS section (left side of box) - Centered
      PVT_LABEL: { x: 90, y: 96 },                      // "PVT MARKS:" label
      PVT_VALUE: { x: 90, y: 101 },                      // PVT MARKS value
        // CITY CODE section (right side of box) - Centered
      CITY_LABEL: { x: 130, y: 96 },                    // "CITY CODE:" label
      CITY_VALUE: { x: 130, y: 101 },                    // City code value
      
      WEIGHT: { x: 80, y: 111 },                          // Weight positioned a little down
      
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
      
      PAYMENT_STATUS: { x: 168, y: 90 },           // PAID/TO PAY status - below caution box
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
      SIGNATURE: { x: 150, y: 146 },               // Signature line
    },    // 📏 NEW: EXTRA VERTICAL LINES SECTION
    EXTRA_LINES: {
      VERTICAL_LINE_1: { x: 70, y1: 95, y2: 118 },   // First extra vertical line
      VERTICAL_LINE_2: { x: 156, y1: 45, y2: 57 }, // Second extra vertical line - centered in GR box divider
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
      // Professional fonts for better print quality
      HEADER: { size: 18, weight: 'bold', family: 'times' },        // Times for professional headers
      NORMAL: { size: 10, weight: 'normal', family: 'times' },      // Times for readability
      SMALL: { size: 9, weight: 'normal', family: 'times' },        // Times for small text
      TINY: { size: 7, weight: 'normal', family: 'times' },         // Times for fine print
      LARGE_STATUS: { size: 14, weight: 'bold', family: 'helvetica' },  // Helvetica for status/emphasis
      NOTICE: { size: 12, weight: 'bold', family: 'times' },        // Times for notices
      COMPANY_NAME: { size: 20, weight: 'bold', family: 'helvetica' },  // Helvetica for company name
      GR_NUMBER: { size: 1, weight: 'bold', family: 'times' },     // Courier for tracking numbers
      GR_LABEL: { size: 10, weight: 'bold', family: 'helvetica' },    // Enhanced GR NO label - bigger and bolder      LABELS: { size: 9.5, weight: 'bold', family: 'times' },         // Times for labels
      VALUES: { size: 9.5, weight: 'normal', family: 'times' },       // Times for values
      ENHANCED_LABELS: { size: 10.5, weight: 'bold', family: 'times' }, // Enhanced bold labels for delivery/consignor/consignee
      ENHANCED_VALUES: { size: 10, weight: 'bold', family: 'times' },   // Enhanced bold values for delivery/consignor/consignee
      TOTAL: { size: 14, weight: 'bold', family: 'helvetica' },       // Helvetica for totals
      ENHANCED_CHARGES: { size: 11, weight: 'bold', family: 'times' }, // Enhanced charges section
      MONOSPACE: { size: 9, weight: 'normal', family: 'courier' },    // Courier for codes/numbers
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
    // Use the specified font family or default to helvetica
    const fontFamily = style.family || 'helvetica';
    pdf.setFont(fontFamily, style.weight);
  };

  const addStyledText = (pdf, text, x, y, style = STYLES.FONTS.NORMAL, options = {}) => {
    setStyle(pdf, style);
    pdf.text(text, x, y, options);
  };

  // Helper function to add monospace text (for numbers, codes, etc.)
  const addMonospaceText = (pdf, text, x, y, size = 9, weight = 'normal', options = {}) => {
    pdf.setFontSize(size);
    pdf.setFont('courier', weight); // Courier is ideal for numbers and codes
    pdf.text(text, x, y, options);
  };
  // Helper function to add professional header text
  const addHeaderText = (pdf, text, x, y, size = 16, options = {}) => {
    pdf.setFontSize(size);
    pdf.setFont('times', 'bold'); // Times Roman for professional headers
    pdf.text(text, x, y, options);
  };

  // Helper function to add justified text
  const addJustifiedText = (pdf, text, x, y, maxWidth, lineHeight = 3) => {
    const words = text.split(' ');
    let currentLine = '';
    let currentY = y;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
      const testWidth = pdf.getTextWidth(testLine);
      
      if (testWidth > maxWidth && currentLine) {
        // Justify current line (except if it's the last line)
        const lineWords = currentLine.split(' ');
        if (lineWords.length > 1) {
          const totalTextWidth = lineWords.reduce((sum, word) => sum + pdf.getTextWidth(word), 0);
          const totalSpaceWidth = maxWidth - totalTextWidth;
          const spaceWidth = totalSpaceWidth / (lineWords.length - 1);
          
          let currentX = x;
          for (let j = 0; j < lineWords.length; j++) {
            pdf.text(lineWords[j], currentX, currentY);
            if (j < lineWords.length - 1) {
              currentX += pdf.getTextWidth(lineWords[j]) + spaceWidth;
            }
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
    
    // Add the last line (centered if it contains "All Subject To Aligarh Jurisdiction")
    if (currentLine) {
      if (currentLine.includes('All Subject To Aligarh Jurisdiction')) {
        const centerX = x + (maxWidth / 2);
        pdf.text(currentLine, centerX, currentY, { align: 'center' });
      } else {
        pdf.text(currentLine, x, currentY);
      }
    }
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
        color: { dark: '#000000', light: '#fafad2' } // Light goldenrod background (RGB: 250, 250, 210)
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
      // Company Name (center, large and bold) - Using professional header
    addHeaderText(
      pdf, 
      'S. S. TRANSPORT CORPORATION', 
      COORDINATES.HEADER.COMPANY_NAME.x, 
      y + COORDINATES.HEADER.COMPANY_NAME.y,
      20,
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
      // 🚚 DELIVERY SECTION - Transport name only (delivery type moved) - ENHANCED DARK & BOLD
    const deliveryText = transport?.transport_name || biltyData.transport_name || 'SWASTIK TRANSPORT';
    
    addStyledText(
      pdf, 
      `DELIVERY AT: ${deliveryText}`, 
      COORDINATES.DELIVERY_SECTION.DELIVERY_AT.x, 
      y + COORDINATES.DELIVERY_SECTION.DELIVERY_AT.y,
      STYLES.FONTS.ENHANCED_LABELS  // Changed to enhanced bold
    );
    
    // GSTIN - Bold label - ENHANCED DARK & BOLD
    addStyledText(
      pdf, 
      `GSTIN: ${transport?.gst_number || '24503825250'}`, 
      COORDINATES.DELIVERY_SECTION.GSTIN.x, 
      y + COORDINATES.DELIVERY_SECTION.GSTIN.y,
      STYLES.FONTS.ENHANCED_LABELS  // Changed to enhanced bold
    );
    
    // Mobile number - Bold label - ENHANCED DARK & BOLD
    const mobileNumber = transport?.mob_number || permDetails?.mobile_number || '7668291228';
    addStyledText(
      pdf, 
      `MOB: ${mobileNumber}`, 
      COORDINATES.DELIVERY_SECTION.MOBILE.x, 
      y + COORDINATES.DELIVERY_SECTION.MOBILE.y,
      STYLES.FONTS.ENHANCED_LABELS  // Changed to enhanced bold
    );
        // 👥 PEOPLE SECTION - Enhanced styling - ENHANCED DARK & BOLD
    // Consignor
    addStyledText(
      pdf, 
      `CONSIGNOR: ${(biltyData.consignor_name || '').toUpperCase()}`, 
      COORDINATES.PEOPLE_SECTION.CONSIGNOR_NAME.x, 
      y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_NAME.y,
      STYLES.FONTS.ENHANCED_LABELS  // Changed to enhanced bold
    );
    addStyledText(
      pdf, 
      `GSTIN: ${biltyData.consignor_gst || 'N/A'}`, 
      COORDINATES.PEOPLE_SECTION.CONSIGNOR_GST.x, 
      y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_GST.y,
      STYLES.FONTS.ENHANCED_VALUES  // Changed to enhanced bold
    );
    if (biltyData.consignor_number) {
      addStyledText(
        pdf, 
        `MOB: ${biltyData.consignor_number}`, 
        COORDINATES.PEOPLE_SECTION.CONSIGNOR_MOBILE.x, 
        y + COORDINATES.PEOPLE_SECTION.CONSIGNOR_MOBILE.y,
        STYLES.FONTS.ENHANCED_VALUES  // Changed to enhanced bold
      );
    }
      // Consignee
    addStyledText(
      pdf, 
      `CONSIGNEE: ${(biltyData.consignee_name || '').toUpperCase()}`, 
      COORDINATES.PEOPLE_SECTION.CONSIGNEE_NAME.x, 
      y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_NAME.y,
      STYLES.FONTS.ENHANCED_LABELS  // Changed to enhanced bold
    );
      // Handle different GST formats (GST/Aadhar/PAN) - ENHANCED DARK & BOLD
    let gstText = biltyData.consignee_gst || '';
    if (gstText.startsWith('AD-')) {
        addStyledText(
          pdf, 
          `AADHAR NO: ${gstText.replace('AD-', '')}`, 
          COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, 
          y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y,
          STYLES.FONTS.ENHANCED_VALUES  // Changed to enhanced bold
        );
    } else if (gstText.toLowerCase().startsWith('pan')) {
        addStyledText(
          pdf, 
          `PAN NO: ${gstText.substring(3)}`, 
          COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, 
          y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y,
          STYLES.FONTS.ENHANCED_VALUES  // Changed to enhanced bold
        );
    } else {
        addStyledText(
          pdf, 
          `GSTIN: ${gstText || 'N/A'}`, 
          COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.x, 
          y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_GST.y,
          STYLES.FONTS.ENHANCED_VALUES  // Changed to enhanced bold
        );
    }
    
    if (biltyData.consignee_number) {
      addStyledText(
        pdf, 
        `MOB: ${biltyData.consignee_number}`, 
        COORDINATES.PEOPLE_SECTION.CONSIGNEE_MOBILE.x, 
        y + COORDINATES.PEOPLE_SECTION.CONSIGNEE_MOBILE.y,
        STYLES.FONTS.ENHANCED_VALUES  // Changed to enhanced bold
      );
    }      // E-WAY BILL
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
    );    // LEFT SECTION - Invoice details with enhanced styling
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
    
    // MIDDLE SECTION - Package details with enhanced styling and box
    // Draw PVT MARKS and CITY CODE box (similar to GR box design)
    pdf.setLineWidth(STYLES.LINES.THICK);
    pdf.rect(
      COORDINATES.TABLE_SECTION.PVT_BOX.x, 
      y + COORDINATES.TABLE_SECTION.PVT_BOX.y, 
      COORDINATES.TABLE_SECTION.PVT_BOX.width, 
      COORDINATES.TABLE_SECTION.PVT_BOX.height
    );
    
    // Vertical divider line in the middle of the box
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(
      COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.x, 
      y + COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.y1,
      COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.x, 
      y + COORDINATES.TABLE_SECTION.PVT_BOX_DIVIDER.y2
    );    // PVT MARKS label and value (left side of box)
    addStyledText(pdf, 'PVT MARKS:', COORDINATES.TABLE_SECTION.PVT_LABEL.x, y + COORDINATES.TABLE_SECTION.PVT_LABEL.y, STYLES.FONTS.LABELS, { align: 'center' });
    addStyledText(
      pdf, 
      `${biltyData.pvt_marks || 'SS'} / ${biltyData.no_of_pkg}`, 
      COORDINATES.TABLE_SECTION.PVT_VALUE.x, 
      y + COORDINATES.TABLE_SECTION.PVT_VALUE.y,
      STYLES.FONTS.LARGE_STATUS,
      { align: 'center' }
    );
      // CITY CODE label and value (right side of box)
    addStyledText(pdf, 'CITY CODE:', COORDINATES.TABLE_SECTION.CITY_LABEL.x, y + COORDINATES.TABLE_SECTION.CITY_LABEL.y, STYLES.FONTS.LABELS, { align: 'center' });
    addStyledText(
      pdf, 
      `${toCityCode}`, 
      COORDINATES.TABLE_SECTION.CITY_VALUE.x,
      y + COORDINATES.TABLE_SECTION.CITY_VALUE.y,
      STYLES.FONTS.LARGE_STATUS,
      { align: 'center' }
    );
    
    addStyledText(
      pdf, 
      `WEIGHT: ${biltyData.wt} KG`, 
      COORDINATES.TABLE_SECTION.WEIGHT.x, 
      y + COORDINATES.TABLE_SECTION.WEIGHT.y,
      STYLES.FONTS.NOTICE
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
    
      // RIGHT SECTION - Charges with enhanced styling and proper alignment - BIGGER & ALL BOLD
    const amount = (parseFloat(biltyData.wt) * parseFloat(biltyData.rate)).toFixed(2);
    
    // Define column positions for proper alignment
    const labelX = COORDINATES.TABLE_SECTION.AMOUNT.x;     // Label column at x=155
    const valueX = labelX + 45;                            // Value column at x=200 (45mm offset)
    
    // Charges section with aligned columns - ENHANCED BIGGER FONTS AND ALL BOLD VALUES
    addStyledText(pdf, `AMOUNT:`, labelX, y + COORDINATES.TABLE_SECTION.AMOUNT.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${amount}`, valueX, y + COORDINATES.TABLE_SECTION.AMOUNT.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    
    addStyledText(pdf, `LABOUR CHARGE:`, labelX, y + COORDINATES.TABLE_SECTION.LABOUR_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.labour_charge}`, valueX, y + COORDINATES.TABLE_SECTION.LABOUR_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    
    addStyledText(pdf, `BILTY CHARGE:`, labelX, y + COORDINATES.TABLE_SECTION.BILTY_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.bill_charge}`, valueX, y + COORDINATES.TABLE_SECTION.BILTY_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    
    addStyledText(pdf, `TOLL TAX:`, labelX, y + COORDINATES.TABLE_SECTION.TOLL_TAX.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.toll_charge}`, valueX, y + COORDINATES.TABLE_SECTION.TOLL_TAX.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    
    addStyledText(pdf, `PF:`, labelX, y + COORDINATES.TABLE_SECTION.PF.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.pf_charge}`, valueX, y + COORDINATES.TABLE_SECTION.PF.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    
    addStyledText(pdf, `OTHER CHARGE:`, labelX, y + COORDINATES.TABLE_SECTION.OTHER_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.other_charge}`, valueX, y + COORDINATES.TABLE_SECTION.OTHER_CHARGE.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });
    
    // Total section - Extra thick line
    pdf.setLineWidth(STYLES.LINES.NORMAL);
    pdf.line(
      COORDINATES.TABLE_SECTION.TOTAL_LINE.x1, 
      y + COORDINATES.TABLE_SECTION.TOTAL_LINE.y,
      COORDINATES.TABLE_SECTION.TOTAL_LINE.x2, 
      y + COORDINATES.TABLE_SECTION.TOTAL_LINE.y
    );
      // Total amount - Aligned with charges section using same column structure - ENHANCED
    addStyledText(pdf, `TOTAL:`, labelX, y + COORDINATES.TABLE_SECTION.TOTAL.y, STYLES.FONTS.ENHANCED_CHARGES);
    addStyledText(pdf, `${biltyData.total}`, valueX, y + COORDINATES.TABLE_SECTION.TOTAL.y, STYLES.FONTS.ENHANCED_CHARGES, { align: 'right' });    // Payment Status with Delivery Type - Large and bold, combined for proper alignment - POSITIONED BELOW CAUTION BOX
    const paymentText = formatPaymentMode(biltyData.payment_mode);
    const deliveryTypeText = formatDeliveryType(biltyData.delivery_type);
    const combinedText = paymentText + (deliveryTypeText ? ` ${deliveryTypeText}` : '');
    
    addStyledText(
      pdf, 
      combinedText, 
      COORDINATES.TABLE_SECTION.PAYMENT_STATUS.x, 
      y + COORDINATES.TABLE_SECTION.PAYMENT_STATUS.y,
      STYLES.FONTS.LARGE_STATUS  // Keep original styling for payment status
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
      
      // 🟡 ADD LEMON/YELLOW BACKGROUND COLOR TO A4 SHEET
      pdf.setFillColor(255, 255, 210); // Light lemon color (RGB: 255, 255, 224)
      
      // Fill the entire A4 page (210mm x 297mm) with the background color
      pdf.rect(0, 0, 210, 297, 'F'); // 'F' means fill the rectangle
      
      // Reset fill color to white for other elements that need white background
      pdf.setFillColor(255, 255, 255);
      
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
      );      // GR number with enhanced styling for better visibility
      addStyledText(pdf, 'GR NO', COORDINATES.QR_SECTION.GR_LABEL.x, COORDINATES.QR_SECTION.GR_LABEL.y, STYLES.FONTS.GR_LABEL);
      // Use Times font for GR number
      pdf.setFontSize(12);
      pdf.setFont('times', 'bold');
      pdf.text(`SSTC-2025-26-${biltyData.gr_no}`, COORDINATES.QR_SECTION.GR_NUMBER.x, COORDINATES.QR_SECTION.GR_NUMBER.y);

      // Second copy GR box (with Y offset)
      pdf.rect(
        COORDINATES.QR_SECTION.GR_BOX.x, 
        COORDINATES.QR_SECTION.GR_BOX.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, 
        COORDINATES.QR_SECTION.GR_BOX.width, 
        COORDINATES.QR_SECTION.GR_BOX.height
      );      // Second copy GR number with enhanced styling
      addStyledText(pdf, 'GR NO', COORDINATES.QR_SECTION.GR_LABEL.x, COORDINATES.QR_SECTION.GR_LABEL.y + COORDINATES.SPACING.SECOND_COPY_OFFSET, STYLES.FONTS.GR_LABEL);
      // Use Times font for GR number
      pdf.setFontSize(12);
      pdf.setFont('times', 'bold');
      pdf.text(`SSTC-2025-26-${biltyData.gr_no}`, COORDINATES.QR_SECTION.GR_NUMBER.x, COORDINATES.QR_SECTION.GR_NUMBER.y + COORDINATES.SPACING.SECOND_COPY_OFFSET);
      
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
      );        // Caution description text
      setStyle(pdf, STYLES.FONTS.SMALL);
      const cautionText ="The Consignment Will Not Be Diverted, Re-Routed or Re-Booked Without Consignee's Written Permission and Will Not Be Delivered Without Original Consignment Note.\nAll Subject To Aligarh Jurisdiction.";

      // Split text into main text and jurisdiction line
      const textParts = cautionText.split('\n');
      const mainText = textParts[0];
      const jurisdictionText = textParts[1];
      
      // Render main text as justified
      addJustifiedText(pdf, mainText, COORDINATES.QR_SECTION.CAUTION_TEXT_START.x, COORDINATES.QR_SECTION.CAUTION_TEXT_START.y, 62, 3);
      
      // Calculate Y position for jurisdiction text (after main text)
      const mainTextLines = pdf.splitTextToSize(mainText, 62);
      const jurisdictionY = COORDINATES.QR_SECTION.CAUTION_TEXT_START.y + (mainTextLines.length * 3) + 1.8;
      
      // Render jurisdiction text centered
      const centerX = COORDINATES.QR_SECTION.CAUTION_TEXT_START.x + (62 / 2);
      pdf.text(jurisdictionText, centerX, jurisdictionY, { align: 'center' });
      
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
      const offsetY = COORDINATES.SPACING.SECOND_COPY_OFFSET;
      
      // Render main text as justified for second copy
      addJustifiedText(pdf, mainText, COORDINATES.QR_SECTION.CAUTION_TEXT_START.x, COORDINATES.QR_SECTION.CAUTION_TEXT_START.y + offsetY, 62, 3);
      
      // Render jurisdiction text centered for second copy
      const secondCopyJurisdictionY = COORDINATES.QR_SECTION.CAUTION_TEXT_START.y + offsetY + (mainTextLines.length * 3) + 2;
      pdf.text(jurisdictionText, centerX, secondCopyJurisdictionY, { align: 'center' });
      
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
          <div className="w-16 h-0.5 bg-gradient-to-r from-purple-600 to-blue-500 mx-auto rounded-full mb-4"></div>
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