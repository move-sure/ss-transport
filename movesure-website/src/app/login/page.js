'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import bcrypt from 'bcryptjs';
import { Truck, User, Lock, ArrowRight, Shield, Globe, Clock } from 'lucide-react';

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

  const featureHighlights = [
    {
      Icon: Shield,
      title: 'Enterprise Security',
      description: 'Role-based controls with encryption across every touchpoint.'
    },
    {
      Icon: Globe,
      title: 'Unified Visibility',
      description: 'Real-time fleet telemetry and exception handling in one place.'
    },
    {
      Icon: Clock,
      title: 'Faster Turnarounds',
      description: 'AI assisted workflows that clear dispatch backlogs 4x quicker.'
    }
  ];

  const quickStats = [
    { value: '12k+', label: 'Monthly Shipments' },
    { value: '98%', label: 'On-time Promise' },
    { value: '250+', label: 'Enterprise Clients' }
  ];

  const currentYear = new Date().getFullYear();

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

  const getClientInfo = () => {
    return {
      ip_address: '127.0.0.1',
      user_agent: navigator.userAgent
    };
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

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', formData.username.trim())
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        console.error('User fetch error:', userError);
        throw new Error('Invalid username or password');
      }

      console.log('User found:', userData.username);

      const passwordMatch = await bcrypt.compare(formData.password, userData.password_hash);
      if (!passwordMatch) {
        console.log('Password verification failed');
        throw new Error('Invalid username or password');
      }

      console.log('Password verified successfully');

      const clientInfo = getClientInfo();
      const { data: sessionData, error: sessionError } = await supabase
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
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw new Error('Failed to create session');
      }

      console.log('Session created:', sessionData);

      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);

      const tokenString = `${userData.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: tokenData, error: tokenError } = await supabase
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
        .single();

      if (tokenError) {
        console.error('Token creation error:', tokenError);
        throw new Error('Failed to create authentication token');
      }

      console.log('Token created:', tokenData);

      const loginSuccess = await login(userData, tokenData, sessionData);

      if (!loginSuccess) {
        throw new Error('Login failed');
      }

      console.log('Login successful, redirecting to dashboard');
      setIsRedirecting(true);
      router.push('/dashboard');

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
      <div className="h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-emerald-500/40 border-t-emerald-400"></div>
          <ArrowRight className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-emerald-300 animate-pulse" />
        </div>
        <p className="mt-4 text-base font-semibold text-emerald-200">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-black opacity-90"></div>
        <div className="absolute -left-20 top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.32),_transparent_65%)] blur-3xl"></div>
        <div className="absolute right-0 top-32 h-[26rem] w-[26rem] translate-x-24 rounded-full bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.3),_transparent_60%)] blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 translate-y-1/3 rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(56,189,248,0.25),_transparent_70%)] blur-3xl"></div>
      </div>

      <div className="relative z-10 flex h-full flex-col lg:flex-row">
        <section className="hidden h-full w-full overflow-y-auto px-10 py-14 lg:flex lg:w-1/2 xl:px-14 xl:py-16">
          <div className="mx-auto flex h-full max-w-xl flex-col justify-center gap-10 pb-16">
            <div className="space-y-8">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                  <Truck className="h-6 w-6 text-blue-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-200">movesure.io</p>
                  <p className="text-xs uppercase tracking-[0.45em] text-white/60">Transport Cloud</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Logistics Intelligence
              </div>
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Access the movesure.io command center
              </h1>
              <p className="mt-4 text-base text-slate-300 sm:text-lg">
                Coordinate fleets, paperwork, and billing from one secure, AI-guided workspace. Built for scale and trusted by fast-moving transport teams.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {featureHighlights.map(({ Icon, title, description }) => (
                  <div
                    key={title}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:bg-white/10"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
                    <p className="mt-1.5 text-sm text-slate-300">{description}</p>
                    <ArrowRight className="absolute -right-8 -top-8 h-14 w-14 text-blue-400/30 transition-transform duration-300 group-hover:translate-x-3 group-hover:-translate-y-3" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm">
              {quickStats.map(({ value, label }) => (
                <div key={label} className="flex flex-col gap-2">
                  <span className="text-2xl font-semibold text-white sm:text-3xl">{value}</span>
                  <span className="text-[0.65rem] uppercase tracking-[0.25em] text-slate-400">{label}</span>
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

            <div className="relative rounded-3xl border border-white/10 bg-white/90 p-8 text-slate-900 shadow-2xl backdrop-blur-xl sm:p-10">
              <div className="absolute -top-12 right-8 hidden rounded-full border border-white/10 bg-white/10 p-5 text-white backdrop-blur-xl lg:block">
                <Truck className="h-8 w-8 text-blue-600" />
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      <span className="font-medium">{error}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-600" htmlFor="username">
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
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        placeholder="Enter your username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-600" htmlFor="password">
                      Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></div>
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

              <div className="mt-8 flex flex-col gap-4 text-sm text-slate-500">
                <div>
                  Need help?{' '}
                  <a
                    href="mailto:support@movesure.io"
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Contact support
                  </a>
                </div>
                <div>
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => router.push('/register')}
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Register here
                  </button>
                </div>
              </div>
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