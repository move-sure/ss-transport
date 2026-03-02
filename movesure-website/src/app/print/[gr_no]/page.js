'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import supabase from '../../../app/utils/supabase';
import {
  AlertCircle, RefreshCw, Globe, Package, MapPin, Phone,
  FileText, Truck, CheckCircle2, Clock, ExternalLink,
  ChevronDown, ChevronUp, Calendar, User, Users, Circle, Heart,
  Weight, Tag, Receipt, Hash, IndianRupee, Warehouse, Navigation,
  PackageCheck, ShieldCheck, ArrowRight, Copy, Check, Info
} from 'lucide-react';
import { LanguageProvider, useLanguage } from '../LanguageContext';
import { format } from 'date-fns';
import Image from 'next/image';

/* ── Brand Palette ── */
const GOLD = '#cca33c';
const GOLD_DARK = '#a6842e';
const GOLD_LIGHT = '#f5ecd5';
const GREEN = '#16a34a';
const GREEN_BG = '#dcfce7';
const BLUE = '#2563eb';

/* ── Helpers ── */
const fmtCurrency = (v) => {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(Number(v) || 0);
};

const fmtDate = (v) => {
  if (!v) return '—';
  try { return format(new Date(v), 'dd MMM yyyy'); }
  catch { return v; }
};

