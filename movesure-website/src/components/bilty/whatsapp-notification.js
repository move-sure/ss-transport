'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, CheckCircle, AlertCircle } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const WhatsAppNotification = ({ 
  biltyData, 
  cities = [], 
  onStatusUpdate = null,
  autoSend = false  // New prop for automatic sending
}) => {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', null
  const [autoSendAttempted, setAutoSendAttempted] = useState(false);
  const [lastAutoSendTime, setLastAutoSendTime] = useState(0);
  const [rateLimitBlocked, setRateLimitBlocked] = useState(false);

  // Auto-send effect with rate limiting
  useEffect(() => {
    if (autoSend && !autoSendAttempted && biltyData && biltyData.consignor_number) {
      const currentTime = Date.now();
      const timeSinceLastSend = currentTime - lastAutoSendTime;
      const RATE_LIMIT_MS = 5000; // 5 seconds

      if (timeSinceLastSend < RATE_LIMIT_MS && lastAutoSendTime > 0) {
        console.log('🚫 Auto-send rate limited. Wait', (RATE_LIMIT_MS - timeSinceLastSend) / 1000, 'seconds');
        setRateLimitBlocked(true);
        setAutoSendAttempted(true);
        
        // Clear rate limit after remaining time
        setTimeout(() => {
          setRateLimitBlocked(false);
        }, RATE_LIMIT_MS - timeSinceLastSend);
        
        return;
      }

      setAutoSendAttempted(true);
      setLastAutoSendTime(currentTime);
      console.log('🤖 Auto-sending WhatsApp message...');
      sendWhatsAppMessage(true); // Pass true for auto-send
    }
  }, [autoSend, biltyData, autoSendAttempted, lastAutoSendTime]);

  const sendWhatsAppMessage = async (isAutoSend = false) => {
    if (!biltyData || !biltyData.consignor_number || !biltyData.gr_no) {
      console.error('❌ Missing required bilty data for WhatsApp:', {
        hasBiltyData: !!biltyData,
        hasConsignorNumber: !!biltyData?.consignor_number,
        hasGrNo: !!biltyData?.gr_no
      });
      setStatus('error');
      if (onStatusUpdate) {
        onStatusUpdate('error', 'Missing required bilty data');
      }
      return;
    }

    // Check rate limit for auto-send only
    if (isAutoSend) {
      const currentTime = Date.now();
      const timeSinceLastSend = currentTime - lastAutoSendTime;
      const RATE_LIMIT_MS = 5000; // 5 seconds

      if (timeSinceLastSend < RATE_LIMIT_MS && lastAutoSendTime > 0) {
        console.log('🚫 Auto-send blocked by rate limit');
        setRateLimitBlocked(true);
        setStatus('error');
        if (onStatusUpdate) {
          onStatusUpdate('error', 'Rate limited - please wait 5 seconds');
        }
        return;
      }
      
      setLastAutoSendTime(currentTime);
    }

    // Additional validation for consignor name
    if (!biltyData.consignor_name || biltyData.consignor_name.trim() === '') {
      console.error('❌ Missing consignor name for WhatsApp notification');
      setStatus('error');
      if (onStatusUpdate) {
        onStatusUpdate('error', 'Missing consignor name');
      }
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      // Get city name from city ID
      const toCity = cities.find(city => city.id === biltyData.to_city_id);
      const toCityName = toCity ? toCity.city_name : 'N/A';
    // Clean mobile number (remove any non-digits and ensure it starts with country code)
    let mobileNumber = biltyData.consignor_number.toString().replace(/\D/g, '');
    
    // Validate mobile number length
    if (mobileNumber.length < 10) {
      console.error('❌ Invalid mobile number length:', mobileNumber);
      setStatus('error');
      if (onStatusUpdate) {
        onStatusUpdate('error', 'Invalid mobile number format');
      }
      return;
    }
    
    // Add country code if not present (assuming India +91)
    if (mobileNumber.length === 10) {
      mobileNumber = '91' + mobileNumber;
    } else if (mobileNumber.length === 12 && mobileNumber.startsWith('91')) {
      // Already has country code
    } else {
      console.error('❌ Unsupported mobile number format:', mobileNumber);
      setStatus('error');
      if (onStatusUpdate) {
        onStatusUpdate('error', 'Unsupported mobile number format');
      }
      return;
    }

      // Fetch pdf_bucket from DB (background upload may have completed)
      let pdfBucketLink = biltyData.pdf_bucket || '';
      if (!pdfBucketLink && biltyData.id) {
        const { data: freshBilty } = await supabase
          .from('bilty')
          .select('pdf_bucket')
          .eq('id', biltyData.id)
          .single();
        pdfBucketLink = freshBilty?.pdf_bucket || '';
      }
      if (!pdfBucketLink) {
        pdfBucketLink = `https://console.movesure.io/print/${biltyData.gr_no}`;
      }

      // Format date
      const biltyDate = biltyData.bilty_date
        ? new Date(biltyData.bilty_date).toLocaleDateString('en-GB')
        : 'N/A';

      // Format delivery type
      const deliveryType = biltyData.delivery_type
        ? biltyData.delivery_type.replace(/-/g, ' ').toUpperCase()
        : 'N/A';

      // Format payment mode
      const paymentMode = biltyData.payment_mode
        ? biltyData.payment_mode.replace(/-/g, ' ').toUpperCase()
        : 'N/A';

      console.log('📱 Sending WhatsApp message (new template):', {
        receiver: mobileNumber,
        consignorName: biltyData.consignor_name,
        grNo: biltyData.gr_no,
        toCityName: toCityName,
        pdfBucket: pdfBucketLink
      });

      // Prepare WhatsApp payload - 9 variable template
      const payload = {
        receiver: mobileNumber,
        values: {
          "1": biltyData.gr_no || 'N/A',
          "2": biltyData.consignor_name || 'N/A',
          "3": pdfBucketLink,
          "4": biltyDate,
          "5": toCityName || 'N/A',
          "6": deliveryType,
          "7": paymentMode,
          "8": biltyData.consignee_name || 'N/A',
          "9": biltyData.gr_no || 'N/A'
        }
      };

      // Send WhatsApp message via new template
      const response = await fetch('https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/j2s96opcd7/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ WhatsApp message sent successfully:', result);
        setStatus('success');
        setRateLimitBlocked(false);
        
        // Notify parent component if callback provided
        if (onStatusUpdate) {
          onStatusUpdate('success', `WhatsApp message sent successfully ${isAutoSend ? '(auto)' : '(manual)'}`);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ WhatsApp API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        setStatus('error');
        
        if (onStatusUpdate) {
          onStatusUpdate('error', `WhatsApp API error: ${response.status}`);
        }
      }

    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      setStatus('error');
      
      if (onStatusUpdate) {
        onStatusUpdate('error', `Network error: ${error.message}`);
      }
    } finally {
      setSending(false);
    }
  };

  // Don't render if no mobile number
  if (!biltyData?.consignor_number) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 mt-4 p-4 rounded-lg border-2 transition-all ${
      status === 'success' 
        ? 'bg-green-100 border-green-300' 
        : status === 'error'
        ? 'bg-red-50 border-red-200'
        : 'bg-green-50 border-green-200 shadow-sm'
    }`}>
      <MessageCircle className={`w-5 h-5 ${
        status === 'success' ? 'text-green-700' : 
        status === 'error' ? 'text-red-600' : 'text-green-600'
      }`} />
      
      <div className="flex-1">
        <p className={`text-sm font-medium ${
          status === 'success' ? 'text-green-800' : 
          status === 'error' ? 'text-red-800' : 'text-green-800'
        }`}>
          {status === 'success' ? 'WhatsApp message sent to consignor successfully!' :
           status === 'error' ? 'Failed to send WhatsApp message to consignor' :
           autoSend ? 'Sending bilty details to consignor via WhatsApp...' :
           'Send bilty details to consignor via WhatsApp'}
        </p>
        <p className={`text-xs mt-1 ${
          status === 'success' ? 'text-green-600' : 
          status === 'error' ? 'text-red-600' : 'text-green-600'
        }`}>
          Consignor: {biltyData.consignor_name} | Mobile: {biltyData.consignor_number} | GR: {biltyData.gr_no} | To: {cities.find(c => c.id === biltyData.to_city_id)?.city_name || 'N/A'}
        </p>
      </div>

      <button
        onClick={() => sendWhatsAppMessage(false)} // Manual send - no rate limit
        disabled={sending || status === 'success' || (rateLimitBlocked && autoSend)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          status === 'success' 
            ? 'bg-green-600 text-white cursor-not-allowed' 
            : status === 'error'
            ? 'bg-red-500 text-white hover:bg-red-600'
            : rateLimitBlocked && autoSend
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
        } ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {sending ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Sending...
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Sent
          </>
        ) : rateLimitBlocked && autoSend ? (
          <>
            <AlertCircle className="w-4 h-4" />
            Rate Limited
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle className="w-4 h-4" />
            Retry Send
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send to Consignor
          </>
        )}
      </button>
    </div>
  );
};

export default WhatsAppNotification;
