'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff, Save, X, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import bcrypt from 'bcryptjs';
import supabase from '../../app/utils/supabase';

export default function ChangePasswordForm({ userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // OTP State
  const [otpStep, setOtpStep] = useState('initial'); // initial, otp-sent, verified
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'newPassword') {
      let strength = 0;
      if (value.length >= 6) strength += 25;
      if (value.length >= 8) strength += 25;
      if (/[A-Z]/.test(value)) strength += 25;
      if (/[0-9]/.test(value)) strength += 25;
      setPasswordStrength(strength);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const sendOtp = async () => {
    setSendingOtp(true);
    setMessage({ type: '', text: '' });

    try {
      // Get phone number from user_details
      const { data: userDetails, error: detailsError } = await supabase
        .from('user_details')
        .select('phone')
        .eq('user_id', userId)
        .single();

      if (detailsError || !userDetails?.phone) {
        throw new Error('Phone number not found. Please update your profile with a phone number.');
      }

      const phone = userDetails.phone;
      setPhoneNumber(phone);

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in database
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_records')
        .insert([{
          user_id: userId,
          otp_code: otpCode,
          phone_number: phone,
          purpose: 'password_reset',
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
          receiver: phone,
          values: {
            "1": otpCode
          }
        })
      });

      if (!whatsappResponse.ok) {
        console.error('WhatsApp API failed, but OTP saved in database');
      }

      setOtpStep('otp-sent');
      setMessage({ type: 'success', text: `OTP sent to ${phone}` });

    } catch (error) {
      console.error('OTP send error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to send OTP' });
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });

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
      setMessage({ type: 'success', text: 'OTP verified successfully!' });

    } catch (error) {
      console.error('OTP verification error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to verify OTP' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Validation
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Hash new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(formData.newPassword, saltRounds);

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      
      // Reset form
      setTimeout(() => {
        setFormData({
          newPassword: '',
          confirmPassword: ''
        });
        setPasswordStrength(0);
        setOtp('');
        setOtpStep('initial');
        setOtpId(null);
        setIsOpen(false);
        setMessage({ type: '', text: '' });
      }, 2000);

    } catch (error) {
      console.error('Password change error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordStrength(0);
    setMessage({ type: '', text: '' });
    setOtp('');
    setOtpStep('initial');
    setOtpId(null);
    setIsOpen(false);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 75) return 'bg-green-500';
    if (passwordStrength >= 50) return 'bg-yellow-500';
    if (passwordStrength >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength >= 75) return 'Strong';
    if (passwordStrength >= 50) return 'Medium';
    if (passwordStrength >= 25) return 'Weak';
    return 'Very Weak';
  };

  if (!isOpen) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Security</h3>
            <p className="text-sm text-gray-600 mt-1">Manage your password and security settings</p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Lock className="h-4 w-4" />
            <span>Change Password</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Change Password</h3>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {message.text && (
        <div className={`mx-6 mt-6 p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="p-6">
        {/* Step 1: Send OTP */}
        {otpStep === 'initial' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Security Verification Required</p>
                  <p className="text-sm text-blue-800 mt-1">
                    For your security, we&apos;ll send an OTP to your registered mobile number to verify your identity before changing your password.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={sendOtp}
              disabled={sendingOtp}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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

        {/* Step 2: Verify OTP */}
        {otpStep === 'otp-sent' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">OTP Sent Successfully</p>
                  <p className="text-sm text-green-800 mt-1">
                    A 6-digit OTP has been sent to {phoneNumber}. Please check your WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Lock className="h-4 w-4 mr-2 text-gray-400" />
                Enter OTP <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength="6"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-center text-2xl tracking-widest font-semibold"
                placeholder="000000"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setOtpStep('initial');
                  setOtp('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Resend OTP
              </button>
              <button
                onClick={verifyOtp}
                disabled={isSaving || otp.length !== 6}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Verify OTP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Change Password */}
        {otpStep === 'verified' && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              
              {/* New Password */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Lock className="h-4 w-4 mr-2 text-gray-400" />
                  New Password <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {formData.newPassword && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Password Strength</span>
                      <span className="font-semibold">{getPasswordStrengthText()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getPasswordStrengthColor()}`}
                        style={{ width: `${passwordStrength}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Lock className="h-4 w-4 mr-2 text-gray-400" />
                  Confirm Password <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                  <div className="mt-2 flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Passwords match</span>
                  </div>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-center space-x-2">
                    <span className="text-blue-600">•</span>
                    <span>At least 6 characters long</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-blue-600">•</span>
                    <span>Include uppercase and numbers for stronger security</span>
                  </li>
                </ul>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Changing...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Change Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
