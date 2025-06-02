'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from './supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('Initializing auth...');
      
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        setLoading(false);
        setInitialized(true);
        return;
      }

      const userSession = localStorage.getItem('userSession');
      
      if (!userSession) {
        console.log('No user session found');
        setLoading(false);
        setInitialized(true);
        return;
      }

      const session = JSON.parse(userSession);
      console.log('Session data:', session);
      
      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      
      if (now > expiresAt) {
        console.log('Token expired');
        await clearAuth();
        setLoading(false);
        setInitialized(true);
        return;
      }

      // First verify token exists and is not revoked
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('token', session.token)
        .eq('is_revoked', false)
        .single();

      if (tokenError || !tokenData) {
        console.error('Token verification failed:', tokenError);
        await clearAuth();
        setLoading(false);
        setInitialized(true);
        return;
      }

      console.log('Token verified:', tokenData);

      // Then get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', tokenData.user_id)
        .single();

      if (userError || !userData) {
        console.error('User data fetch failed:', userError);
        await clearAuth();
        setLoading(false);
        setInitialized(true);
        return;
      }

      console.log('User data fetched:', userData);

      // Set auth state - important: set all states synchronously
      setUser(userData);
      setToken(session.token);
      setSessionId(session.sessionId);
      setIsAuthenticated(true);
      
      console.log('Auth state set successfully');
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      await clearAuth();
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const login = async (userData, tokenData, sessionData) => {
    try {
      console.log('Login function called with:', { userData, tokenData, sessionData });
      
      const sessionInfo = {
        user: userData,
        token: tokenData.token,
        expiresAt: tokenData.expires_at,
        sessionId: sessionData.id
      };

      console.log('Storing session info:', sessionInfo);

      // Store in localStorage first
      if (typeof window !== 'undefined') {
        localStorage.setItem('userSession', JSON.stringify(sessionInfo));
      }

      // Update state synchronously
      setUser(userData);
      setToken(tokenData.token);
      setSessionId(sessionData.id);
      setIsAuthenticated(true);
      setLoading(false);
      setInitialized(true);

      console.log('Auth state updated after login');

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('Logout initiated');
      
      if (token) {
        // Revoke token
        await supabase
          .from('user_tokens')
          .update({ is_revoked: true })
          .eq('token', token);

        // Update session to inactive and set logout time
        if (sessionId) {
          await supabase
            .from('user_sessions')
            .update({ 
              is_active: false,
              logout_time: new Date().toISOString()
            })
            .eq('id', sessionId);
        }
      }

      await clearAuth();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear auth and redirect
      await clearAuth();
      router.push('/login');
    }
  };

  const clearAuth = async () => {
    console.log('Clearing auth state');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userSession');
    }
    setUser(null);
    setToken(null);
    setSessionId(null);
    setIsAuthenticated(false);
  };

  const updateUser = async (updatedUserData) => {
    try {
      // Update user in database
      const { data, error } = await supabase
        .from('users')
        .update(updatedUserData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setUser(data);

      // Update localStorage
      if (typeof window !== 'undefined') {
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          session.user = data;
          localStorage.setItem('userSession', JSON.stringify(session));
        }
      }

      return data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  const refreshUserData = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUser(data);

      // Update localStorage
      if (typeof window !== 'undefined') {
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          session.user = data;
          localStorage.setItem('userSession', JSON.stringify(session));
        }
      }

      return data;
    } catch (error) {
      console.error('Refresh user data error:', error);
      throw error;
    }
  };

  const checkAuthStatus = () => {
    const status = isAuthenticated && user && token && initialized;
    console.log('Auth status check:', { 
      isAuthenticated, 
      hasUser: !!user, 
      hasToken: !!token, 
      initialized,
      result: status 
    });
    return status;
  };

  const requireAuth = () => {
    const authStatus = checkAuthStatus();
    if (!authStatus && initialized) {
      console.log('Auth required but not authenticated, redirecting to login');
      router.push('/login');
      return false;
    }
    return authStatus;
  };

  // Debug: Log state changes
  useEffect(() => {
    console.log('Auth state changed:', { 
      isAuthenticated, 
      hasUser: !!user, 
      hasToken: !!token, 
      loading,
      initialized,
      userId: user?.id,
      username: user?.username 
    });
  }, [isAuthenticated, user, token, loading, initialized]);

  const value = {
    // State
    user,
    token,
    sessionId,
    loading,
    isAuthenticated,
    initialized,
    
    // Methods
    login,
    logout,
    updateUser,
    refreshUserData,
    checkAuthStatus,
    requireAuth,
    clearAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};