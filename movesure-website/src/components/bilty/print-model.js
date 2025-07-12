'use client';

import React, { useEffect, useState } from 'react';
import { Printer, X, FileText, Save } from 'lucide-react';
import PDFGenerator from './pdf-generation';

const PrintModal = ({ 
  isOpen, 
  onClose, 
  onSaveOnly,
  biltyData,
  branchData,
  fromCityName,
  toCityName,
  showShortcuts,
  cities = [] // Add cities prop for WhatsApp
}) => {
  const [showPDFGenerator, setShowPDFGenerator] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [lastSendTime, setLastSendTime] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // Prioritize WhatsApp + Print if mobile number exists
          if (biltyData?.consignor_number) {
            handlePrintAndSendWhatsApp();
          } else {
            handlePrint();
          }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          // Tab also triggers WhatsApp + Print if mobile number exists
          if (biltyData?.consignor_number) {
            handlePrintAndSendWhatsApp();
          } else {
            onSaveOnly();
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onSaveOnly, onClose, biltyData]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setWhatsappSent(false);
      setWhatsappSending(false);
    }
  }, [isOpen]);

  // Send WhatsApp message function
  const sendWhatsAppMessage = async () => {
    if (!biltyData?.consignor_number || !biltyData?.gr_no || !biltyData?.consignor_name) {
      console.error('❌ Missing required data for WhatsApp');
      return false;
    }

    // Rate limiting - 5 seconds
    const currentTime = Date.now();
    const timeSinceLastSend = currentTime - lastSendTime;
    if (timeSinceLastSend < 5000 && lastSendTime > 0) {
      console.log('🚫 Rate limited - wait 5 seconds');
      return false;
    }

    try {
      setWhatsappSending(true);
      setLastSendTime(currentTime);

      const promises = [];

      // Send to consignor (always send if we reach this function)
      let consignorMobile = biltyData.consignor_number.toString().replace(/\D/g, '');
      if (consignorMobile.length === 10) {
        consignorMobile = '91' + consignorMobile;
      }

      const consignorPayload = {
        receiver: consignorMobile,
        values: {
          "1": biltyData.consignor_name,
          "2": biltyData.gr_no,
          "3": biltyData.gr_no
        }
      };

      promises.push(
        fetch('https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/4091xkylvs/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(consignorPayload)
        }).then(response => {
          if (response.ok) {
            console.log('✅ WhatsApp sent successfully to consignor');
            return { success: true, type: 'consignor' };
          } else {
            console.error('❌ WhatsApp failed for consignor:', response.status);
            return { success: false, type: 'consignor' };
          }
        }).catch(error => {
          console.error('❌ WhatsApp error for consignor:', error);
          return { success: false, type: 'consignor' };
        })
      );

      // Send to consignee (only if consignee has mobile number)
      if (biltyData?.consignee_number && biltyData?.consignee_name) {
        let consigneeMobile = biltyData.consignee_number.toString().replace(/\D/g, '');
        if (consigneeMobile.length === 10) {
          consigneeMobile = '91' + consigneeMobile;
        }
        if (consigneeMobile.length >= 10) {
          const consigneePayload = {
            receiver: consigneeMobile,
            values: {
              "1": biltyData.consignee_name,
              "2": biltyData.gr_no,
              "3": biltyData.gr_no
            }
          };

          promises.push(
            fetch('https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/q09vgfk1r4/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(consigneePayload)
            }).then(response => {
              if (response.ok) {
                console.log('✅ WhatsApp sent successfully to consignee');
                return { success: true, type: 'consignee' };
              } else {
                console.error('❌ WhatsApp failed for consignee:', response.status);
                return { success: false, type: 'consignee' };
              }
            }).catch(error => {
              console.error('❌ WhatsApp error for consignee:', error);
              return { success: false, type: 'consignee' };
            })
          );
        }
      }

      // Send WhatsApp to all recipients
      const results = await Promise.all(promises);
      const allSuccess = results.every(result => result.success);
      const consignorSent = results.find(r => r.type === 'consignor')?.success;

      if (allSuccess) {
        console.log('✅ All WhatsApp messages sent successfully');
        setWhatsappSent(true);
        return true;
      } else if (consignorSent) {
        console.log('⚠️ Consignor message sent, but consignee failed');
        setWhatsappSent(true); // Still show as sent if consignor got it
        return true;
      } else {
        console.log('❌ Failed to send WhatsApp to consignor');
        return false;
      }
    } catch (error) {
      console.error('❌ WhatsApp error:', error);
      return false;
    } finally {
      setWhatsappSending(false);
    }
  };

  const handlePrint = () => {
    setShowPDFGenerator(true);
  };

  const handlePrintAndSendWhatsApp = async () => {
    const whatsappSuccess = await sendWhatsAppMessage();
    if (whatsappSuccess) {
      console.log('📱 WhatsApp sent, now generating PDF...');
    }
    setShowPDFGenerator(true);
  };

  const closePDFGenerator = () => {
    setShowPDFGenerator(false);
    onClose();
  };

  if (!isOpen) return null;

  // Show PDF Generator if requested
  if (showPDFGenerator) {
    return (
      <PDFGenerator
        biltyData={biltyData}
        branchData={branchData}
        fromCityName={fromCityName}
        toCityName={toCityName}
        onClose={closePDFGenerator}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200">
        {/* Header with movesure.io branding */}
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-black mb-2">movesure.io</div>
          <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-blue-500 mx-auto rounded-full"></div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-3 text-black">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Bilty Saved Successfully!
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-8">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6 border border-purple-200">
            <div className="text-lg font-bold text-black mb-3 text-center">
              GR Number: <span className="text-purple-600">{biltyData?.gr_no}</span>
            </div>
            <div className="text-sm text-gray-700 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">From:</span> 
                <span className="text-black">{biltyData?.consignor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">To:</span> 
                <span className="text-black">{biltyData?.consignee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Route:</span> 
                <span className="text-black">{fromCityName} → {toCityName}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-3">
                <span className="font-bold">Total Amount:</span> 
                <span className="font-bold text-purple-600 text-lg">₹{biltyData?.total}</span>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 text-center mb-6 text-sm">
            Choose an action for your bilty document
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-4">
            {/* Print Only Button */}
            <button
              onClick={handlePrint}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-4 rounded-xl hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-purple-300 flex items-center justify-center gap-3 shadow-lg transition-all transform hover:scale-[1.02] font-semibold"
            >
              <Printer className="w-6 h-6" />
              <div>
                <div className="text-lg">
                  Print Only {showShortcuts && !biltyData?.consignor_number && '(Enter)'}
                </div>
                <div className="text-xs opacity-90">Generate & Download PDF</div>
              </div>
            </button>

            {/* Print & Send WhatsApp Button */}
            {biltyData?.consignor_number && (
              <button
                onClick={handlePrintAndSendWhatsApp}
                disabled={whatsappSending}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-emerald-600 focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center justify-center gap-3 shadow-lg transition-all transform hover:scale-[1.02] font-semibold disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5" />
                  <span className="text-sm font-bold">+</span>
                  {/* WhatsApp Icon */}
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </div>
                <div>
                  <div className="text-lg">
                    {whatsappSending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </div>
                    ) : whatsappSent ? 'Print + WhatsApp ✓' : (
                      <>Print + Send WhatsApp {showShortcuts && '(Enter/Tab)'}</>
                    )}
                  </div>
                  <div className="text-xs opacity-90">
                    {whatsappSending ? 'Sending message...' : whatsappSent ? 'Message sent successfully' : 'PDF + WhatsApp to consignor'}
                  </div>
                </div>
              </button>
            )}

            {/* Save Only Button */}
            <button
              onClick={onSaveOnly}
              className="w-full bg-white border-2 border-purple-600 text-purple-600 px-6 py-4 rounded-xl hover:bg-purple-50 focus:outline-none focus:ring-4 focus:ring-purple-300 flex items-center justify-center gap-3 shadow-md transition-all transform hover:scale-[1.02] font-semibold"
            >
              <Save className="w-6 h-6" />
              <div>
                <div className="text-lg">
                  Save Only {showShortcuts && !biltyData?.consignor_number && '(Tab)'}
                </div>
                <div className="text-xs opacity-70">Save without printing</div>
              </div>
            </button>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-black transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Close {showShortcuts && '(Esc)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;