const fmtDateTime = (v) => {
  if (!v) return '';
  try { return format(new Date(v), 'dd MMM yyyy, hh:mm a'); }
  catch { return v; }
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  TRACKING MILESTONE — Vertical Timeline Node                       */
/* ═══════════════════════════════════════════════════════════════════ */
function TrackingMilestone({ stage, isLast }) {
  const done = stage.status === 'completed';
  const active = stage.status === 'current';
  const pending = stage.status === 'pending';
  const showMovingDot = stage.showMovingDot;

  const progressPct = done ? 100 : active ? 50 : 0;

  return (
    <div className="relative flex gap-4">
      {/* Node + connector */}
      <div className="flex flex-col items-center" style={{ minWidth: 44 }}>
        <div
          className="relative z-10 flex shrink-0 items-center justify-center rounded-full transition-all duration-500"
          style={{
            width: active ? 48 : 40,
            height: active ? 48 : 40,
            borderWidth: done ? 3 : active ? 3 : 2,
            borderStyle: 'solid',
            borderColor: done ? GREEN : active ? GOLD : '#e5e7eb',
            backgroundColor: done ? GREEN : active ? '#fffbeb' : '#fafafa',
            color: done ? '#fff' : active ? GOLD : '#d1d5db',
            boxShadow: done
              ? `0 0 0 4px ${GREEN}15, 0 4px 12px ${GREEN}20`
              : active
                ? `0 0 0 4px ${GOLD}15, 0 4px 16px ${GOLD}25`
                : 'none'
          }}
        >
          {done && <CheckCircle2 className="h-5 w-5" />}
          {active && (
            <>
              <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: GOLD }} />
              {stage.icon === 'truck' && <Truck className="h-5 w-5" />}
              {stage.icon === 'warehouse' && <Warehouse className="h-5 w-5" />}
              {stage.icon === 'navigation' && <Navigation className="h-5 w-5" />}
              {stage.icon === 'package-check' && <PackageCheck className="h-5 w-5" />}
              {!stage.icon && <Truck className="h-5 w-5" />}
            </>
          )}
          {pending && <Circle className="h-4 w-4" />}
        </div>

        {!isLast && (
          <div className="relative w-[3px] flex-1 min-h-[4rem] rounded-full overflow-hidden bg-gray-200">
            <div
              className="absolute top-0 left-0 w-full rounded-full transition-all duration-700"
              style={{ height: `${progressPct}%`, backgroundColor: done ? GREEN : GOLD }}
            />
            {showMovingDot && (
              <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '30%', animation: 'bounceY 1.8s ease-in-out infinite' }}>
                <div
                  className="h-4 w-4 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: GOLD, backgroundColor: '#fffbeb', boxShadow: `0 0 12px ${GOLD}60` }}
                >
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stage content card */}
      <div className={`${isLast ? 'pb-2' : 'pb-5'} pt-1 flex-1 min-w-0`}>
        <div
          className={`rounded-xl p-3 transition-all duration-300 ${active ? 'border-l-[3px]' : done ? 'border-l-[3px]' : ''}`}
          style={{
            backgroundColor: active ? `${GOLD}06` : done ? `${GREEN}04` : 'transparent',
            borderLeftColor: active ? GOLD : done ? GREEN : 'transparent',
          }}
        >
          <p className="text-[15px] font-bold leading-tight" style={{ color: done || active ? '#111827' : '#9ca3af' }}>
            {stage.city}
          </p>

          <span
            className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest"
            style={{
              backgroundColor: done ? `${GREEN}12` : active ? `${GOLD}15` : '#f3f4f6',
              color: done ? GREEN : active ? GOLD_DARK : '#9ca3af'
            }}
          >
            {done && <CheckCircle2 className="h-2.5 w-2.5" />}
            {active && <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: GOLD }} />}
            {stage.label}
          </span>

          {stage.sublabel && (
            <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: done ? '#6b7280' : active ? '#92400e' : '#9ca3af' }}>
              {stage.sublabel}
            </p>
          )}

          {stage.date && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-gray-400">
              <Clock className="h-3 w-3" />
              {fmtDateTime(stage.date)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Detail Row ── */
function DetailRow({ icon: Icon, label, value, gold }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5"
        style={{ backgroundColor: gold ? `${GOLD}10` : '#f3f4f6' }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: gold ? GOLD : '#9ca3af' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>{label}</p>
        <p className="text-[13px] font-semibold mt-0.5" style={{ color: gold ? GOLD_DARK : '#374151' }}>{value || '—'}</p>
      </div>
    </div>
  );
}

/* ── Copy GR Button ── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-100 transition active:scale-90">
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN TRACKER PAGE                                                 */
/* ═══════════════════════════════════════════════════════════════════ */
function TrackerPageContent() {
  const { gr_no } = useParams();
  const { language, toggleLanguage, t } = useLanguage();

  const [biltyData, setBiltyData] = useState(null);
  const [transitData, setTransitData] = useState(null);
  const [branchData, setBranchData] = useState(null);
  const [fromCityName, setFromCityName] = useState('');
  const [toCityName, setToCityName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chargesOpen, setChargesOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [challanDispatched, setChallanDispatched] = useState(false);
  const [dispatchDate, setDispatchDate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadBiltyData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { data: bilty, error: biltyError } = await supabase
        .from('bilty')
        .select('*, transit_details(*)')
        .eq('gr_no', gr_no)
        .eq('is_active', true)
        .single();

      if (!bilty || biltyError) {
        throw new Error(
          biltyError?.code === 'PGRST116'
            ? `Bilty with GR Number "${gr_no}" not found`
            : biltyError?.message || 'Bilty not found'
        );
      }

      setBiltyData(bilty);

      const transit = bilty.transit_details?.[0] || null;
      setTransitData(transit);

      if (transit?.challan_no) {
        const { data: challan } = await supabase
          .from('challan_details')
          .select('is_dispatched, dispatch_date')
          .eq('challan_no', transit.challan_no)
          .eq('is_active', true)
          .single();
        if (challan) {
          setChallanDispatched(!!challan.is_dispatched);
          setDispatchDate(challan.dispatch_date);
        }
      }

      if (bilty.branch_id) {
        const { data: branch } = await supabase.from('branches').select('*').eq('id', bilty.branch_id).single();
        if (branch) {
          setBranchData(branch);
          const { data: cities } = await supabase.from('cities').select('*');
          if (cities) {
            setFromCityName(cities.find(c => c.city_code === branch.city_code)?.city_name || 'N/A');
            setToCityName(cities.find(c => c.id?.toString() === bilty.to_city_id?.toString())?.city_name || 'N/A');
          }
        }
      }
    } catch (e) {
      console.error('Error loading bilty:', e);
      setError(e.message || 'Failed to load bilty data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gr_no]);

  useEffect(() => { if (gr_no) loadBiltyData(); }, [gr_no, loadBiltyData]);

  /* ═══════════════════════════════════════════════════════════════ */
  /*  BUILD 5-STAGE TRACKING                                        */
  /* ═══════════════════════════════════════════════════════════════ */
  const getStages = () => {
    if (!biltyData) return [];
    const td = transitData;
    const hasTransit = !!td;

    const isDispatched = challanDispatched;
    const isReceivedAtBranch2 = td?.is_delivered_at_branch2 || false;
    const isOutFromBranch2 = td?.is_out_of_delivery_from_branch2 || false;
    const isDoorDelivery = td?.out_for_door_delivery || false;
    const isDelivered = td?.is_delivered_at_destination || false;

    // STAGE 1: Booked
    const s1 = {
      city: fromCityName || 'Aligarh',
      label: t('booked'),
      sublabel: `${t('biltyBookedAt')} ${fromCityName || 'Origin'}`,
      status: 'completed',
      date: biltyData.created_at,
      icon: 'package-check',
      showMovingDot: isDispatched && !isReceivedAtBranch2
    };

    // STAGE 2: Dispatched from Origin
    let s2Status = 'pending', s2Label = t('pending'), s2Sublabel = t('awaitingDispatch');
    if (isDispatched) {
      s2Status = 'completed'; s2Label = t('dispatched'); s2Sublabel = t('leftOriginWarehouse');
    } else if (hasTransit) {
      s2Status = 'current'; s2Label = t('inTransit');
      s2Sublabel = language === 'hi' ? `चालान ${td.challan_no} बनाया गया, रवानगी बाकी` : `Challan ${td.challan_no} created, dispatch pending`;
    }
    const s2 = {
      city: language === 'hi' ? `${fromCityName} से रवाना` : `Dispatched from ${fromCityName || 'Origin'}`,
      label: s2Label, sublabel: s2Sublabel, status: s2Status,
      date: isDispatched ? dispatchDate : null, icon: 'truck', showMovingDot: false
    };

    // STAGE 3: Received at Kanpur Warehouse
    let s3Status = 'pending', s3Label = t('pending'), s3Sublabel = t('awaitingArrivalAtWarehouse');
    if (isReceivedAtBranch2) {
      s3Status = 'completed'; s3Label = t('receivedAtWarehouse'); s3Sublabel = t('arrivedAtWarehouse');
    } else if (isDispatched) {
      s3Status = 'current'; s3Label = t('inTransit');
      s3Sublabel = language === 'hi' ? 'माल कानपुर गोदाम की ओर रवाना है, 12 घंटे में पहुंचेगा' : 'Consignment en route — will reach Kanpur Warehouse within 12 hrs';
    }
    const s3 = {
      city: t('kanpurWarehouse'), label: s3Label, sublabel: s3Sublabel, status: s3Status,
      date: isReceivedAtBranch2 ? td?.delivered_at_branch2_date : null, icon: 'warehouse',
      showMovingDot: isReceivedAtBranch2 && isOutFromBranch2 && !isDelivered
    };

    // STAGE 4: Out from Kanpur → Destination
    let s4Status = 'pending', s4Label = t('pending'), s4Sublabel = t('awaitingDispatchFromWarehouse');
    if (isOutFromBranch2) {
      s4Status = 'completed'; s4Label = t('outFromWarehouse'); s4Sublabel = t('leftWarehouse');
    } else if (isReceivedAtBranch2) {
      s4Status = 'current'; s4Label = t('receivedAtWarehouse');
      s4Sublabel = language === 'hi' ? 'माल कानपुर गोदाम में है, आगे भेजने की प्रक्रिया में' : 'At Kanpur Warehouse, being processed for forward dispatch';
    }
    const s4 = {
      city: language === 'hi' ? `${toCityName} की ओर रवाना` : `En route to ${toCityName || 'Destination'}`,
      label: s4Label, sublabel: s4Sublabel, status: s4Status,
      date: isOutFromBranch2 ? td?.out_of_delivery_from_branch2_date : null, icon: 'navigation',
      showMovingDot: isOutFromBranch2 && !isDelivered
    };

    // STAGE 5: Delivered
    let s5Status = 'pending', s5Label = t('pending'), s5Sublabel = t('awaitingDelivery');
    if (isDelivered) {
      s5Status = 'completed'; s5Label = t('delivered'); s5Sublabel = t('successfullyDelivered');
    } else if (isDoorDelivery) {
      s5Status = 'current'; s5Label = t('doorDelivery'); s5Sublabel = t('outForDoorDelivery');
    } else if (isOutFromBranch2) {
      s5Status = 'current'; s5Label = t('inTransit');
      s5Sublabel = language === 'hi' ? `माल ${toCityName} की ओर रवाना है` : `Consignment heading to ${toCityName}`;
    }
    const s5 = {
      city: toCityName || t('destination'), label: s5Label, sublabel: s5Sublabel, status: s5Status,
      date: isDelivered ? td?.delivered_at_destination_date : (isDoorDelivery ? td?.out_for_door_delivery_date : null),
      icon: 'package-check', showMovingDot: false
    };

    return [s1, s2, s3, s4, s5];
  };

  const getProgress = () => {
    const stages = getStages();
    const completed = stages.filter(s => s.status === 'completed').length;
    return Math.round((completed / stages.length) * 100);
  };

  const getStatusInfo = () => {
    if (!biltyData) return { text: '', color: '#888', bg: '#f3f4f6', emoji: '' };
    const td = transitData;
    if (td?.is_delivered_at_destination)
      return { text: language === 'hi' ? '✅ डिलीवर हो गया' : '✅ Delivered', color: GREEN, bg: GREEN_BG, emoji: '🎉' };
    if (td?.out_for_door_delivery)
      return { text: language === 'hi' ? '🚚 डोर डिलीवरी के लिए निकला' : '🚚 Out for Door Delivery', color: BLUE, bg: '#eff6ff', emoji: '🚚' };
    if (td?.is_out_of_delivery_from_branch2)
      return { text: language === 'hi' ? `📦 ${toCityName} की ओर रवाना` : `📦 En route to ${toCityName}`, color: GOLD_DARK, bg: GOLD_LIGHT, emoji: '📦' };
    if (td?.is_delivered_at_branch2)
      return { text: language === 'hi' ? '🏭 कानपुर गोदाम में' : '🏭 At Kanpur Warehouse', color: '#7c3aed', bg: '#f5f3ff', emoji: '🏭' };
    if (challanDispatched)
      return { text: language === 'hi' ? `🚛 ${fromCityName} से रवाना` : `🚛 Dispatched from ${fromCityName}`, color: GOLD_DARK, bg: GOLD_LIGHT, emoji: '🚛' };
    if (transitData)
      return { text: language === 'hi' ? '📋 चालान बनाया गया' : '📋 Challan Created', color: '#92400e', bg: '#fef3c7', emoji: '📋' };
    return { text: language === 'hi' ? '📝 बुक किया गया' : '📝 Booked', color: '#6b7280', bg: '#f3f4f6', emoji: '📝' };
  };

  /* ═══ LOADING ═══ */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl border border-amber-100">
          <Image src="/logo.png" alt="SS Transport" width={90} height={55} className="mx-auto mb-5 object-contain" />
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-[3px] border-amber-100 animate-spin" style={{ borderTopColor: GOLD }} />
          <p className="text-sm font-bold text-gray-700">{t('loading')}...</p>
          <p className="mt-2 text-xs text-gray-400">
            {t('searchingFor')}: <span className="font-mono font-bold" style={{ color: GOLD }}>{gr_no}</span>
          </p>
        </div>
      </div>
    );
  }

  /* ═══ ERROR ═══ */
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl border border-red-100">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-red-600">{t('notFound')}</h3>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">{error}</p>
          <button
            onClick={() => loadBiltyData()}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white active:scale-95 transition shadow-lg"
            style={{ backgroundColor: GOLD, boxShadow: `0 4px 14px ${GOLD}40` }}
          >
            <RefreshCw className="h-4 w-4" /> {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (!biltyData) return null;

  const stages = getStages();
  const progress = getProgress();
  const statusInfo = getStatusInfo();
  const pdfUrl = biltyData.pdf_bucket;
  const total = Number(biltyData.total) || [
    biltyData.freight_amount, biltyData.labour_charge, biltyData.bill_charge,
    biltyData.toll_charge, biltyData.pf_charge, biltyData.dd_charge, biltyData.other_charge
  ].reduce((s, v) => s + (Number(v) || 0), 0);
  const paymentLabel = biltyData.payment_mode?.toLowerCase() === 'paid' ? t('paid') : t('toPay');
  const isDelivered = transitData?.is_delivered_at_destination || false;

  /* ═══ MAIN UI ═══ */
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-white to-gray-50 pb-8">

      <style jsx global>{`
        @keyframes bounceY {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(20px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up { animation: fadeInUp 0.5s ease-out both; }
        .fade-in-up-1 { animation-delay: 0.05s; }
        .fade-in-up-2 { animation-delay: 0.1s; }
        .fade-in-up-3 { animation-delay: 0.15s; }
        .fade-in-up-4 { animation-delay: 0.2s; }
        .fade-in-up-5 { animation-delay: 0.25s; }
        .fade-in-up-6 { animation-delay: 0.3s; }
      `}</style>

      {/* ═══ STICKY HEADER ═══ */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg shadow-sm" style={{ borderBottom: `2.5px solid ${GOLD}` }}>
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="SS Transport" width={44} height={32} className="object-contain" />
            <div>
              <h1 className="text-[13px] font-black tracking-[0.25em]" style={{ color: GOLD }}>SS TRACKER</h1>
              <p className="text-[8px] font-semibold italic tracking-wider text-gray-400">on time, every time</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadBiltyData(true)}
              className={`p-2 rounded-xl transition active:scale-90 ${refreshing ? 'animate-spin' : ''}`}
              style={{ color: GOLD_DARK, backgroundColor: `${GOLD}08` }}
              disabled={refreshing}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold active:scale-95 transition border"
              style={{ borderColor: `${GOLD}30`, color: GOLD_DARK, backgroundColor: `${GOLD}06` }}
            >
              <Globe className="h-3.5 w-3.5" />
              {language === 'en' ? 'हिंदी' : 'ENG'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4 space-y-3.5">

        {/* ═══ GR NUMBER HERO ═══ */}
        <div className="rounded-3xl bg-white shadow-md border border-gray-100 overflow-hidden fade-in-up fade-in-up-1">
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DARK}, ${GOLD})` }} />
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{t('grNumber')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xl font-black tracking-tight text-gray-900">SSTC-{biltyData.gr_no}</p>
                  <CopyButton text={`SSTC-2025-26-${biltyData.gr_no}`} />
                </div>
              </div>
              <span
                className="rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider"
                style={{
                  backgroundColor: biltyData.payment_mode?.toLowerCase() === 'paid' ? GREEN_BG : `${GOLD}12`,
                  color: biltyData.payment_mode?.toLowerCase() === 'paid' ? GREEN : GOLD_DARK
                }}
              >
                {paymentLabel}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[13px]">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />
              <span className="font-bold text-gray-800">{fromCityName}</span>
              <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
              <span className="font-bold text-gray-800">{toCityName}</span>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-2xl px-3.5 py-2.5" style={{ backgroundColor: statusInfo.bg }}>
              <span className="text-[15px]">{statusInfo.emoji}</span>
              <span className="text-[13px] font-bold" style={{ color: statusInfo.color }}>{statusInfo.text}</span>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('trackingInformation')}</span>
                <span className="text-[11px] font-bold" style={{ color: progress === 100 ? GREEN : GOLD_DARK }}>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: progress === 100 ? `linear-gradient(90deg, ${GREEN}, #22c55e)` : `linear-gradient(90deg, ${GOLD}, ${GOLD_DARK})`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ VIEW BILTY PDF ═══ */}
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-2xl p-3.5 text-[14px] font-black tracking-wide text-white active:scale-[0.98] transition shadow-lg fade-in-up fade-in-up-2"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, boxShadow: `0 4px 20px ${GOLD}35` }}
          >
            <FileText className="h-5 w-5" /> {t('viewBiltyPdf')} <ExternalLink className="h-4 w-4 opacity-70" />
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-white p-3.5 text-sm font-semibold text-gray-400 fade-in-up fade-in-up-2">
            <Clock className="h-4 w-4" /> {t('pdfNotAvailable')}
          </div>
        )}

        {/* ═══ DELIVERY AGENT CARD ═══ */}
        {transitData?.out_for_door_delivery && transitData?.delivery_agent_name && (
          <div className="rounded-2xl p-4 border shadow-sm fade-in-up fade-in-up-3" style={{ borderColor: `${BLUE}20`, backgroundColor: '#f0f7ff' }}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${BLUE}15` }}>
                <Truck className="h-5 w-5" style={{ color: BLUE }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>{t('deliveryAgent')}</p>
                <p className="text-[15px] font-bold text-gray-900 mt-0.5">{transitData.delivery_agent_name}</p>
                {transitData.vehicle_number && (
                  <p className="text-[12px] font-semibold text-gray-500 mt-0.5 flex items-center gap-1">
                    <Truck className="h-3 w-3" /> {transitData.vehicle_number}
                  </p>
                )}
              </div>
              {transitData.delivery_agent_phone && (
                <a
                  href={`tel:${transitData.delivery_agent_phone}`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white active:scale-90 transition shadow-md"
                  style={{ backgroundColor: GREEN }}
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
            {transitData.remarks && (
              <div className="mt-2.5 pt-2.5 border-t border-blue-100 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 mt-0.5 text-blue-400 shrink-0" />
                <p className="text-[12px] text-gray-500">{transitData.remarks}</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ DELIVERED CELEBRATION ═══ */}
        {isDelivered && (
          <div className="rounded-2xl p-4 text-center border shadow-sm fade-in-up fade-in-up-3" style={{ borderColor: `${GREEN}25`, backgroundColor: GREEN_BG }}>
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-[15px] font-bold" style={{ color: GREEN }}>{t('yourConsignment')} {t('hasBeenDelivered')}</p>
            {transitData?.delivered_at_destination_date && (
              <p className="text-[12px] text-gray-500 mt-1">{fmtDateTime(transitData.delivered_at_destination_date)}</p>
            )}
          </div>
        )}

        {/* ═══ DISPATCH ALERT ═══ */}
        {challanDispatched && !transitData?.is_delivered_at_branch2 && (
          <div className="rounded-2xl p-4 flex items-start gap-3 border shadow-sm fade-in-up fade-in-up-3" style={{ borderColor: `${GOLD}25`, backgroundColor: `${GOLD}04` }}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${GOLD}12` }}>
              <Truck className="h-5 w-5" style={{ color: GOLD_DARK }} />
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: GOLD_DARK }}>
                {language === 'hi' ? '🚛 माल रवाना हो चुका है!' : '🚛 Consignment Dispatched!'}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
                {language === 'hi'
                  ? `आपका माल ${fromCityName} गोदाम से निकल चुका है और कानपुर गोदाम 12 घंटे के अंदर पहुंचेगा।`
                  : `Your consignment has left ${fromCityName} warehouse and will reach Kanpur Warehouse within 12 hours.`}
              </p>
              {dispatchDate && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                  <Calendar className="h-3 w-3" />
                  {language === 'hi' ? 'रवानगी' : 'Dispatched'}: {fmtDateTime(dispatchDate)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ═══ TRACKING TIMELINE ═══ */}
        <div className="rounded-3xl bg-white p-5 shadow-md border border-gray-100 fade-in-up fade-in-up-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{t('trackingInformation')}</h2>
              <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{fromCityName} → {toCityName}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: progress === 100 ? GREEN : GOLD }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: progress === 100 ? GREEN : GOLD_DARK }}>{t('liveLocation')}</span>
            </div>
          </div>
          <div>
            {stages.map((stage, i) => (
              <TrackingMilestone key={i} stage={stage} isLast={i === stages.length - 1} />
            ))}
          </div>
        </div>

        {/* ═══ SHIPMENT DETAILS ═══ */}
        <div className="rounded-3xl bg-white p-4 shadow-md border border-gray-100 fade-in-up fade-in-up-4">
          <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{t('shipmentDetails')}</h2>
          <div className="grid grid-cols-2 gap-x-3">
            <DetailRow icon={MapPin} label={t('origin')} value={fromCityName} gold />
            <DetailRow icon={MapPin} label={t('destination')} value={toCityName} gold />
            <DetailRow icon={Calendar} label={t('date')} value={fmtDate(biltyData.bilty_date)} />
            <DetailRow icon={Truck} label={t('deliveryType')} value={biltyData.delivery_type} />
          </div>
        </div>

        {/* ═══ PACKAGE DETAILS ═══ */}
        <div className="rounded-3xl bg-white p-4 shadow-md border border-gray-100 fade-in-up fade-in-up-4">
          <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{t('packageDetails')}</h2>
          <div className="grid grid-cols-2 gap-x-3">
            <DetailRow icon={Package} label={t('packages')} value={biltyData.no_of_pkg ? `${biltyData.no_of_pkg} Pkg` : '—'} />
            <DetailRow icon={Weight} label={t('weight')} value={biltyData.wt ? `${biltyData.wt} Kg` : '—'} />
            <DetailRow icon={Tag} label={t('contents')} value={biltyData.contain} />
            <DetailRow icon={Hash} label={t('privateMarks')} value={biltyData.pvt_marks} />
            <DetailRow icon={Receipt} label={t('invoiceNo')} value={biltyData.invoice_no} />
            <DetailRow icon={IndianRupee} label={t('invoiceValue')} value={biltyData.invoice_value ? fmtCurrency(biltyData.invoice_value) : '—'} />
          </div>
          {biltyData.remark && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <DetailRow icon={FileText} label={t('remarks')} value={biltyData.remark} />
            </div>
          )}
        </div>

        {/* ═══ CONSIGNOR / CONSIGNEE ═══ */}
        <div className="grid grid-cols-2 gap-3 fade-in-up fade-in-up-5">
          <div className="rounded-3xl bg-white p-4 shadow-md border border-gray-100">
            <div className="flex items-center gap-1.5 mb-2" style={{ color: GOLD_DARK }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${GOLD}10` }}>
                <User className="h-3 w-3" />
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest">{t('consignor')}</h3>
            </div>
            <p className="text-[13px] font-bold text-gray-900 leading-tight">{biltyData.consignor_name || '—'}</p>
            {biltyData.consignor_gst && (
              <p className="mt-1 text-[9px] font-mono text-gray-400 bg-gray-50 rounded px-1.5 py-0.5 inline-block">GST: {biltyData.consignor_gst}</p>
            )}
            {biltyData.consignor_number && (
              <a href={`tel:${biltyData.consignor_number}`} className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: GOLD_DARK }}>
                <Phone className="h-3 w-3" /> {biltyData.consignor_number}
              </a>
            )}
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-md border border-gray-100">
            <div className="flex items-center gap-1.5 mb-2" style={{ color: GOLD_DARK }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${GOLD}10` }}>
                <Users className="h-3 w-3" />
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest">{t('consignee')}</h3>
            </div>
            <p className="text-[13px] font-bold text-gray-900 leading-tight">{biltyData.consignee_name || '—'}</p>
            {biltyData.consignee_gst && (
              <p className="mt-1 text-[9px] font-mono text-gray-400 bg-gray-50 rounded px-1.5 py-0.5 inline-block">GST: {biltyData.consignee_gst}</p>
            )}
            {biltyData.consignee_number && (
              <a href={`tel:${biltyData.consignee_number}`} className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: GOLD_DARK }}>
                <Phone className="h-3 w-3" /> {biltyData.consignee_number}
              </a>
            )}
          </div>
        </div>

        {/* ═══ CHARGES ═══ */}
        <div className="rounded-3xl bg-white shadow-md border border-gray-100 overflow-hidden fade-in-up fade-in-up-5">
          <button onClick={() => setChargesOpen(!chargesOpen)} className="flex w-full items-center justify-between p-4 active:bg-gray-50 transition">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{t('charges')}</h2>
              <div className="mt-1 flex items-center gap-2.5">
                <span className="text-xl font-black text-gray-900">{fmtCurrency(total)}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                  style={{
                    backgroundColor: biltyData.payment_mode?.toLowerCase() === 'paid' ? GREEN_BG : `${GOLD}12`,
                    color: biltyData.payment_mode?.toLowerCase() === 'paid' ? GREEN : GOLD_DARK
                  }}
                >
                  {paymentLabel}
                </span>
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl transition" style={{ backgroundColor: chargesOpen ? `${GOLD}10` : '#f3f4f6' }}>
              {chargesOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </div>
          </button>
          {chargesOpen && (
            <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2.5">
              {[
                [t('freight'), biltyData.freight_amount],
                [t('labourCharge'), biltyData.labour_charge],
                [t('biltyCharge'), biltyData.bill_charge],
                [t('tollTax'), biltyData.toll_charge],
                [t('pf'), biltyData.pf_charge],
                ['D/D', biltyData.dd_charge],
                [t('otherCharges'), biltyData.other_charge],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-700">{fmtCurrency(val)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t-2 border-dashed border-gray-200 pt-3 text-sm font-bold">
                <span className="text-gray-700">{t('total')}</span>
                <span className="text-base" style={{ color: GOLD_DARK }}>{fmtCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ═══ BILTY IMAGE ═══ */}
        {biltyData.bilty_image && (
          <div className="rounded-3xl bg-white shadow-md border border-gray-100 overflow-hidden fade-in-up fade-in-up-6">
            <button onClick={() => setImageOpen(!imageOpen)} className="flex w-full items-center justify-between p-4 active:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${GOLD}10` }}>
                  <FileText className="h-4 w-4" style={{ color: GOLD }} />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-gray-700">{t('biltyPhoto')}</h2>
                  <p className="text-[10px] text-gray-400 font-medium">
                    {language === 'hi' ? 'बिल्टी की फोटो देखें' : 'View physical bilty photo'}
                  </p>
                </div>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl transition" style={{ backgroundColor: imageOpen ? `${GOLD}10` : '#f3f4f6' }}>
                {imageOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </button>
            {imageOpen && (
              <div className="border-t border-gray-100 p-3">
                <img src={biltyData.bilty_image} alt="Bilty" className="w-full rounded-2xl object-contain" loading="lazy" />
              </div>
            )}
          </div>
        )}

        {/* ═══ TRANSIT INFO ═══ */}
        {transitData && (
          <div className="rounded-3xl bg-white p-4 shadow-md border border-gray-100 fade-in-up fade-in-up-6">
            <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
              {t('challanNumber')} & {t('transport')}
            </h2>
            <div className="grid grid-cols-2 gap-x-3">
              <DetailRow icon={FileText} label={t('challanNumber')} value={transitData.challan_no} gold />
              {transitData.vehicle_number && <DetailRow icon={Truck} label={t('vehicleNumber')} value={transitData.vehicle_number} />}
              {transitData.delivery_agent_name && <DetailRow icon={User} label={t('deliveryAgent')} value={transitData.delivery_agent_name} />}
              {transitData.delivery_agent_phone && <DetailRow icon={Phone} label={t('mobile')} value={transitData.delivery_agent_phone} />}
            </div>
            {transitData.remarks && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <DetailRow icon={Info} label={t('remarks')} value={transitData.remarks} />
              </div>
            )}
          </div>
        )}

        {/* ═══ FOOTER ═══ */}
        <footer className="pt-6 pb-6 text-center space-y-3 fade-in-up fade-in-up-6">
          <div className="flex items-center justify-center gap-2.5">
            <Image src="/logo.png" alt="SS Transport" width={36} height={26} className="object-contain opacity-80" />
            <p className="text-xs font-bold text-gray-500">S.S. Transport Corporation</p>
          </div>
          <p className="text-[10px] italic font-semibold text-gray-400">&ldquo;on time, every time&rdquo;</p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
            <a href="https://www.movesure.io" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: GOLD_DARK }}>movesure.io</a>
            <span className="text-gray-300">·</span>
            <a href="tel:9690293140" className="font-semibold text-gray-500 hover:underline">9690293140</a>
            <span className="text-gray-300">|</span>
            <a href="tel:7902122230" className="font-semibold text-gray-500 hover:underline">7902122230</a>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: GOLD }} />
            <p className="text-[10px] font-bold" style={{ color: GOLD_DARK }}>SS Tracker {t('poweredBy')} movesure.io</p>
          </div>
          <p className="text-[10px] flex items-center justify-center gap-1 text-gray-300">
            crafted with <Heart className="h-3 w-3 fill-red-400 text-red-400" /> by Eklavya Singh
          </p>
        </footer>
      </div>
    </div>
  );
}

export default function PrintBiltyPage() {
  return (
    <LanguageProvider>
      <TrackerPageContent />
    </LanguageProvider>
  );
}
