'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import supabase from '../../../app/utils/supabase';
import {
  AlertCircle, RefreshCw, Globe, Package, MapPin, Phone,
  FileText, Truck, CheckCircle2, Clock, ExternalLink,
  ChevronDown, ChevronUp, Calendar, User, Users, Circle, Heart,
  Weight, Tag, Receipt, Hash, IndianRupee
} from 'lucide-react';
import { LanguageProvider, useLanguage } from '../LanguageContext';
import { format } from 'date-fns';
import Image from 'next/image';

/* ── Brand ── */
const GOLD = '#cca33c';
const GOLD_DARK = '#a6842e';

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

/* ── Tracking Stage (vertical timeline node with in-transit dot) ── */
function TrackingStage({ stage, isLast }) {
  const done = stage.status === 'completed';
  const active = stage.status === 'current';
  const showMovingDot = stage.showMovingDot;

  return (
    <div className="relative flex gap-3.5">
      {/* Node + connector */}
      <div className="flex flex-col items-center">
        <div
          className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[2.5px] transition-all"
          style={{
            borderColor: done ? GOLD : active ? GOLD : '#ddd',
            backgroundColor: done ? GOLD : active ? '#fdf6e3' : '#fff',
            color: done ? '#fff' : active ? GOLD : '#ccc',
            boxShadow: done ? `0 0 12px ${GOLD}35` : active ? `0 0 14px ${GOLD}25` : 'none'
          }}
        >
          {done && <CheckCircle2 className="h-5 w-5" />}
          {active && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full opacity-15" style={{ backgroundColor: GOLD }} />
              <Truck className="h-4 w-4" />
            </>
          )}
          {!done && !active && <Circle className="h-4 w-4" />}
        </div>
        {!isLast && (
          <div className="relative w-[2.5px] flex-1 min-h-[3rem] rounded-full" style={{ backgroundColor: done ? GOLD : '#e5e7eb' }}>
            {/* Moving dot between milestones when in transit */}
            {showMovingDot && (
              <div className="absolute left-1/2 -translate-x-1/2 animate-bounce" style={{ top: '35%' }}>
                <div
                  className="h-4 w-4 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: GOLD, backgroundColor: '#fdf6e3', boxShadow: `0 0 10px ${GOLD}50` }}
                >
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stage content */}
      <div className={`${isLast ? 'pb-2' : 'pb-7'} pt-1`}>
        <p className="text-[15px] font-bold leading-tight" style={{ color: done || active ? '#1a1a1a' : '#bbb' }}>
          {stage.city}
        </p>
        <span
          className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest"
          style={{
            backgroundColor: done ? `${GOLD}18` : active ? `${GOLD}12` : '#f3f4f6',
            color: done ? GOLD_DARK : active ? GOLD_DARK : '#bbb'
          }}
        >
          {stage.label}
        </span>
        {stage.sublabel && (
          <p className="mt-1 text-[12px] leading-snug" style={{ color: '#888' }}>{stage.sublabel}</p>
        )}
      </div>
    </div>
  );
}

/* ── Detail Row ── */
function DetailRow({ icon: Icon, label, value, gold }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: gold ? GOLD : '#aaa' }} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#999' }}>{label}</p>
        <p className="text-sm font-semibold" style={{ color: gold ? GOLD_DARK : '#333' }}>{value || '—'}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  SS TRACKER                                                     */
/* ═══════════════════════════════════════════════════════════════ */
function TrackerPageContent() {
  const { gr_no } = useParams();
  const { language, toggleLanguage, t } = useLanguage();

  const [biltyData, setBiltyData] = useState(null);
  const [branchData, setBranchData] = useState(null);
  const [fromCityName, setFromCityName] = useState('');
  const [toCityName, setToCityName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chargesOpen, setChargesOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [challanDispatched, setChallanDispatched] = useState(false);
  const [dispatchDate, setDispatchDate] = useState(null);

  useEffect(() => { if (gr_no) loadBiltyData(); }, [gr_no]);

  const loadBiltyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: bilty, error: biltyError } = await supabase
        .from('bilty')
        .select('*, transit_details(id, challan_no, gr_no)')
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

      if (bilty.transit_details?.length > 0) {
        const challanNo = bilty.transit_details[0]?.challan_no;
        if (challanNo) {
          const { data: challan } = await supabase
            .from('challan_details')
            .select('is_dispatched, dispatch_date')
            .eq('challan_no', challanNo)
            .eq('is_active', true)
            .single();
          if (challan) {
            setChallanDispatched(!!challan.is_dispatched);
            setDispatchDate(challan.dispatch_date);
          }
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
    }
  };

  /* ── 3-stage tracking ── */
  const getStages = () => {
    if (!biltyData) return [];
    const hasTransit = biltyData.transit_details?.length > 0;
    const hasBiltyImage = !!biltyData.bilty_image;
    const challanNo = biltyData.transit_details?.[0]?.challan_no;

    let s2, s3;
    if (hasBiltyImage) {
      s2 = 'completed';
      s3 = hasTransit && challanDispatched ? 'completed' : 'current';
    } else if (challanDispatched) {
      s2 = 'current';
      s3 = 'pending';
    } else if (hasTransit) {
      s2 = 'current';
      s3 = 'pending';
    } else {
      s2 = 'pending';
      s3 = 'pending';
    }

    let s2Sublabel = t('awaitingDispatch');
    if (s2 === 'completed') {
      s2Sublabel = t('atHub');
    } else if (challanDispatched) {
      s2Sublabel = language === 'hi'
        ? 'माल अलीगढ़ गोदाम से निकल चुका है, कानपुर 12 घंटे में पहुंचेगा'
        : 'Consignment left Aligarh — will reach Kanpur within 12 hrs';
    } else if (hasTransit) {
      s2Sublabel = language === 'hi'
        ? `चालान ${challanNo} बनाया गया, रवानगी बाकी`
        : `Challan ${challanNo} created, dispatch pending`;
    }

    let s3Sublabel = t('awaitingDispatch');
    if (s3 === 'completed') {
      s3Sublabel = `${t('challanNumber')}: ${challanNo}`;
    }

    // Show a moving dot on the connector line between Stage 1 and Stage 2
    // when consignment is dispatched but not yet received at hub
    const showMovingDotOnS1 = challanDispatched && !hasBiltyImage;

    return [
      {
        city: fromCityName || 'Aligarh',
        label: t('booked'),
        sublabel: fmtDate(biltyData.created_at),
        status: 'completed',
        showMovingDot: showMovingDotOnS1
      },
      {
        city: t('kanpurHub'),
        label: s2 === 'completed' ? t('received') : s2 === 'current' ? t('inTransit') : t('pending'),
        sublabel: s2Sublabel,
        status: s2,
        showMovingDot: false
      },
      {
        city: toCityName || t('destination'),
        label: s3 === 'completed' ? t('dispatched') : t('pending'),
        sublabel: s3Sublabel,
        status: s3,
        showMovingDot: false
      }
    ];
  };

  const getStatusText = () => {
    if (!biltyData) return '';
    const hasTransit = biltyData.transit_details?.length > 0;
    const hasBiltyImage = !!biltyData.bilty_image;
    if (hasBiltyImage && challanDispatched) return `${t('dispatched')} → ${toCityName}`;
    if (hasBiltyImage) return t('atKanpurHub');
    if (challanDispatched) return language === 'hi' ? 'अलीगढ़ से रवाना' : 'Left Aligarh';
    if (hasTransit) return language === 'hi' ? 'चालान बनाया गया' : 'Challan Created';
    return t('booked');
  };

  const getStatusColor = () => {
    const hasBiltyImage = !!biltyData?.bilty_image;
    if (hasBiltyImage && challanDispatched) return '#16a34a';
    if (challanDispatched) return GOLD_DARK;
    return '#888';
  };

  /* ── LOADING ── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg border border-gray-100">
          <Image src="/logo.png" alt="SS Transport" width={80} height={50} className="mx-auto mb-4 object-contain" />
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: GOLD }} />
          <p className="text-sm font-semibold text-gray-700">{t('loading')}...</p>
          <p className="mt-1 text-xs text-gray-400">
            {t('searchingFor')}: <span className="font-mono font-bold" style={{ color: GOLD }}>{gr_no}</span>
          </p>
        </div>
      </div>
    );
  }

  /* ── ERROR ── */
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg border border-red-100">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-red-600">{t('notFound')}</h3>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <button
            onClick={loadBiltyData}
            className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white active:scale-95 transition"
            style={{ backgroundColor: GOLD }}
          >
            <RefreshCw className="h-4 w-4" /> {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (!biltyData) return null;

  const stages = getStages();
  const pdfUrl = biltyData.pdf_bucket;
  const total = Number(biltyData.total) || [
    biltyData.freight_amount, biltyData.labour_charge, biltyData.bill_charge,
    biltyData.toll_charge, biltyData.pf_charge, biltyData.dd_charge, biltyData.other_charge
  ].reduce((s, v) => s + (Number(v) || 0), 0);
  const paymentLabel = biltyData.payment_mode?.toLowerCase() === 'paid' ? t('paid') : t('toPay');

  /* ═══ MAIN UI ═══ */
  return (
    <div className="min-h-screen bg-gray-50 pb-6">

      {/* ── STICKY HEADER ── */}
      <header className="sticky top-0 z-30 bg-white shadow-sm" style={{ borderBottom: `2px solid ${GOLD}` }}>
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="SS Transport" width={44} height={32} className="object-contain" />
            <div>
              <h1 className="text-[13px] font-black tracking-widest" style={{ color: GOLD }}>SS TRACKER</h1>
              <p className="text-[9px] font-medium italic tracking-wide text-gray-400">on time, every time</p>
            </div>
          </div>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold active:scale-95 transition border"
            style={{ borderColor: `${GOLD}40`, color: GOLD_DARK, backgroundColor: `${GOLD}08` }}
          >
            <Globe className="h-3.5 w-3.5" />
            {language === 'en' ? 'हिंदी' : 'ENG'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-3.5 pt-4 space-y-3">

        {/* ── VIEW BILTY PDF (TOP) ── */}
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-2xl p-3.5 text-[15px] font-black tracking-wide text-white active:scale-[0.98] transition"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, boxShadow: `0 4px 20px ${GOLD}30` }}
          >
            <FileText className="h-5 w-5" />
            {t('viewBiltyPdf')}
            <ExternalLink className="h-4 w-4 opacity-70" />
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white p-3.5 text-sm font-semibold text-gray-400">
            <Clock className="h-4 w-4" />
            {t('pdfNotAvailable')}
          </div>
        )}

        {/* ── GR NUMBER HERO ── */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{t('grNumber')}</p>
          <p className="mt-0.5 text-xl font-black tracking-tight text-gray-900">
            SSTC-2025-26-{biltyData.gr_no}
          </p>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border"
              style={{ borderColor: `${getStatusColor()}30`, color: getStatusColor(), backgroundColor: `${getStatusColor()}08` }}
            >
              <Truck className="h-3 w-3" /> {getStatusText()}
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                backgroundColor: biltyData.payment_mode?.toLowerCase() === 'paid' ? '#dcfce7' : `${GOLD}12`,
                color: biltyData.payment_mode?.toLowerCase() === 'paid' ? '#16a34a' : GOLD_DARK
              }}
            >
              {paymentLabel}
            </span>
          </div>
        </div>

        {/* ── DISPATCH ALERT ── */}
        {challanDispatched && !biltyData.bilty_image && (
          <div className="rounded-2xl p-3.5 flex items-start gap-3 border" style={{ borderColor: `${GOLD}30`, backgroundColor: `${GOLD}06` }}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${GOLD}15` }}>
              <Truck className="h-4 w-4" style={{ color: GOLD_DARK }} />
            </div>
            <div>
              <p className="text-[12px] font-bold" style={{ color: GOLD_DARK }}>
                {language === 'hi' ? '🚛 माल रवाना हो चुका है!' : '🚛 Consignment Dispatched!'}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
                {language === 'hi'
                  ? 'आपका माल अलीगढ़ गोदाम से निकल चुका है और कानपुर हब 12 घंटे के अंदर पहुंच जाएगा।'
                  : 'Your consignment is out of Aligarh warehouse and will reach Kanpur Hub within 12 hours.'}
              </p>
              {dispatchDate && (
                <p className="mt-1 text-[10px] font-semibold text-gray-400">
                  {language === 'hi' ? 'रवानगी' : 'Dispatched'}: {fmtDate(dispatchDate)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── TRACKING TIMELINE ── */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            {t('trackingInformation')}
          </h2>
          <div>
            {stages.map((stage, i) => (
              <TrackingStage key={i} stage={stage} isLast={i === stages.length - 1} />
            ))}
          </div>
        </div>

        {/* ── SHIPMENT DETAILS ── */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            {t('shipmentDetails')}
          </h2>
          <div className="grid grid-cols-2 gap-x-3">
            <DetailRow icon={MapPin} label={t('origin')} value={fromCityName} gold />
            <DetailRow icon={MapPin} label={t('destination')} value={toCityName} gold />
            <DetailRow icon={Calendar} label={t('date')} value={fmtDate(biltyData.bilty_date)} />
            <DetailRow icon={Truck} label={t('deliveryType')} value={biltyData.delivery_type} />
          </div>
        </div>

        {/* ── PACKAGE DETAILS ── */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            {t('packageDetails')}
          </h2>
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

        {/* ── CONSIGNOR / CONSIGNEE ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5" style={{ color: GOLD_DARK }}>
              <User className="h-3.5 w-3.5" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">{t('consignor')}</h3>
            </div>
            <p className="mt-1.5 text-[13px] font-bold text-gray-900 leading-tight">
              {biltyData.consignor_name || '—'}
            </p>
            {biltyData.consignor_gst && (
              <p className="mt-0.5 text-[10px] font-mono text-gray-400">GST: {biltyData.consignor_gst}</p>
            )}
            {biltyData.consignor_number && (
              <a href={`tel:${biltyData.consignor_number}`} className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold" style={{ color: GOLD_DARK }}>
                <Phone className="h-3 w-3" /> {biltyData.consignor_number}
              </a>
            )}
          </div>

          <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5" style={{ color: GOLD_DARK }}>
              <Users className="h-3.5 w-3.5" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">{t('consignee')}</h3>
            </div>
            <p className="mt-1.5 text-[13px] font-bold text-gray-900 leading-tight">
              {biltyData.consignee_name || '—'}
            </p>
            {biltyData.consignee_gst && (
              <p className="mt-0.5 text-[10px] font-mono text-gray-400">GST: {biltyData.consignee_gst}</p>
            )}
            {biltyData.consignee_number && (
              <a href={`tel:${biltyData.consignee_number}`} className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold" style={{ color: GOLD_DARK }}>
                <Phone className="h-3 w-3" /> {biltyData.consignee_number}
              </a>
            )}
          </div>
        </div>

        {/* ── CHARGES (expandable) ── */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setChargesOpen(!chargesOpen)}
            className="flex w-full items-center justify-between p-4 active:bg-gray-50 transition"
          >
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{t('charges')}</h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-black text-gray-900">{fmtCurrency(total)}</span>
              </div>
            </div>
            {chargesOpen
              ? <ChevronUp className="h-5 w-5 text-gray-400" />
              : <ChevronDown className="h-5 w-5 text-gray-400" />
            }
          </button>
          {chargesOpen && (
            <div className="border-t border-gray-100 px-4 pb-4 pt-2 space-y-2">
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
              <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-sm font-bold">
                <span className="text-gray-700">{t('total')}</span>
                <span style={{ color: GOLD_DARK }}>{fmtCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── BILTY IMAGE ── */}
        {biltyData.bilty_image && (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setImageOpen(!imageOpen)}
              className="flex w-full items-center justify-between p-4 active:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${GOLD}12` }}>
                  <FileText className="h-4 w-4" style={{ color: GOLD }} />
                </span>
                <h2 className="text-sm font-bold text-gray-700">{t('biltyPhoto')}</h2>
              </div>
              {imageOpen
                ? <ChevronUp className="h-5 w-5 text-gray-400" />
                : <ChevronDown className="h-5 w-5 text-gray-400" />
              }
            </button>
            {imageOpen && (
              <div className="border-t border-gray-100 p-3">
                <img src={biltyData.bilty_image} alt="Bilty" className="w-full rounded-xl object-contain" loading="lazy" />
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <footer className="pt-5 pb-4 text-center space-y-2.5">
          <div className="flex items-center justify-center gap-2">
            <Image src="/logo.png" alt="SS Transport" width={32} height={24} className="object-contain opacity-70" />
            <p className="text-xs font-bold text-gray-500">S.S. Transport Corporation</p>
          </div>
          <p className="text-[10px] italic font-medium text-gray-400">&ldquo;on time, every time&rdquo;</p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
            <a href="https://www.movesure.io" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: GOLD_DARK }}>
              movesure.io
            </a>
            <span>·</span>
            <a href="tel:9690293140" className="font-semibold text-gray-500">9690293140</a>
            <span>|</span>
            <a href="tel:7902122230" className="font-semibold text-gray-500">7902122230</a>
          </div>
          <p className="text-[10px] font-semibold" style={{ color: GOLD_DARK }}>
            SS Tracker {t('poweredBy')} movesure.io
          </p>
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
