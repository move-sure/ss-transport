'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, UserPlus, Users, Building2, Loader2, Check } from 'lucide-react';
import supabase from '@/app/utils/supabase';

export default function ImportFromExisting({ 
  isOpen, 
  onClose, 
  onImport 
}) {
  const [activeTab, setActiveTab] = useState('consignor');
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [existingProfiles, setExistingProfiles] = useState([]);

  // Fetch existing profiles to check duplicates
  const fetchExistingProfiles = useCallback(async () => {
    try {
      const { data: profiles } = await supabase
        .from('bill_company_profile')
        .select('company_name, gst_num');
      setExistingProfiles(profiles || []);
    } catch (err) {
      console.error('Error fetching existing profiles:', err);
    }
  }, []);

  // Search consignors/consignees
  const searchData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    
    try {
      const table = activeTab === 'consignor' ? 'consignors' : 'consignees';
      let query = supabase
        .from(table)
        .select('*')
        .order('company_name');

      if (searchTerm) {
        query = query.or(`company_name.ilike.%${searchTerm}%,gst_num.ilike.%${searchTerm}%,number.ilike.%${searchTerm}%`);
      }

      const { data: results, error } = await query.limit(50);

      if (error) throw error;
      setData(results || []);
    } catch (err) {
      console.error('Error searching:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchExistingProfiles();
      searchData();
    }
  }, [isOpen, fetchExistingProfiles, searchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) searchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, activeTab, searchData, isOpen]);

  const isAlreadyImported = (item) => {
    return existingProfiles.some(p => 
      p.company_name?.toLowerCase() === item.company_name?.toLowerCase() ||
      (p.gst_num && item.gst_num && p.gst_num === item.gst_num)
    );
  };

  const handleImport = (item) => {
    onImport({
      ...item,
      import_type: activeTab.toUpperCase()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Users className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Import from Existing</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('consignor')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'consignor' 
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-4 w-4" />
              Consignors
            </div>
          </button>
          <button
            onClick={() => setActiveTab('consignee')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'consignee' 
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="h-4 w-4" />
              Consignees
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}s by name, GST, or mobile...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[calc(85vh-220px)] p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No {activeTab}s found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.map((item) => {
                const alreadyImported = isAlreadyImported(item);
                
                return (
                  <div 
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      alreadyImported 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{item.company_name}</span>
                        {alreadyImported && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            <Check className="h-3 w-3" />
                            Imported
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                        {item.number && <span>📞 {item.number}</span>}
                        {item.gst_num && <span>GST: {item.gst_num}</span>}
                      </div>
                      {item.company_add && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate">{item.company_add}</div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleImport(item)}
                      disabled={alreadyImported}
                      className={`ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        alreadyImported
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <UserPlus className="h-4 w-4" />
                      {alreadyImported ? 'Added' : 'Import'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
