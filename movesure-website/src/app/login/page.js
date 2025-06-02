'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import bcrypt from 'bcryptjs';
import { 
  Truck, 
  User, 
  Lock, 
  ArrowRight, 
  Shield, 
  CheckCircle, 
  Eye, 
  EyeOff,
  MapPin,
  Clock
} from 'lucide-react';

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

  useEffect(() => {
    if (initialized && !loading && isAuthenticated) {
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

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', formData.username.trim())
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        throw new Error('Invalid username or password');
      }

      const passwordMatch = await bcrypt.compare(formData.password, userData.password_hash);
      if (!passwordMatch) {
        throw new Error('Invalid username or password');
      }

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
        throw new Error('Failed to create session');
      }

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
        throw new Error('Failed to create authentication token');
      }

      const loginSuccess = await login(userData, tokenData, sessionData);

      if (!loginSuccess) {
        throw new Error('Login failed');
      }

      setIsRedirecting(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);

    } catch (error) {
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <Truck className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-600" />
          </div>
          <p className="mt-4 text-gray-900 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto"></div>
            <CheckCircle className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-green-600" />
          </div>
          <p className="mt-4 text-gray-900 font-medium">Redirecting to Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Truck className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Movesure</span>
              <span className="text-sm text-blue-600 font-medium">.io</span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Left Side - Features */}
        <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col justify-center items-center p-12 text-white">
          <div className="max-w-md text-center">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20 mb-8">
              <Truck className="w-16 h-16 text-white mx-auto" />
            </div>
            
            <h1 className="text-4xl font-bold mb-4">
              Welcome to Movesure
            </h1>
            
            <p className="text-xl text-blue-100 mb-8">
              Indias leading transport management system
            </p>
            
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
                <span className="text-white">Secure & Encrypted</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                <MapPin className="w-6 h-6 text-white" />
                <span className="text-white">Real-time Tracking</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
                <span className="text-white">24/7 Operations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <div className="bg-blue-600 p-4 rounded-xl mb-4 inline-block">
                <Truck className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Movesure.io</h1>
              <p className="text-gray-600">Transport Management System</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                <p className="text-gray-600">Sign in to access your dashboard</p>
              </div>

              <div className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-700 font-medium">{error}</span>
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
                        className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
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
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-12 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span className="text-white font-semibold">Signing In...</span>
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

            <div className="text-center mt-8 text-gray-500 text-sm">
              <p>© 2025 Movesure.io. All rights reserved.</p>
              <p className="mt-1">Secure transport management for India</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}