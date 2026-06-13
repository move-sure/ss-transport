'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import bcrypt from 'bcryptjs';
import { Truck, User, Lock, ArrowRight, Eye, EyeOff, PartyPopper, Cake, Sparkles, CheckCircle2, FileText, Package, Weight } from 'lucide-react';

const CONFETTI_COLORS = ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa', '#fb7185'];
const CONFETTI_EMOJIS = ['🎉', '🎊', '✨', '⭐', '🎈'];

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading, initialized } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const platformStats = [
    { Icon: FileText, label: 'Total Records', value: '30,410', breakdown: 'Bilty: 11,630 + Manual Bilty: 18,790' },
    { Icon: Package, label: 'Total Packages', value: '135,260', breakdown: 'Bilty: 69,530 + Manual Bilty: 65,730' },
    { Icon: Weight, label: 'Total Weight', value: '6,310 tons', breakdown: 'Bilty: 2,730 tons + Manual Bilty: 3,580 tons' }
  ];

  const currentYear = new Date().getFullYear();

  // Party-popper confetti burst shown over the "magical" success screen after a successful login
  const successConfetti = useMemo(() => Array.from({ length: 40 }).map((_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 260;
    return {
      id: i,
      tx: `${Math.cos(angle) * distance}px`,
      ty: `${Math.sin(angle) * distance}px`,
      rot: `${(Math.random() - 0.5) * 720}deg`,
      delay: Math.random() * 0.5,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: i % 2 === 0,
      emoji: i % 5 === 0 ? CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length] : null,
    };
  }), []);

  // Redirect if already authenticated
  useEffect(() => {
    if (initialized && !loading && isAuthenticated) {
      console.log('Already authenticated, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [initialized, loading, isAuthenticated, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent || '';
    // Detect device type
    let device_type = 'Desktop';
    if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) device_type = 'Mobile';
    else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) device_type = 'Tablet';

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('Edg/')) { const m = ua.match(/Edg\/(\S+)/); browser = 'Edge ' + (m?.[1] || ''); }
    else if (ua.includes('OPR/') || ua.includes('Opera')) { const m = ua.match(/(?:OPR|Opera)\/(\S+)/); browser = 'Opera ' + (m?.[1] || ''); }
    else if (ua.includes('Chrome/') && !ua.includes('Edg')) { const m = ua.match(/Chrome\/(\S+)/); browser = 'Chrome ' + (m?.[1] || ''); }
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) { const m = ua.match(/Version\/(\S+)/); browser = 'Safari ' + (m?.[1] || ''); }
    else if (ua.includes('Firefox/')) { const m = ua.match(/Firefox\/(\S+)/); browser = 'Firefox ' + (m?.[1] || ''); }

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
    else if (ua.includes('Windows NT')) os = 'Windows';
    else if (/Mac OS X/.test(ua)) { const m = ua.match(/Mac OS X ([\d_]+)/); os = 'macOS ' + (m?.[1]?.replace(/_/g, '.') || ''); }
    else if (/Android ([\d.]+)/.test(ua)) { const m = ua.match(/Android ([\d.]+)/); os = 'Android ' + (m?.[1] || ''); }
    else if (/iPhone OS ([\d_]+)/.test(ua)) { const m = ua.match(/iPhone OS ([\d_]+)/); os = 'iOS ' + (m?.[1]?.replace(/_/g, '.') || ''); }
    else if (ua.includes('Linux')) os = 'Linux';

    // Screen info
    const screen_resolution = `${screen.width}x${screen.height}`;
    const viewport = `${window.innerWidth}x${window.innerHeight}`;
    const language = navigator.language || navigator.languages?.[0] || 'unknown';
    const platform = navigator.platform || 'unknown';

    return { device_type, browser, os, screen_resolution, viewport, language, platform, raw_user_agent: ua };
  };

  const getClientInfo = async () => {
    const deviceInfo = getDeviceInfo();
    let ip_address = '0.0.0.0';
    let latitude = null;
    let longitude = null;
    let city = null;
    let region = null;
    let country = null;
    let isp = null;

    // Fetch real IP + geo from free API (non-blocking, with timeout)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const geo = await res.json();
        ip_address = geo.ip || ip_address;
        latitude = geo.latitude || null;
        longitude = geo.longitude || null;
        city = geo.city || null;
        region = geo.region || null;
        country = geo.country_name || null;
        isp = geo.org || null;
      }
    } catch (e) {
      console.warn('IP/Geo lookup failed, using defaults');
    }

    // Try browser geolocation for more accurate lat/long (non-blocking)
    try {
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, maximumAge: 60000 });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }
    } catch (e) {
      // User denied or timeout — keep IP-based lat/long
    }

    const user_agent_json = JSON.stringify({
      ...deviceInfo,
      latitude,
      longitude,
      city,
      region,
      country,
      isp,
      login_at: new Date().toISOString()
    });

    return { ip_address, user_agent: user_agent_json };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!formData.username.trim()) {
        throw new Error('Username is required');
      }
      if (!formData.password) {
        throw new Error('Password is required');
      }

      console.log('Starting login process for username:', formData.username);

      const normalizedUsername = formData.username.trim().toLowerCase();
      const trimmedPassword = formData.password.trim();

      // Start fetching client info early (runs in parallel with auth queries)
      const clientInfoPromise = getClientInfo();

      // Generic retry wrapper for any Supabase operation
      const withRetry = async (operation, label = 'operation', retries = 2) => {
        for (let i = 0; i <= retries; i++) {
          try {
            const result = await operation();
            if (result.error) {
              console.error(`${label} error (attempt ${i + 1}/${retries + 1}):`, JSON.stringify(result.error));
              if (i === retries) return result;
              await new Promise(r => setTimeout(r, 1000 * (i + 1))); // progressive backoff
              continue;
            }
            return result;
          } catch (networkErr) {
            console.error(`${label} network error (attempt ${i + 1}/${retries + 1}):`, networkErr?.message || networkErr);
            if (i === retries) return { data: null, error: networkErr };
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          }
        }
        return { data: null, error: new Error(`${label} failed after retries`) };
      };

      // Fetch user with retry — also retry when data comes back empty (transient Supabase issue)
      let users = null;
      let userError = null;
      for (let attempt = 0; attempt <= 2; attempt++) {
        const result = await withRetry(
          () => supabase
            .from('users')
            .select('*')
            .ilike('username', normalizedUsername)
            .eq('is_active', true)
            .limit(1),
          'User query'
        );
        users = result.data;
        userError = result.error;

        if (userError) break; // real error, stop
        if (users && users.length > 0) break; // found user, stop

        // Empty data with no error — possible transient issue, retry once more
        if (attempt < 2) {
          console.warn(`User query returned empty (attempt ${attempt + 1}), retrying...`);
          await new Promise(r => setTimeout(r, 800));
        }
      }

      if (userError) {
        console.error('User fetch error details:', JSON.stringify(userError));
        console.error('Error type:', typeof userError);
        console.error('Error message:', userError?.message);
        console.error('Error code:', userError?.code);
        
        // Show specific message based on error type
        const errMsg = userError?.message || '';
        if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('Failed') || errMsg.includes('CORS') || userError?.code === 'PGRST') {
          throw new Error('Connection failed. Please check your internet and try again.');
        }
        throw new Error('Something went wrong. Please try again.');
      }

      if (!users || users.length === 0) {
        console.error('No user found for username:', normalizedUsername);
        throw new Error('Invalid username or password');
      }

      const userData = users[0];
      console.log('User found:', userData.username);

      const passwordMatch = await bcrypt.compare(trimmedPassword, userData.password_hash);
      if (!passwordMatch) {
        console.log('Password verification failed');
        throw new Error('Invalid username or password');
      }

      console.log('Password verified successfully');

      // Await the client info that was started in parallel earlier
      const clientInfo = await clientInfoPromise;

      // Create session with retry
      const { data: sessionData, error: sessionError } = await withRetry(
        () => supabase
          .from('user_sessions')
          .insert([
            {
              user_id: userData.id,
              login_time: new Date().toISOString(),
              ip_address: clientInfo.ip_address,
              user_agent: clientInfo.user_agent,
              is_active: true
            }
          ])
          .select()
          .single(),
        'Session creation'
      );

      if (sessionError) {
        console.error('Session creation error after retries:', sessionError);
        throw new Error('Failed to create session. Please try again.');
      }

      console.log('Session created:', sessionData);

      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);

      const tokenString = `${userData.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create token with retry
      const { data: tokenData, error: tokenError } = await withRetry(
        () => supabase
          .from('user_tokens')
          .insert([
            {
              user_id: userData.id,
              token: tokenString,
              expires_at: tokenExpiry.toISOString(),
              is_revoked: false
            }
          ])
          .select()
          .single(),
        'Token creation'
      );

      if (tokenError) {
        console.error('Token creation error after retries:', tokenError);
        throw new Error('Failed to create authentication token. Please try again.');
      }

      console.log('Token created:', tokenData);

      const loginSuccess = await login(userData, tokenData, sessionData);

      if (!loginSuccess) {
        throw new Error('Login failed');
      }

      console.log('Login successful, redirecting to dashboard');
      setIsRedirecting(true);
      sessionStorage.setItem('movesure_celebrate_login', '1');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1800);

    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialized || loading) {
    return (
      <div className="h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500/40 border-t-blue-400"></div>
          <Truck className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-blue-200" />
        </div>
        <p className="mt-4 text-base font-semibold text-blue-100">Loading...</p>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="relative h-[100dvh] overflow-hidden bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-950 to-black opacity-90"></div>
          <div className="absolute -left-20 top-0 h-[28rem] w-[28rem] animate-blob rounded-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.32),_transparent_65%)] blur-3xl"></div>
          <div className="absolute right-0 top-32 h-[26rem] w-[26rem] translate-x-24 animate-blob rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.3),_transparent_60%)] blur-3xl" style={{ animationDelay: '-5s' }}></div>
          <div className="absolute bottom-0 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 translate-y-1/3 animate-blob rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(251,191,36,0.22),_transparent_70%)] blur-3xl" style={{ animationDelay: '-9s' }}></div>
        </div>

        {/* Party popper confetti burst */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {successConfetti.map((p) => (
            p.emoji ? (
              <span
                key={p.id}
                className="absolute left-1/2 top-1/2 block animate-confetti-burst text-xl"
                style={{
                  animationDelay: `${p.delay}s`,
                  '--tx': p.tx,
                  '--ty': p.ty,
                  '--rot': p.rot,
                }}
              >
                {p.emoji}
              </span>
            ) : (
              <span
                key={p.id}
                className={`absolute left-1/2 top-1/2 block ${p.round ? 'rounded-full' : 'rounded-sm'} animate-confetti-burst`}
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  animationDelay: `${p.delay}s`,
                  '--tx': p.tx,
                  '--ty': p.ty,
                  '--rot': p.rot,
                }}
              />
            )
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center animate-fade-in-up">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <PartyPopper className="absolute -left-1 bottom-1 h-10 w-10 text-amber-400 animate-popper-shake" style={{ '--popper-rot': '-45deg' }} />
            <PartyPopper className="absolute -right-1 bottom-1 h-10 w-10 text-fuchsia-400 animate-popper-shake" style={{ '--popper-rot': '45deg', '--popper-flip': -1, animationDelay: '0.2s' }} />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 animate-ring-pulse">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="276.5"
                  strokeDashoffset="276.5"
                  className="animate-draw-stroke"
                />
              </svg>
              <CheckCircle2 className="h-9 w-9 text-emerald-400 animate-pop-in" style={{ animationDelay: '0.5s', opacity: 0 }} />
            </div>
          </div>

          <div>
            <h2 className="bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-300 bg-clip-text text-3xl font-bold text-transparent text-shimmer sm:text-4xl">
              Welcome back!
            </h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">Taking you to your dashboard...</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce-dot" style={{ animationDelay: '0s' }}></span>
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce-dot" style={{ animationDelay: '0.15s' }}></span>
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce-dot" style={{ animationDelay: '0.3s' }}></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>
        <div
          className="absolute inset-0 animate-grid-drift opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        ></div>
        <div className="absolute -left-32 top-0 h-[28rem] w-[28rem] animate-blob rounded-full bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_65%)] blur-3xl"></div>
        <div className="absolute bottom-0 right-0 h-[26rem] w-[26rem] animate-blob rounded-full bg-[radial-gradient(circle_at_center,_rgba(245,158,11,0.10),_transparent_65%)] blur-3xl" style={{ animationDelay: '-7s' }}></div>
        <div className="absolute left-1/3 bottom-1/4 h-[20rem] w-[20rem] animate-blob rounded-full bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.08),_transparent_65%)] blur-3xl" style={{ animationDelay: '-3s' }}></div>
      </div>

      {/* Anniversary banner */}
      <div className="relative z-20 shrink-0 overflow-hidden border-b border-amber-400/20 bg-slate-900/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 text-center text-xs font-semibold tracking-wide text-slate-200 sm:text-sm">
          <PartyPopper className="h-4 w-4 shrink-0 animate-float-y text-amber-400" />
          <span>
            <span className="hidden sm:inline">Happy 1st Anniversary, movesure.io! Celebrating one year of seamless logistics &mdash; </span>
            <span className="bg-gradient-to-r from-amber-300 via-fuchsia-300 to-sky-300 bg-clip-text font-bold text-transparent text-shimmer">13th June</span>
            <span className="hidden sm:inline"> &mdash; one year strong! 🎉</span>
            <span className="sm:hidden"> &mdash; 1st Anniversary 🎉</span>
          </span>
          <Cake className="h-4 w-4 shrink-0 animate-float-y text-amber-400" style={{ animationDelay: '0.6s' }} />
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="hidden h-full w-full flex-col justify-center px-10 lg:flex lg:w-1/2 xl:px-14">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <Truck className="h-6 w-6 text-blue-200" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-200">movesure.io</p>
                <p className="text-xs uppercase tracking-[0.45em] text-white/60">Transport Cloud</p>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200 animate-ring-pulse">
                <PartyPopper className="h-3.5 w-3.5" />
                1st Anniversary &bull; 13 June
              </div>
              <h1 className="relative mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
                <span className="bg-gradient-to-r from-amber-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent text-shimmer">Happy 1st Anniversary,</span> movesure.io! 🎂
                <Sparkles className="absolute -right-2 -top-4 h-6 w-6 text-amber-300 animate-sparkle" />
              </h1>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                One incredible year of revolutionizing transport &amp; logistics. Thank you for being part of the journey!
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {platformStats.map(({ Icon, label, value, breakdown }) => (
                <div
                  key={label}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all duration-300 hover:border-amber-400/40 hover:bg-white/10"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-slate-300">{label}</span>
                      <span className="text-xl font-bold text-white sm:text-2xl">{value}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{breakdown}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex h-full w-full items-center justify-center px-6 py-10 sm:px-10 lg:sticky lg:top-0 lg:w-1/2 lg:px-16 lg:py-12">
          <div className="flex w-full max-w-md flex-col gap-8 lg:h-screen lg:justify-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                Secure Login
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                Sign in to orchestrate deliveries, finance, and customer commitments in real time.
              </p>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-amber-400/30 via-blue-500/20 to-amber-400/30 opacity-60 blur-xl"></div>
              <div className="relative rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-white shadow-2xl backdrop-blur-2xl sm:p-10">
              <div className="absolute -top-12 right-8 hidden rounded-full border border-white/10 bg-white/10 p-5 text-white backdrop-blur-xl lg:block">
                <Truck className="h-8 w-8 text-amber-300" />
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-red-300">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-400"></div>
                      <span className="font-medium">{error}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300" htmlFor="username">
                      Username
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        value={formData.username}
                        onChange={handleInputChange}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        className="login-input w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm font-medium text-white placeholder:text-slate-500 shadow-sm outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                        placeholder="Enter your username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300" htmlFor="password">
                      Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        autoComplete="current-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        className="login-input w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm font-medium text-white placeholder:text-slate-500 shadow-sm outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-blue-600 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:from-amber-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-amber-300/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {!isLoading && (
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-button-shine"></span>
                  )}
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900/60 border-t-transparent"></div>
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 flex flex-col gap-4 text-sm text-slate-400">
                <div>
                  Forgot your password?{' '}
                  <button
                    onClick={() => router.push('/login/forgot-password')}
                    className="font-semibold text-amber-300 hover:text-amber-200"
                  >
                    Reset it here
                  </button>
                </div>
                <div>
                  Need help?{' '}
                  <a
                    href="mailto:support@movesure.io"
                    className="font-semibold text-amber-300 hover:text-amber-200"
                  >
                    Contact support
                  </a>
                </div>
                <div>
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => router.push('/register')}
                    className="font-semibold text-amber-300 hover:text-amber-200"
                  >
                    Register here
                  </button>
                </div>
              </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-4 py-2 text-center text-xs text-amber-200/90 sm:justify-start">
              <PartyPopper className="h-4 w-4 shrink-0 text-amber-300" />
              <span>It&apos;s been 1 year since movesure.io launched &mdash; thank you for riding with us!</span>
            </div>

            <div className="mt-auto flex flex-col items-center gap-4 text-center text-xs text-slate-400 sm:flex-row sm:justify-between sm:text-left">
              <div>© {currentYear} movesure.io. All rights reserved.</div>
              <div className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Operational excellence monitored 24/7
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}