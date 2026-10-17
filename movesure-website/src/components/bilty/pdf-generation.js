'use client';

import React, { useEffect, useState } from 'react';
import supabase from '../../app/utils/supabase';
import { getTemplate } from '../../templates';
import { fetchPrintDetails, loadTemplateAssets } from '../../templates/print-data';
import { RefreshCw, FileText } from 'lucide-react';
import PDFViewerUI from './pdf-viewer-ui';

const PDFGenerator = ({
  biltyData,
  branchData,
  onClose,
  // Selected bill book (series) - only used before the bilty is saved; saved bilties are resolved by id
  billBookId = null
}) => {
  // permanent_details row used as the print header, and the template it points to
  const [permanentDetails, setPermanentDetails] = useState(null);
  const [printTemplate, setPrintTemplate] = useState('template1');
  const [headerWarning, setHeaderWarning] = useState('');
  const [fromCityData, setFromCityData] = useState(null);
  const [toCityData, setToCityData] = useState(null);
  const [transportData, setTransportData] = useState(null);
  const [biltyBookBranch, setBiltyBookBranch] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [darkenedSignature, setDarkenedSignature] = useState(null);
  const [signatureReady, setSignatureReady] = useState(false);
  const [zeroConsignorCharges, setZeroConsignorCharges] = useState(false);
  const [zeroDriverCharges, setZeroDriverCharges] = useState(false);
  // Print the top copy tagged "CONSIGNEE COPY" instead of "CONSIGNOR COPY"
  const [consigneeCopy, setConsigneeCopy] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Pre-process signature image to make it darker
  useEffect(() => {
    const processSignature = async () => {
      try {
        const signatureImg = '/biller-signature.png';
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = signatureImg;

        img.onload = () => {
          try {
            // Create canvas to process image
            const canvas = document.createElement('canvas');
            canvas.width = 500;
            canvas.height = 500;
            const ctx = canvas.getContext('2d');

            // Draw original image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Increase darkness and contrast
            for (let i = 0; i < data.length; i += 4) {
              // Apply darkness filter - make dark pixels darker
              data[i] = Math.max(0, data[i] * 0.5);     // Red
              data[i + 1] = Math.max(0, data[i + 1] * 0.5); // Green
              data[i + 2] = Math.max(0, data[i + 2] * 0.5); // Blue
              // Alpha stays the same (data[i + 3])
            }

            // Put modified image data back
            ctx.putImageData(imageData, 0, 0);

            // Convert canvas to data URL and store
            const darkerSignature = canvas.toDataURL('image/png');
            setDarkenedSignature(darkerSignature);
            setSignatureReady(true);
          } catch (error) {
            console.log('Failed to process signature image:', error);
            setSignatureReady(true); // Set ready even on error to not block PDF generation
          }
        };

        img.onerror = () => {
          console.log('Failed to load signature image');
          setSignatureReady(true); // Set ready even on error to not block PDF generation
        };
      } catch (error) {
        console.log('Error processing signature:', error);
      }
    };

    processSignature();
  }, []);


  // ==========================================
  // � UTILITY FUNCTIONS
  // ==========================================
  
  // Map city code to city name - MUST BE BEFORE loadAllDataAndGeneratePreview
  const getCityNameByCode = (cityCode) => {
    const cityCodeMap = {
      'ALG': 'ALIGARH',
      'KP': 'KANPUR',
      // Add more city codes as needed
    };
    return cityCodeMap[cityCode?.toUpperCase()] || cityCode || '';
  };

  useEffect(() => {
    if (biltyData?.branch_id && signatureReady) {
      loadAllDataAndGeneratePreview();
    }
  }, [biltyData, signatureReady]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Regenerate PDF when signature becomes available
  useEffect(() => {
    if (signatureReady && darkenedSignature && permanentDetails && !loading && !isGenerating) {
      // Only regenerate if we already have the data loaded
      if (pdfUrl) {
        // Signature just became available, regenerate PDF
        generatePDFPreview();
      }
    }
  }, [darkenedSignature]);

  // Regenerate PDF when charge-visibility toggles change
  useEffect(() => {
    if (permanentDetails && !loading) {
      generatePDFPreview();
    }
  }, [zeroConsignorCharges, zeroDriverCharges, consigneeCopy]);

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

      // Header + template from permanent_details (branch + company), plus cities and branch
      const [printInfo, fromCityRes, toCityRes, branchRes] = await Promise.all([
        fetchPrintDetails({
          biltyId: biltyData.id,
          branchId: biltyData.branch_id,
          billBookId: biltyData.bill_book_id || billBookId
        }),
        biltyData.from_city_id ?
          supabase.from('cities').select('*').eq('id', biltyData.from_city_id).single() :
          Promise.resolve({ data: null }),
        biltyData.to_city_id ?
          supabase.from('cities').select('*').eq('id', biltyData.to_city_id).single() :
          Promise.resolve({ data: null }),
        biltyData.branch_id ?
          supabase.from('branches').select('branch_code, branch_name, city_code').eq('id', biltyData.branch_id).single() :
          Promise.resolve({ data: null })
      ]);

      setPermanentDetails(printInfo.header);
      setPrintTemplate(printInfo.template);
      setHeaderWarning(
        !printInfo.header ? 'Print header not set for this branch' :
        printInfo.isFallback ? 'Company header not set, printing default' : ''
      );
      setBiltyBookBranch(branchRes.data);

      // Use branch data to determine from city if from_city_id is not set
      const effectiveFromCity = fromCityRes.data || (branchRes.data ? {
        city_name: getCityNameByCode(branchRes.data.city_code),
        city_code: branchRes.data.city_code
      } : null);

      setFromCityData(effectiveFromCity);
      setToCityData(toCityRes.data);

      // Load transport data - use transport_id if available (exact match), else fall back to city_id
      let transportRes = { data: null };
      if (biltyData.transport_id) {
        transportRes = await supabase
          .from('transports')
          .select('*')
          .eq('id', biltyData.transport_id)
          .single();
      } else if (biltyData.to_city_id) {
        transportRes = await supabase
          .from('transports')
          .select('*')
          .eq('city_id', biltyData.to_city_id)
          .limit(1)
          .single();
      }
      setTransportData(transportRes.data);

      await generatePDFPreview(printInfo.header, effectiveFromCity, toCityRes.data, transportRes.data, printInfo.template);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Draw the PDF with the template picked for this bilty's header (templates/templateN.js)
  const generatePDFPreview = async (permDetails = permanentDetails, fromCity = fromCityData, toCity = toCityData, transport = transportData, templateCode = printTemplate) => {
    setIsGenerating(true);

    try {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      // QR in the template's colours + its logo (if any)
      const { qrDataURL, logo } = await loadTemplateAssets(templateCode, biltyData.gr_no);
      const render = getTemplate(templateCode);
      const pdf = render({
        bilty: biltyData,
        header: permDetails,
        fromCity,
        toCity,
        transport,
        qrDataURL,
        logo,
        signature: darkenedSignature,
        options: {
          topCopyType: consigneeCopy ? 'CONSIGNEE' : 'CONSIGNOR',
          zeroTopCharges: zeroConsignorCharges,
          zeroDriverCharges
        }
      });
      
      
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
      <div className="fixed inset-0 bg-slate-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="animate-spin h-8 w-8 text-white" />
          </div>
          <div className="text-2xl font-bold text-black mb-2">movesure.io</div>
          <div className="w-16 h-0.5 bg-indigo-500 mx-auto rounded-full mb-4"></div>
          <p className="text-lg font-semibold text-black mb-2">Loading Bill Details...</p>
          <p className="text-sm text-gray-600">Please wait while we prepare your document</p>
        </div>
      </div>
    );
  }

  // Use the new professional UI component
  return (
    <PDFViewerUI
      biltyData={biltyData}
      fromCityData={fromCityData}
      toCityData={toCityData}
      pdfUrl={pdfUrl}
      loading={loading}
      isGenerating={isGenerating}
      onClose={onClose}
      onRefresh={loadAllDataAndGeneratePreview}
      onPrint={printPDF}
      onDownload={downloadPDF}
      isMobile={isMobile}
      warning={headerWarning}
      zeroConsignorCharges={zeroConsignorCharges}
      zeroDriverCharges={zeroDriverCharges}
      onToggleConsignorCharges={() => setZeroConsignorCharges(prev => !prev)}
      onToggleDriverCharges={() => setZeroDriverCharges(prev => !prev)}
      consigneeCopy={consigneeCopy}
      onToggleConsigneeCopy={() => setConsigneeCopy(prev => !prev)}
      onToggleBothCharges={() => {
        const newVal = !(zeroConsignorCharges && zeroDriverCharges);
        setZeroConsignorCharges(newVal);
        setZeroDriverCharges(newVal);
      }}
    />
  );
};

export default PDFGenerator;
