'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Shield, CheckCircle, AlertCircle, Truck, Phone } from 'lucide-react';
import bcrypt from 'bcryptjs';
import supabase from '../../utils/supabase';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  // Step tracking: 'username' -> 'otp-sent' -> 'otp-verify' -> 'new-password' -> 'success'
  const [step, setStep] = useState('username');

  // Username step
  const [username, setUsername] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  // OTP step
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState(null);

  // Password step
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false });
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Shared
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ─── Step 1: Find user & send OTP ────────────────────────────────
  const handleFindUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!username.trim()) throw new Error('Please enter your username');

      const normalizedUsername = username.trim().toLowerCase();

      // Find user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, name')
        .ilike('username', normalizedUsername)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        throw new Error('No active account found with this username');
      }

      // Get phone number
      const { data: userDetails, error: detailsError } = await supabase
        .from('user_details')
        .select('phone')
        .eq('user_id', userData.id)
        .single();

      if (detailsError || !userDetails?.phone) {
        throw new Error('No phone number linked to this account. Please contact admin.');
      }

      setFoundUser(userData);
      const phone = userDetails.phone;
      setPhoneNumber(phone);

      // Generate & store OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_records')
        .insert([{
          user_id: userData.id,
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

      if (otpError) throw new Error('Failed to generate OTP. Please try again.');
      setOtpId(otpRecord.id);

      // Send OTP via WhatsApp
      await fetch('https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/h908xvdkc3/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver: phone,
          values: { "1": otpCode }
        })
      });

      setStep('otp-sent');
      setMessage({ type: 'success', text: `OTP sent to ${maskPhone(phone)} via WhatsApp` });

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 2: Verify OTP ──────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!otp || otp.length !== 6) throw new Error('Please enter a valid 6-digit OTP');

      const { data: otpRecord, error: fetchError } = await supabase
        .from('otp_records')
        .select('*')
        .eq('id', otpId)
        .single();

      if (fetchError) throw new Error('Invalid OTP session');

      if (new Date() > new Date(otpRecord.expires_at)) {
        await supabase.from('otp_records').update({ is_expired: true }).eq('id', otpId);
        throw new Error('OTP has expired. Please request a new one.');
      }

      if (otpRecord.is_verified) throw new Error('OTP already used');

      if (otpRecord.attempt_count >= 5) {
        throw new Error('Too many attempts. Please request a new OTP.');
      }

      if (otp !== otpRecord.otp_code) {
        await supabase
          .from('otp_records')
          .update({ attempt_count: otpRecord.attempt_count + 1 })
          .eq('id', otpId);
        throw new Error('Invalid OTP. Please try again.');
      }

      // Mark verified
      await supabase
        .from('otp_records')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', otpId);

      setStep('new-password');
      setMessage({ type: 'success', text: 'OTP verified! Set your new password.' });

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 3: Change password ─────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (formData.newPassword.length < 6) throw new Error('Password must be at least 6 characters');
      if (formData.newPassword !== formData.confirmPassword) throw new Error('Passwords do not match');

      const newPasswordHash = await bcrypt.hash(formData.newPassword, 10);

      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
        .eq('id', foundUser.id);

      if (updateError) throw new Error('Failed to update password');

      setStep('success');
      setMessage({ type: 'success', text: 'Password changed successfully!' });

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Resend OTP ──────────────────────────────────────────────────
  const handleResendOtp = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Expire old OTP
      if (otpId) {
        await supabase.from('otp_records').update({ is_expired: true }).eq('id', otpId);
      }

      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_records')
        .insert([{
          user_id: foundUser.id,
          otp_code: otpCode,
          phone_number: phoneNumber,
          purpose: 'password_reset',
          expires_at: expiresAt.toISOString(),
          is_verified: false,
          is_expired: false,
          attempt_count: 0
        }])
        .select()
        .single();

      if (otpError) throw new Error('Failed to generate OTP');
      setOtpId(otpRecord.id);

      await fetch('https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/h908xvdkc3/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver: phoneNumber,
          values: { "1": otpCode }
        })
      });

      setOtp('');
      setMessage({ type: 'success', text: `New OTP sent to ${maskPhone(phoneNumber)}` });

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────
  const maskPhone = (phone) => {
    if (!phone || phone.length < 4) return phone;
    return phone.slice(0, 2) + '****' + phone.slice(-4);
  };

  const handlePasswordInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'newPassword') {
      let s = 0;
      if (value.length >= 6) s += 25;
      if (value.length >= 8) s += 25;
      if (/[A-Z]/.test(value)) s += 25;
      if (/[0-9]/.test(value)) s += 25;
      setPasswordStrength(s);
    }
  };

  const strengthColor = passwordStrength >= 75 ? 'bg-emerald-500' : passwordStrength >= 50 ? 'bg-yellow-500' : passwordStrength >= 25 ? 'bg-orange-500' : 'bg-red-500';
  const strengthText = passwordStrength >= 75 ? 'Strong' : passwordStrength >= 50 ? 'Medium' : passwordStrength >= 25 ? 'Weak' : 'Very Weak';

  // Step indicator data
  const steps = [
    { key: 'username', label: 'Username' },
    { key: 'otp', label: 'Verify OTP' },
    { key: 'password', label: 'New Password' },
  ];
  const activeIdx = step === 'username' ? 0 : (step === 'otp-sent' ? 1 : (step === 'new-password' ? 2 : step === 'success' ? 3 : 1));

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-black opacity-90" />
        <div className="absolute -left-20 top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.32),_transparent_65%)] blur-3xl" />
        <div className="absolute right-0 top-32 h-[26rem] w-[26rem] translate-x-24 rounded-full bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.3),_transparent_60%)] blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 translate-y-1/3 rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(56,189,248,0.25),_transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">

          {/* Logo / Brand */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Truck className="h-7 w-7 text-blue-200" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-200">movesure.io</p>
              <p className="text-xs uppercase tracking-[0.45em] text-white/50">Password Recovery</p>
            </div>
          </div>

          {/* Step Indicator */}
          {step !== 'success' && (
            <div className="mb-8 flex items-center justify-center gap-0">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                      i < activeIdx ? 'bg-emerald-500 text-white' :
                      i === activeIdx ? 'bg-blue-500 text-white ring-4 ring-blue-500/30' :
                      'bg-white/10 text-white/40'
                    }`}>
                      {i < activeIdx ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`mt-1.5 text-[0.6rem] font-medium uppercase tracking-wider ${
                      i <= activeIdx ? 'text-blue-200' : 'text-white/30'
                    }`}>{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`mx-2 mb-5 h-0.5 w-10 rounded-full transition-all duration-300 ${
                      i < activeIdx ? 'bg-emerald-500' : 'bg-white/10'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-white/90 p-7 text-slate-900 shadow-2xl backdrop-blur-xl sm:p-9">

            {/* Message Banner */}
            {message.text && (
              <div className={`mb-6 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}>
                {message.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            {/* ═══════════ Step: Username ═══════════ */}
            {step === 'username' && (
              <form onSubmit={handleFindUser} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">Reset your password</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Enter your username and we&apos;ll send an OTP to your registered WhatsApp number.</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600" htmlFor="fp-username">Username</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      id="fp-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Enter your username"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-500 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                      <span>Finding account...</span>
                    </div>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      <span>Send OTP</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ═══════════ Step: OTP Sent / Verify ═══════════ */}
            {step === 'otp-sent' && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">Verify OTP</h2>
                  <p className="mt-1.5 text-sm text-slate-500">
                    A 6-digit code has been sent to <span className="font-semibold text-slate-700">{maskPhone(phoneNumber)}</span> via WhatsApp
                  </p>
                </div>

                {foundUser?.name && (
                  <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{foundUser.name}</p>
                      <p className="text-xs text-slate-500">@{foundUser.username}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-blue-500 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Verify</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ═══════════ Step: New Password ═══════════ */}
            {step === 'new-password' && (
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">Set New Password</h2>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Create a new password for <span className="font-semibold text-slate-700">@{foundUser?.username}</span>
                  </p>
                </div>

                {/* New Password */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">New Password</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handlePasswordInput}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Enter new password"
                    />
                    <button type="button" onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                      {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {formData.newPassword && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Strength</span>
                        <span className="font-semibold">{strengthText}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${strengthColor}`} style={{ width: `${passwordStrength}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">Confirm Password</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handlePasswordInput}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Confirm new password"
                    />
                    <button type="button" onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                      {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                    <div className="mt-2 flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Passwords match</span>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3.5">
                  <p className="text-xs font-semibold text-blue-900 mb-1.5">Password Requirements:</p>
                  <ul className="space-y-1 text-xs text-blue-800">
                    <li className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${formData.newPassword.length >= 6 ? 'bg-emerald-500' : 'bg-blue-300'}`} />
                      At least 6 characters
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(formData.newPassword) ? 'bg-emerald-500' : 'bg-blue-300'}`} />
                      Include an uppercase letter
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${/[0-9]/.test(formData.newPassword) ? 'bg-emerald-500' : 'bg-blue-300'}`} />
                      Include a number
                    </li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-500 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                      <span>Updating...</span>
                    </div>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Change Password</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ═══════════ Step: Success ═══════════ */}
            {step === 'success' && (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Password Changed!</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Your password has been updated successfully. You can now sign in with your new password.</p>
                </div>
                <button
                  onClick={() => router.push('/login')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-500 hover:to-blue-600"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>Go to Login</span>
                </button>
              </div>
            )}
          </div>

          {/* Back to login */}
          {step !== 'success' && (
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-200 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign in
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-slate-400">
            © {currentYear} movesure.io. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
