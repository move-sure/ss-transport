'use client';

import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../../app/utils/supabase';
import { useAuth } from '../utils/auth';
import Navbar from '@/components/dashboard/navbar';
import TrackingSearch from '@/components/tracking/tracking-search';
import BiltyDetailsDisplay from '@/components/tracking/bilty-details-display';
import Link from 'next/link';
import { History, Clock, AlertTriangle, Search, CheckCircle2, Eye, Package } from 'lucide-react';

export default function TrackingPage() {
  const { user } = useAuth();
  const [selectedBilty, setSelectedBilty] = useState(null);
  const [transitDetails, setTransitDetails] = useState(null);
  const [challanDetails, setChallanDetails] = useState(null);
  const [truck, setTruck] = useState(null);
  const [driver, setDriver] = useState(null);
  const [owner, setOwner] = useState(null);
  const [createdByUser, setCreatedByUser] = useState(null);
  const [searchRecord, setSearchRecord] = useState(null);
  const [searchLogs, setSearchLogs] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kaatDetails, setKaatDetails] = useState(null);
  const [transportInfo, setTransportInfo] = useState(null);

  useEffect(() => {
    if (user) {
      setLoading(false);
      fetchRecentSearches();
    }
  }, [user]);

  const fetchRecentSearches = async () => {
    setRecentLoading(true);
    try {
      const { data, error } = await supabase
        .from('search_tracking_master')
        .select('*')
        .order('last_searched_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      // Batch resolve user details
      if (data && data.length > 0) {
        const userIds = [...new Set(
          data.flatMap(r => [r.last_searched_by, r.first_searched_by]).filter(Boolean)
        )];
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name, username, post')
            .in('id', userIds);
          const usersMap = Object.fromEntries((usersData || []).map(u => [u.id, u]));
          data.forEach(r => {
            r.last_user = usersMap[r.last_searched_by] || null;
            r.first_user = usersMap[r.first_searched_by] || null;
          });
        }
      }
      setRecentSearches(data || []);
    } catch (err) {
      console.error('Error fetching recent searches:', err);
    } finally {
      setRecentLoading(false);
    }
  };

  const handleRecentClick = async (grNo) => {
    try {
      // Try RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc('search_all_bilties', {
        p_search_term: grNo,
        p_limit: 1,
        p_offset: 0
      });
      if (!rpcError && rpcData && rpcData.length > 0) {
        handleSelectBilty(rpcData[0]);
        return;
      }
      // Fallback: try bilty table
      const { data: biltyData } = await supabase
        .from('bilty')
        .select('*')
        .eq('gr_no', grNo)
        .single();
      if (biltyData) {
        handleSelectBilty({ ...biltyData, source_type: 'REG', weight: biltyData.wt });
        return;
      }
      // Fallback: try station
      const { data: stationData } = await supabase
        .from('station_bilty_summary')
        .select('*')
        .eq('gr_no', grNo)
        .single();
      if (stationData) {
        handleSelectBilty({
          ...stationData,
          source_type: 'MNL',
          consignor_name: stationData.consignor,
          consignee_name: stationData.consignee,
          no_of_pkg: stationData.no_of_packets,
          total: stationData.amount,
          payment_mode: stationData.payment_status,
          bilty_date: stationData.created_at,
          saving_option: 'SAVE',
          contain: stationData.contents,
          weight: stationData.weight
        });
      }
    } catch (err) {
      console.error('Error loading recent bilty:', err);
    }
  };

  const handleSelectBilty = useCallback(async (bilty) => {
    setSelectedBilty(bilty);
    setChallanDetails(null);
    setTruck(null);
    setDriver(null);
    setOwner(null);
    setCreatedByUser(null);
    setSearchRecord(null);
    setSearchLogs([]);
    setKaatDetails(null);
    setTransportInfo(null);
    
    try {
      // Fire independent fetches in parallel - tracking RPC uses .catch so it won't break other fetches
      const [transitResult, userResult, trackingResult, kaatResult] = await Promise.all([
        supabase
          .from('transit_details')
          .select('*')
          .eq('gr_no', bilty.gr_no)
          .single(),
        bilty.staff_id
          ? supabase
              .from('users')
              .select('id, username, name, post, image_url')
              .eq('id', bilty.staff_id)
              .single()
          : Promise.resolve({ data: null }),
        // Upsert search tracking - wrapped in async IIFE so failure doesn't break other fetches
        user
          ? (async () => {
              try {
                return await supabase.rpc('upsert_search_tracking', {
                  p_gr_no: bilty.gr_no,
                  p_user_id: user.id,
                  p_source_type: bilty.source_type || 'REG'
                });
              } catch (err) {
                console.error('Search tracking RPC error:', err);
                return { data: null };
              }
            })()
          : Promise.resolve({ data: null }),
        // Fetch bilty_wise_kaat for this GR
        (async () => {
          try {
            return await supabase
              .from('bilty_wise_kaat')
              .select('*')
              .eq('gr_no', bilty.gr_no)
              .single();
          } catch (err) {
            return { data: null };
          }
        })()
      ]);

      const transitData = transitResult.data || null;
      setTransitDetails(transitData);
      setCreatedByUser(userResult.data || null);

      // Process bilty_wise_kaat details
      const kaatData = kaatResult?.data || null;
      if (kaatData) {
        const kaatFetches = [];
        if (kaatData.transport_hub_rate_id) {
          kaatFetches.push(
            supabase.from('transport_hub_rates').select('*').eq('id', kaatData.transport_hub_rate_id).single()
              .then(r => ({ type: 'hubRate', data: r.data }))
          );
        }
        if (kaatData.destination_city_id) {
          kaatFetches.push(
            supabase.from('cities').select('id, city_name, city_code').eq('id', kaatData.destination_city_id).single()
              .then(r => ({ type: 'city', data: r.data }))
          );
        }
        if (kaatData.transport_id) {
          kaatFetches.push(
            supabase.from('transports').select('id, name').eq('id', kaatData.transport_id).single()
              .then(r => ({ type: 'transport', data: r.data }))
          );
        }
        if (kaatFetches.length > 0) {
          const kaatResults = await Promise.all(kaatFetches);
          kaatResults.forEach(r => {
            if (r.type === 'hubRate') kaatData.hubRate = r.data || null;
            if (r.type === 'city') kaatData.destinationCity = r.data?.city_name || null;
            if (r.type === 'transport') kaatData.transportName = r.data?.name || null;
          });
        }
        setKaatDetails(kaatData);
      }

      // Fetch transport details + transport_admin if transport_id exists
      if (bilty.transport_id) {
        try {
          const { data: tData } = await supabase
            .from('transports')
            .select('*')
            .eq('id', bilty.transport_id)
            .single();
          if (tData) {
            let adminData = null;
            if (tData.transport_admin_id) {
              const { data: aData } = await supabase
                .from('transport_admin')
                .select('*')
                .eq('transport_id', tData.transport_admin_id)
                .single();
              adminData = aData || null;
            }
            setTransportInfo({ ...tData, admin: adminData });
          }
        } catch (e) { /* no transport record */ }
      }

      // Set search tracking record (with fallback direct fetch if RPC returned nothing)
      let masterRecord = null;
      if (trackingResult.data && trackingResult.data.length > 0) {
        masterRecord = trackingResult.data[0];
      } else {
        // Fallback: fetch directly from search_tracking_master
        try {
          const { data: directData } = await supabase
            .from('search_tracking_master')
            .select('*')
            .eq('gr_no', bilty.gr_no)
            .single();
          if (directData) masterRecord = directData;
        } catch (e) { /* no record yet, that's fine */ }
      }

      // Resolve complaint/resolved user names on the master record
      if (masterRecord) {
        const trackingUserIds = [...new Set(
          [masterRecord.complaint_registered_by, masterRecord.resolved_by, masterRecord.first_searched_by, masterRecord.last_searched_by].filter(Boolean)
        )];
        if (trackingUserIds.length > 0) {
          const { data: tUsers } = await supabase
            .from('users')
            .select('id, name, username, post')
            .in('id', trackingUserIds);
          const tMap = Object.fromEntries((tUsers || []).map(u => [u.id, u]));
          masterRecord.complaint_user = tMap[masterRecord.complaint_registered_by] || null;
          masterRecord.resolved_user = tMap[masterRecord.resolved_by] || null;
          masterRecord.first_user = tMap[masterRecord.first_searched_by] || null;
          masterRecord.last_user = tMap[masterRecord.last_searched_by] || null;
        }
        setSearchRecord(masterRecord);
      }

      // Fetch search logs for this GR No (plain select + batch user lookup)
      try {
        const { data: logsData } = await supabase
          .from('search_tracking_log')
          .select('*')
          .eq('gr_no', bilty.gr_no)
          .order('searched_at', { ascending: false })
          .limit(50);
        if (logsData && logsData.length > 0) {
          const logUserIds = [...new Set(logsData.map(l => l.searched_by).filter(Boolean))];
          if (logUserIds.length > 0) {
            const { data: logUsersData } = await supabase
              .from('users')
              .select('id, name, username, post')
              .in('id', logUserIds);
            const logUsersMap = Object.fromEntries((logUsersData || []).map(u => [u.id, u]));
            logsData.forEach(l => { l.users = logUsersMap[l.searched_by] || null; });
          }
        }
        setSearchLogs(logsData || []);
      } catch (logErr) {
        console.error('Error fetching search logs:', logErr);
        setSearchLogs([]);
      }

      if (transitData && transitData.challan_no) {
        const { data: challanData, error: challanError } = await supabase
          .from('challan_details')
          .select('*')
          .eq('challan_no', transitData.challan_no)
          .single();

        if (!challanError && challanData) {
          setChallanDetails(challanData);

          const fetchPromises = [];
          if (challanData.truck_id) {
            fetchPromises.push(
              supabase
                .from('trucks')
                .select('*')
                .eq('id', challanData.truck_id)
                .single()
                .then(result => ({ type: 'truck', data: result.data }))
            );
          }
          if (challanData.driver_id) {
            fetchPromises.push(
              supabase
                .from('staff')
                .select('*')
                .eq('id', challanData.driver_id)
                .single()
                .then(result => ({ type: 'driver', data: result.data }))
            );
          }
          if (challanData.owner_id) {
            fetchPromises.push(
              supabase
                .from('staff')
                .select('*')
                .eq('id', challanData.owner_id)
                .single()
                .then(result => ({ type: 'owner', data: result.data }))
            );
          }

          if (fetchPromises.length > 0) {
            const results = await Promise.all(fetchPromises);
            results.forEach(result => {
              if (result.type === 'truck') setTruck(result.data || null);
              if (result.type === 'driver') setDriver(result.data || null);
              if (result.type === 'owner') setOwner(result.data || null);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching bilty details:', error);
    }
  }, [user]);

  const handleBiltyUpdate = useCallback((updatedBilty) => {
    setSelectedBilty(updatedBilty);
  }, []);

  const handleSearchRecordUpdate = useCallback((updatedRecord) => {
    setSearchRecord(updatedRecord);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading tracking system...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      <div className="p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📦 Bilty Tracking</h1>
            <p className="text-gray-600">Search and track bilty details</p>
          </div>
          <Link
            href="/tracking/tracking-history"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition shadow-sm"
          >
            <History className="w-4 h-4" />
            Search History
          </Link>
        </div>

        {/* Search Section */}
        <div className="mb-6">
          <TrackingSearch
            onSelectBilty={handleSelectBilty}
            user={user}
          />
        </div>

        {/* Details Section OR Recent Searches */}
        <div>
          {selectedBilty ? (
            <BiltyDetailsDisplay
              bilty={selectedBilty}
              transitDetails={transitDetails}
              createdByUser={createdByUser}
              onBiltyUpdate={handleBiltyUpdate}
              challanDetails={challanDetails}
              truck={truck}
              driver={driver}
              owner={owner}
              searchRecord={searchRecord}
              searchLogs={searchLogs}
              onSearchRecordUpdate={handleSearchRecordUpdate}
              user={user}
              kaatDetails={kaatDetails}
              transportInfo={transportInfo}
            />
          ) : (
            /* Recent Searches - shown when no bilty selected */
            <div className="bg-white/95 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold">Recent Searches</h3>
                </div>
                <Link href="/tracking/tracking-history" className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded font-semibold transition">
                  View All →
                </Link>
              </div>

              {recentLoading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-400 text-xs">Loading recent searches...</p>
                </div>
              ) : recentSearches.length === 0 ? (
                <div className="p-8 text-center">
                  <Search className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm font-semibold">No recent searches</p>
                  <p className="text-gray-400 text-xs mt-1">Search a GR No above to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentSearches.map((rec) => (
                    <button
                      key={rec.id}
                      onClick={() => handleRecentClick(rec.gr_no)}
                      className={`w-full px-4 py-3 flex items-center gap-3 transition text-left group ${
                        rec.is_resolved
                          ? 'bg-emerald-50 hover:bg-emerald-100'
                          : rec.in_investigation
                            ? 'bg-amber-50 hover:bg-amber-100'
                            : rec.is_complaint
                              ? 'bg-red-50 hover:bg-red-100'
                              : 'bg-white hover:bg-indigo-50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        rec.is_complaint
                          ? rec.is_resolved ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                          : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {rec.is_complaint
                          ? rec.is_resolved ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />
                          : <Package className="w-4 h-4" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-indigo-700 group-hover:underline">{rec.gr_no}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                            rec.source_type === 'MNL' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {rec.source_type === 'MNL' ? 'MNL' : 'REG'}
                          </span>
                          {rec.search_count > 1 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                              rec.search_count > 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {rec.search_count}× searched
                            </span>
                          )}
                          {rec.is_complaint && !rec.is_resolved && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">🚨 Complaint</span>
                          )}
                          {rec.is_resolved && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold">✅ Resolved</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Last searched {new Date(rec.last_searched_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {rec.last_user && <span> by <span className="font-semibold text-gray-500">{rec.last_user.name || rec.last_user.username}</span></span>}
                        </div>
                      </div>
                      <Eye className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
