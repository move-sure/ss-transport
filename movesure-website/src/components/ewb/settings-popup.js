'use client';

import React, { useState, useEffect } from 'react';
import { 
  fetchAuthTokens, 
  fetchEwbTokens, 
  getTokenStatistics,
  getTokenSettingsData 
} from './token-helper';
import { 
  X, 
  Key, 
  Shield, 
  Eye, 
  EyeOff, 
  Copy, 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export default function SettingsPopup({ isOpen, onClose, initialTab = 'auth' }) {
  const [loading, setLoading] = useState(true);
  const [authTokens, setAuthTokens] = useState([]);
  const [ewbTokens, setEwbTokens] = useState([]);
  const [statistics, setStatistics] = useState(null);  const [activeTab, setActiveTab] = useState(initialTab);
  const [showTokens, setShowTokens] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadTokenData();
    }
  }, [isOpen, initialTab]);
  const loadTokenData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the comprehensive helper function
      const result = await getTokenSettingsData();

      if (result.success) {
        setAuthTokens(result.data.authTokens || []);
        setEwbTokens(result.data.ewbTokens || []);
        setStatistics(result.data.statistics);
        
        // Check for any specific errors
        if (result.data.errors.auth || result.data.errors.ewb || result.data.errors.stats) {
          console.warn('Some token data could not be loaded:', result.data.errors);
        }
      } else {
        console.error('Failed to fetch token settings data:', result.error);
        setError(result.error);
      }

    } catch (error) {
      console.error('Error loading token data:', error);
      setError('Failed to load token data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTokenData();
    setRefreshing(false);
  };

  const toggleTokenVisibility = (tokenId) => {
    setShowTokens(prev => ({
      ...prev,
      [tokenId]: !prev[tokenId]
    }));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getTokenStatus = (token) => {
    if (!token.is_active) return 'inactive';
    if (token.expires_at && new Date(token.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'expired': return <XCircle className="h-4 w-4" />;
      case 'inactive': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const renderTokenCard = (token, type) => {
    const status = getTokenStatus(token);
    const isVisible = showTokens[token.id];

    return (
      <div key={token.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${type === 'auth' ? 'bg-blue-100' : 'bg-purple-100'}`}>
              {type === 'auth' ? <Shield className="h-4 w-4 text-blue-600" /> : <Key className="h-4 w-4 text-purple-600" />}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                {type === 'auth' ? 'Auth Token' : 'EWB Token'}
              </h4>
              <p className="text-xs text-gray-600">GSTIN: {token.gstin}</p>
            </div>
          </div>
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {getStatusIcon(status)}
            <span className="capitalize">{status}</span>
          </div>
        </div>

        <div className="space-y-2">
          {/* Access Token */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Access Token</label>
            <div className="flex items-center space-x-1">
              <div className="flex-1 bg-gray-50 rounded p-2 text-xs font-mono break-all">
                {isVisible ? token.access_token : '•'.repeat(20)}
              </div>
              <button
                onClick={() => toggleTokenVisibility(token.id)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={isVisible ? 'Hide token' : 'Show token'}
              >
                {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
              <button
                onClick={() => copyToClipboard(token.access_token)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy token"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Token Details Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <div>
              <span className="text-xs text-gray-500">Environment</span>
              <div className="flex items-center space-x-1">
                <Server className="h-3 w-3" />
                <span className="text-xs font-medium capitalize">{token.environment || 'sandbox'}</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Expires At</span>
              <p className="text-xs font-medium">{formatDate(token.expires_at)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Created</span>
              <p className="text-xs font-medium">{formatDate(token.created_at)}</p>
            </div>
            {token.usage_count !== undefined && (
              <div>
                <span className="text-xs text-gray-500">Usage</span>
                <p className="text-xs font-medium">{token.usage_count || 0}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">EWB Token Settings</h2>
              <p className="text-sm text-gray-600">Manage authentication and EWB tokens</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Error Display */}
          {error && (
            <div className="m-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          {statistics && (
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Auth Tokens</p>
                      <p className="text-xl font-bold text-gray-900">{statistics.authTokens.total}</p>
                      <p className="text-xs text-green-600">{statistics.authTokens.active} active</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Key className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">EWB Tokens</p>
                      <p className="text-xl font-bold text-gray-900">{statistics.ewbTokens.total}</p>
                      <p className="text-xs text-green-600">{statistics.ewbTokens.active} active</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Production</p>
                      <p className="text-xl font-bold text-gray-900">
                        {statistics.authTokens.production + statistics.ewbTokens.production}
                      </p>
                      <p className="text-xs text-gray-500">live tokens</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Server className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Sandbox</p>
                      <p className="text-xl font-bold text-gray-900">
                        {statistics.authTokens.sandbox + statistics.ewbTokens.sandbox}
                      </p>
                      <p className="text-xs text-gray-500">test tokens</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('auth')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'auth'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Auth Tokens ({authTokens.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('ewb')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'ewb'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>EWB Tokens ({ewbTokens.length})</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tokens...</p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'auth' && (
                  <div>
                    {authTokens.length === 0 ? (
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Authentication Tokens</h3>
                        <p className="text-gray-600">No authentication tokens found in the database.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {authTokens.map(token => renderTokenCard(token, 'auth'))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'ewb' && (
                  <div>
                    {ewbTokens.length === 0 ? (
                      <div className="text-center py-8">
                        <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No EWB Tokens</h3>
                        <p className="text-gray-600">No EWB tokens found in the database.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {ewbTokens.map(token => renderTokenCard(token, 'ewb'))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
