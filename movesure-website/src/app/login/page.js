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

  // Redirect if already authenticated
  useEffect(() => {
    if (initialized && !loading && isAuthenticated) {
      console.log('Already authenticated, redirecting to dashboard');
      setIsRedirecting(true);
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

      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);

    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-black">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-300 border-t-white mx-auto"></div>
            <Truck className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-black" />
          </div>
          <p className="mt-6 text-white text-xl font-semibold">Initializing Movesure.io...</p>
        </div>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-green-300 border-t-white mx-auto"></div>
            <ArrowRight className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="mt-6 text-white text-xl font-semibold">Redirecting to Dashboard...</p>
          <p className="mt-2 text-green-200 text-sm">Welcome back! Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden text-black">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-overlay filter blur-xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex">
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-black">
          <div className="max-w-md text-center">
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm p-6 rounded-2xl border border-white border-opacity-30">
                  <Truck className="w-16 h-16 text-black" />
                </div>
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-400 to-red-500 p-2 rounded-lg">
                  <span className="text-xs font-bold text-white">AI</span>
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold mb-4 text-white">
              movesure.io
            </h1>
            
            <p className="text-xl text-blue-100 mb-8">
              Professional Transport Management System
            </p>
            
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3 bg-white bg-opacity-10 backdrop-blur-sm p-4 rounded-lg">
                <Shield className="w-6 h-6 text-green-400" />
                <span className="text-black">Secure & Encrypted</span>
              </div>
              <div className="flex items-center gap-3 bg-white bg-opacity-10 backdrop-blur-sm p-4 rounded-lg">
                <Globe className="w-6 h-6 text-blue-400" />
                <span className="text-black">Real-time Tracking</span>
              </div>
              <div className="flex items-center gap-3 bg-white bg-opacity-10 backdrop-blur-sm p-4 rounded-lg">
                <Clock className="w-6 h-6 text-purple-400" />
                <span className="text-black">24/7 Operations</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-md">
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-xl border border-white border-opacity-30">
                  <Truck className="w-12 h-12 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white">movesure.io</h1>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
                <p className="text-gray-600">Sign in to access your dashboard</p>
              </div>

              <div className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-black font-medium">{error}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        name="username"
                        type="text"
                        required
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black font-medium placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="Enter your username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        name="password"
                        type="password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black font-medium placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="Enter your password"
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span className="text-white font-semibold">Authenticating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-white font-semibold">Sign In</span>
                      <ArrowRight className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>
              </div>

              <div className="mt-8 text-center">
                <div className="text-gray-600">
                  Dont have an account?{' '}
                  <button
                    onClick={() => router.push('/register')}
                    className="text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-200 underline underline-offset-2"
                  >
                    Register here
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center mt-8 text-white text-sm">
              <p>© 2024 movesure.io. All rights reserved.</p>
              <p className="mt-1">Powered by Advanced AI Technology</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}