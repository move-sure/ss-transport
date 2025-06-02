'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import bcrypt from 'bcryptjs';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading, initialized } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
      ip_address: '127.0.0.1', // You might want to get real IP in production
      user_agent: navigator.userAgent
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validation
      if (!formData.username.trim()) {
        throw new Error('Username is required');
      }
      if (!formData.password) {
        throw new Error('Password is required');
      }

      console.log('Starting login process for username:', formData.username);

      // Get user from database
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

      // Verify password
      const passwordMatch = await bcrypt.compare(formData.password, userData.password_hash);
      if (!passwordMatch) {
        console.log('Password verification failed');
        throw new Error('Invalid username or password');
      }

      console.log('Password verified successfully');

      // Create session record
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

      // Create token with 24 hour expiry
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

      // Call login function from auth context
      const loginSuccess = await login(userData, tokenData, sessionData);

      if (!loginSuccess) {
        throw new Error('Login failed');
      }

      console.log('Login successful, redirecting to dashboard');

      // Wait a bit for state to update before redirecting
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);

    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while auth is initializing
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <span className="text-sm text-gray-600">Dont have an account? </span>
              <button
                onClick={() => router.push('/register')}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Register here
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}