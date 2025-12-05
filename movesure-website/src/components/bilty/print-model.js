'use client';

import React, { useEffect, useState } from 'react';
import { Printer, X, FileText, Save } from 'lucide-react';
import { format } from 'date-fns';
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
  cities = [], // Add cities prop for WhatsApp
  onNewBilty // Add callback to start new bilty after PDF closes
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
    // Start new bilty after PDF closes
    if (onNewBilty) {
      onNewBilty();
    }
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
    <div className="fixed inset-0 backdrop-blur-sm bg-white/02 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-gray-200 max-h-[92vh] overflow-y-auto">
        {/* Compact Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-2xl p-3 shadow-lg z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold">Bilty Saved - {biltyData?.gr_no}</div>
                <div className="text-xs opacity-90">
                  {biltyData?.bilty_date && format(new Date(biltyData.bilty_date), 'dd MMM yyyy')}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 transition-colors p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* E-Way Bill Warning */}
          {biltyData?.invoice_value >= 50000 && !biltyData?.e_way_bill && (
            <div className="mb-3 bg-red-50 border-2 border-red-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-800 mb-1">⚠️ E-Way Bill Required</h4>
                  <p className="text-sm text-red-700">
                    Invoice value is <strong>₹{biltyData.invoice_value?.toLocaleString()}</strong> (above ₹50,000). 
                    E-Way Bill is <strong>mandatory</strong> for this shipment as per GST regulations.
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Please generate and attach E-Way Bill before proceeding with the shipment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Two Column Layout for Compact Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
            
            {/* Left Column */}
            <div className="space-y-3">
              {/* Consignor & Consignee */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-xs font-semibold text-blue-600 mb-1">Consignor</div>
                  <div className="text-sm font-bold text-black truncate">{biltyData?.consignor_name || 'N/A'}</div>
                  {biltyData?.consignor_number && (
                    <div className="text-xs text-gray-600">📱 {biltyData.consignor_number}</div>
                  )}
                  {biltyData?.consignor_gst && (
                    <div className="text-xs text-gray-500 truncate">GST: {biltyData.consignor_gst}</div>
                  )}
                </div>

                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="text-xs font-semibold text-green-600 mb-1">Consignee</div>
                  <div className="text-sm font-bold text-black truncate">{biltyData?.consignee_name || 'N/A'}</div>
                  {biltyData?.consignee_number && (
                    <div className="text-xs text-gray-600">📱 {biltyData.consignee_number}</div>
                  )}
                  {biltyData?.consignee_gst && (
                    <div className="text-xs text-gray-500 truncate">GST: {biltyData.consignee_gst}</div>
                  )}
                </div>
              </div>

              {/* Route & Delivery */}
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-amber-700">Route</div>
                    <div className="text-sm font-bold text-black">{fromCityName} → {toCityName}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-amber-700">Delivery</div>
                    <div className="text-sm font-bold text-black capitalize">
                      {biltyData?.delivery_type?.replace(/-/g, ' ') || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-amber-200">
                  <div>
                    <div className="text-xs font-semibold text-amber-700">Payment</div>
                    <div className="text-sm font-bold text-black uppercase">
                      {biltyData?.payment_mode?.replace(/-/g, ' ') || 'N/A'}
                    </div>
                  </div>
                  {biltyData?.transport_name && (
                    <div>
                      <div className="text-xs font-semibold text-amber-700">Transport</div>
                      <div className="text-xs font-bold text-black truncate">{biltyData.transport_name}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Package Info */}
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <div className="text-xs font-semibold text-purple-700">Packages</div>
                    <div className="text-sm font-bold text-black">{biltyData?.no_of_pkg || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-purple-700">Weight</div>
                    <div className="text-sm font-bold text-black">{biltyData?.wt || 0} kg</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-purple-700">Rate</div>
                    <div className="text-sm font-bold text-black">₹{biltyData?.rate || 0}</div>
                  </div>
                </div>
                {(biltyData?.invoice_no || biltyData?.e_way_bill) && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-200">
                    {biltyData?.invoice_no && (
                      <div>
                        <div className="text-xs font-semibold text-purple-700">Invoice</div>
                        <div className="text-xs text-black truncate">{biltyData.invoice_no}</div>
                      </div>
                    )}
                    {biltyData?.e_way_bill && (
                      <div>
                        <div className="text-xs font-semibold text-purple-700">E-Way Bill</div>
                        <div className="text-xs text-black truncate">{biltyData.e_way_bill}</div>
                      </div>
                    )}
                  </div>
                )}
                {biltyData?.contain && (
                  <div className="pt-2 border-t border-purple-200 mt-2">
                    <div className="text-xs font-semibold text-purple-700">Contents</div>
                    <div className="text-xs text-black">{biltyData.contain}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Charges */}
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Charges Breakdown</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Freight</span>
                    <span className="font-semibold text-black">₹{biltyData?.freight_amount || 0}</span>
                  </div>
                  {biltyData?.labour_charge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Labour/Hamali</span>
                      <span className="font-semibold text-black">₹{biltyData.labour_charge}</span>
                    </div>
                  )}
                  {biltyData?.bill_charge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bill Charge</span>
                      <span className="font-semibold text-black">₹{biltyData.bill_charge}</span>
                    </div>
                  )}
                  {biltyData?.toll_charge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Toll Charge</span>
                      <span className="font-semibold text-black">₹{biltyData.toll_charge}</span>
                    </div>
                  )}
                  {biltyData?.dd_charge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">DD Charge</span>
                      <span className="font-semibold text-black">₹{biltyData.dd_charge}</span>
                    </div>
                  )}
                  {biltyData?.other_charge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Other Charge</span>
                      <span className="font-semibold text-black">₹{biltyData.other_charge}</span>
                    </div>
                  )}
                  {biltyData?.pf_charge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">PF Charge</span>
                      <span className="font-semibold text-black">₹{biltyData.pf_charge}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-indigo-200 pt-2 mt-2">
                    <span className="font-bold text-black">Total</span>
                    <span className="font-bold text-indigo-600 text-lg">₹{biltyData?.total || 0}</span>
                  </div>
                </div>
              </div>

              {biltyData?.remark && (
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <div className="text-xs font-semibold text-yellow-700 mb-1">Remarks</div>
                  <div className="text-sm text-black">{biltyData.remark}</div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Print Only Button */}
            <button
              onClick={handlePrint}
              className="bg-indigo-500 text-white px-4 py-3 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 flex items-center justify-center gap-2 shadow transition-all font-semibold"
            >
              <Printer className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm">Print Only {showShortcuts && !biltyData?.consignor_number && '(Enter)'}</div>
                <div className="text-xs opacity-80">Download PDF</div>
              </div>
            </button>

            {/* Print & Send WhatsApp Button */}
            {biltyData?.consignor_number && (
              <button
                onClick={handlePrintAndSendWhatsApp}
                disabled={whatsappSending}
                className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-300 flex items-center justify-center gap-2 shadow transition-all font-semibold disabled:opacity-50"
              >
                <div className="flex items-center gap-1">
                  <Printer className="w-4 h-4" />
                  <span className="text-xs">+</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm">
                    {whatsappSending ? (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </div>
                    ) : whatsappSent ? 'WhatsApp ✓' : (
                      <>Print + WhatsApp {showShortcuts && '(Enter/Tab)'}</>
                    )}
                  </div>
                  <div className="text-xs opacity-80">
                    {whatsappSending ? 'Please wait...' : whatsappSent ? 'Sent!' : 'PDF + Message'}
                  </div>
                </div>
              </button>
            )}

            {/* Save Only Button */}
            <button
              onClick={onSaveOnly}
              className="bg-white border-2 border-indigo-600 text-indigo-600 px-4 py-3 rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 flex items-center justify-center gap-2 shadow transition-all font-semibold"
            >
              <Save className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm">Save Only {showShortcuts && !biltyData?.consignor_number && '(Tab)'}</div>
                <div className="text-xs opacity-70">No print</div>
              </div>
            </button>
          </div>

          {/* Close Button */}
          <div className="text-center mt-3">
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-black transition-colors px-4 py-1.5 rounded-lg hover:bg-gray-100"
            >
              Close {showShortcuts && '(Esc)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;