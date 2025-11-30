import React, { useState, useEffect } from 'react';
import { X, IndianRupee, CreditCard, Calendar, TrendingDown, Users, Shield, CheckCircle, AlertCircle, Lock, AlertTriangle } from 'lucide-react';
import supabase from '../../app/utils/supabase';

// Fixed admin phone number for salary OTP
const SALARY_ADMIN_PHONE = '7668291228';

export default function SalaryManagementModal({
  showModal,
  salaryPayments,
  salaryAdvances,
  users,
  currentUserId,
  onClose,
  onOpenPaymentModal,
  onOpenAdvanceModal,
  onEditPayment,
  onDeletePayment,
  onEditAdvance,
  onDeleteAdvance
}) {
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' or 'advances'
  const [filterMonth, setFilterMonth] = useState('');
  
  // OTP States
  const [otpStep, setOtpStep] = useState('initial'); // 'initial', 'otp-sent', 'verified'
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState({ type: '', text: '' });
  
  // Close confirmation state
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Reset OTP state when modal closes
  useEffect(() => {
    if (!showModal) {
      setOtpStep('initial');
      setOtp('');
      setOtpId(null);
      setOtpMessage({ type: '', text: '' });
      setShowCloseConfirm(false);
    }
  }, [showModal]);

  const sendOtp = async () => {
    setSendingOtp(true);
    setOtpMessage({ type: '', text: '' });

    try {
      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in database
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_records')
        .insert([{
          user_id: currentUserId,
          otp_code: otpCode,
          phone_number: SALARY_ADMIN_PHONE,
          purpose: 'salary',
          expires_at: expiresAt.toISOString(),
          is_verified: false,
          is_expired: false,
          attempt_count: 0
        }])
        .select()
        .single();

      if (otpError) throw otpError;
      setOtpId(otpRecord.id);

      // Send OTP via WhatsApp
      const whatsappResponse = await fetch('https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/h908xvdkc3/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiver: SALARY_ADMIN_PHONE,
          values: {
            "1": otpCode
          }
        })
      });

      if (!whatsappResponse.ok) {
        console.error('WhatsApp API failed, but OTP saved in database');
      }

      setOtpStep('otp-sent');
      setOtpMessage({ type: 'success', text: `OTP sent to ${SALARY_ADMIN_PHONE}` });

    } catch (error) {
      console.error('OTP send error:', error);
      setOtpMessage({ type: 'error', text: error.message || 'Failed to send OTP' });
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setVerifyingOtp(true);
    setOtpMessage({ type: '', text: '' });

    try {
      if (!otp || otp.length !== 6) {
        throw new Error('Please enter a valid 6-digit OTP');
      }

      // Get OTP record
      const { data: otpRecord, error: fetchError } = await supabase
        .from('otp_records')
        .select('*')
        .eq('id', otpId)
        .single();

      if (fetchError) throw new Error('Invalid OTP session');

      // Check if expired
      if (new Date() > new Date(otpRecord.expires_at)) {
        await supabase
          .from('otp_records')
          .update({ is_expired: true })
          .eq('id', otpId);
        throw new Error('OTP has expired. Please request a new one.');
      }

      // Check if already verified
      if (otpRecord.is_verified) {
        throw new Error('OTP already used');
      }

      // Check attempts
      if (otpRecord.attempt_count >= 5) {
        throw new Error('Too many attempts. Please request a new OTP.');
      }

      // Verify OTP
      if (otp !== otpRecord.otp_code) {
        // Increment attempt count
        await supabase
          .from('otp_records')
          .update({ attempt_count: otpRecord.attempt_count + 1 })
          .eq('id', otpId);
        throw new Error('Invalid OTP. Please try again.');
      }

      // Mark as verified
      await supabase
        .from('otp_records')
        .update({ 
          is_verified: true,
          verified_at: new Date().toISOString()
        })
        .eq('id', otpId);

      setOtpStep('verified');
      setOtpMessage({ type: 'success', text: 'OTP verified successfully! Access granted.' });

    } catch (error) {
      console.error('OTP verification error:', error);
      setOtpMessage({ type: 'error', text: error.message || 'Failed to verify OTP' });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleClose = () => {
    // Show confirmation dialog if OTP is verified
    if (otpStep === 'verified') {
      setShowCloseConfirm(true);
    } else {
      // If not verified, just close
      setOtpStep('initial');
      setOtp('');
      setOtpId(null);
      setOtpMessage({ type: '', text: '' });
      onClose();
    }
  };

  const confirmClose = () => {
    setOtpStep('initial');
    setOtp('');
    setOtpId(null);
    setOtpMessage({ type: '', text: '' });
    setShowCloseConfirm(false);
    onClose();
  };

  const cancelClose = () => {
    setShowCloseConfirm(false);
  };

  if (!showModal) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  const filteredPayments = filterMonth
    ? salaryPayments.filter(p => p.salary_month && p.salary_month.startsWith(filterMonth))
    : salaryPayments;

  // Fix: advance_date is a date like "2025-11-30", filter by year-month
  const filteredAdvances = filterMonth
    ? (salaryAdvances || []).filter(a => {
        if (!a.advance_date) return false;
        const advanceMonth = a.advance_date.substring(0, 7); // Get YYYY-MM from YYYY-MM-DD
        return advanceMonth === filterMonth;
      })
    : (salaryAdvances || []);

  const totalPaidThisMonth = filteredPayments.reduce((sum, p) => sum + parseFloat(p.net_salary_paid || 0), 0);
  const totalAdvancesThisMonth = filteredAdvances.filter(a => !a.salary_payment_id).reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

  // Close Confirmation Dialog
  const CloseConfirmDialog = () => (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle size={28} />
            <h3 className="text-xl font-bold">Close Salary Management?</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-700 mb-2">
            Are you sure you want to close Salary Management?
          </p>
          <p className="text-sm text-orange-600 font-medium bg-orange-50 p-3 rounded-lg border border-orange-200">
            ⚠️ You will need to verify OTP again to access salary management.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={cancelClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
            >
              No, Keep Open
            </button>
            <button
              onClick={confirmClose}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold"
            >
              Yes, Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // OTP Verification UI (shown when not verified)
  if (otpStep !== 'verified') {
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield size={24} />
                Salary Management Access
              </h2>
              <button onClick={handleClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* OTP Message */}
            {otpMessage.text && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
                otpMessage.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {otpMessage.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                )}
                <span className="font-medium text-sm">{otpMessage.text}</span>
              </div>
            )}

            {/* Step 1: Request OTP */}
            {otpStep === 'initial' && (
              <div className="space-y-6">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Lock className="h-6 w-6 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-indigo-900">Security Verification Required</p>
                      <p className="text-sm text-indigo-800 mt-1">
                        Salary management requires OTP verification. An OTP will be sent to the authorized admin number for security purposes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600">OTP will be sent to:</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{SALARY_ADMIN_PHONE}</p>
                </div>

                <button
                  onClick={sendOtp}
                  disabled={sendingOtp}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingOtp ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5" />
                      <span>Send OTP to WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step 2: Enter OTP */}
            {otpStep === 'otp-sent' && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-900">OTP Sent Successfully</p>
                      <p className="text-sm text-green-800 mt-1">
                        A 6-digit OTP has been sent to <strong>{SALARY_ADMIN_PHONE}</strong>. Please check WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength="6"
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl tracking-[0.5em] font-bold text-gray-900"
                    placeholder="000000"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setOtpStep('initial');
                      setOtp('');
                      setOtpMessage({ type: '', text: '' });
                    }}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                  >
                    Resend OTP
                  </button>
                  <button
                    onClick={verifyOtp}
                    disabled={verifyingOtp || otp.length !== 6}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifyingOtp ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>Verify OTP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Salary Management UI (shown after OTP verification)
  return (
    <>
      {/* Close Confirmation Dialog */}
      {showCloseConfirm && <CloseConfirmDialog />}
      
      <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-t-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <IndianRupee size={28} />
                Salary Management
                <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
                  <CheckCircle size={12} />
                  Verified
                </span>
              </h2>
              <button onClick={handleClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                  <Users size={16} />
                  <span>Total Employees</span>
                </div>
                <div className="text-3xl font-bold">{users.length}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                <IndianRupee size={16} />
                <span>Salaries Paid</span>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(totalPaidThisMonth)}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                <TrendingDown size={16} />
                <span>Pending Advances</span>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(totalAdvancesThisMonth)}</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={onOpenPaymentModal}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold shadow-md"
            >
              <IndianRupee size={18} />
              Pay Salary
            </button>
            <button
              onClick={onOpenAdvanceModal}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-semibold shadow-md"
            >
              <CreditCard size={18} />
              Give Advance
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <Calendar size={18} className="text-gray-600" />
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'payments'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-0.5'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Salary Payments ({filteredPayments.length})
            </button>
            <button
              onClick={() => setActiveTab('advances')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'advances'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-0.5'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Advances ({filteredAdvances.length})
            </button>
          </div>

          {/* Content */}
          {activeTab === 'payments' ? (
            <div className="space-y-3">
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <IndianRupee size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No salary payments found</p>
                </div>
              ) : (
                filteredPayments.map(payment => (
                  <div key={payment.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 hover:shadow-lg transition-all">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <h4 className="font-bold text-lg text-gray-900">
                          {payment.users?.name || getUserName(payment.user_id)}
                        </h4>
                        <p className="text-sm text-gray-600">{payment.users?.post || 'N/A'}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm">
                          <span className="text-gray-700">
                            <strong>Month:</strong> {new Date(payment.salary_month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <span className="text-gray-700">
                            <strong>Paid On:</strong> {new Date(payment.payment_date).toLocaleDateString()}
                          </span>
                          <span className="text-gray-700">
                            <strong>Mode:</strong> {payment.payment_mode || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">
                            Gross: <span className="font-semibold">{formatCurrency(payment.gross_salary)}</span>
                          </div>
                          <div className="text-sm text-orange-600">
                            Advance: <span className="font-semibold">-{formatCurrency(payment.total_advance_deducted)}</span>
                          </div>
                          <div className="text-xl font-bold text-green-700">
                            {formatCurrency(payment.net_salary_paid)}
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => onEditPayment(payment)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDeletePayment(payment.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    {payment.notes && (
                      <div className="mt-3 pt-3 border-t border-green-300">
                        <p className="text-sm text-gray-700"><strong>Notes:</strong> {payment.notes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAdvances.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No advances found</p>
                </div>
              ) : (
                filteredAdvances.map(advance => (
                  <div key={advance.id} className={`rounded-xl p-4 hover:shadow-lg transition-all border-2 ${
                    advance.salary_payment_id
                      ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300'
                      : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
                  }`}>
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <h4 className="font-bold text-lg text-gray-900">
                          {advance.users?.name || getUserName(advance.user_id)}
                        </h4>
                        <p className="text-sm text-gray-600">{advance.users?.post || 'N/A'}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm">
                          <span className="text-gray-700">
                            <strong>Date:</strong> {new Date(advance.advance_date).toLocaleDateString()}
                          </span>
                          {advance.salary_payment_id && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              Adjusted
                            </span>
                          )}
                          {!advance.salary_payment_id && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-orange-700">
                          {formatCurrency(advance.amount)}
                        </div>
                      </div>
                    </div>
                    {advance.reason && (
                      <div className="mt-3 pt-3 border-t border-orange-300">
                        <p className="text-sm text-gray-700"><strong>Reason:</strong> {advance.reason}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
