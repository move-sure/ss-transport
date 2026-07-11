'use client';

import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Search, Loader2, X, TrendingUp, TrendingDown,
  Package, Weight, MapPin, BarChart2,
  ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp
} from 'lucide-react';
import Navbar from '../../../components/dashboard/navbar';

const API_URL = 'https://api.movesure.io';
const COLORS  = ['#3b82f6','#8b5cf6','#ec4899','#f97316','#10b981','#06b6d4','#f59e0b','#ef4444','#14b8a6','#a855f7','#6366f1','#84cc16','#f43f5e','#0ea5e9','#d946ef'];

const fmt      = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtKg    = (n) => `${fmt(n)} kg`;
const fmtRs    = (n) => `₹${fmt(n)}`;
const pctDelta = (curr, prev) => (!prev ? null : ((curr - prev) / prev * 100).toFixed(1));

// ── tooltip ───────────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white/95 backdrop-blur p-4 shadow-xl text-sm min-w-[160px]">
      <p className="font-bold text-gray-700 mb-2 border-b border-gray-100 pb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium leading-6">
          {p.name}: <span className="font-bold text-gray-900">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, delta, icon: Icon, accent = 'blue' }) {
  const up = delta !== null && parseFloat(delta) >= 0;
  const palette = {
    blue:   { bg: 'bg-blue-50',    border: 'border-blue-200',   iconBg: 'bg-blue-600',   val: 'text-blue-700'   },
    violet: { bg: 'bg-violet-50',  border: 'border-violet-200', iconBg: 'bg-violet-600', val: 'text-violet-700' },
    green:  { bg: 'bg-emerald-50', border: 'border-emerald-200',iconBg: 'bg-emerald-600',val: 'text-emerald-700'},
    amber:  { bg: 'bg-amber-50',   border: 'border-amber-200',  iconBg: 'bg-amber-500',  val: 'text-amber-700'  },
    pink:   { bg: 'bg-pink-50',    border: 'border-pink-200',   iconBg: 'bg-pink-600',   val: 'text-pink-700'   },
    cyan:   { bg: 'bg-cyan-50',    border: 'border-cyan-200',   iconBg: 'bg-cyan-600',   val: 'text-cyan-700'   },
  };
  const { bg, border, iconBg } = palette[accent] || palette.blue;
  return (
    <div className={`rounded-2xl border-2 ${border} ${bg} p-6 flex flex-col gap-3 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</span>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} text-white shadow-sm`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
      {sub && <p className="text-sm text-gray-400 font-medium">{sub}</p>}
      {delta !== null && (
        <div className={`flex items-center gap-1 text-sm font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
          {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {up ? '+' : ''}{delta}% vs last month
        </div>
      )}
    </div>
  );
}

// ── section header ────────────────────────────────────────────────────────────
function SectionTitle({ title, sub }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
      {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// ── window tabs ───────────────────────────────────────────────────────────────
const WIN_TABS = [
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_year',  label: 'This Year'  },
];
function WindowTabs({ value, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 shrink-0">
      {WIN_TABS.map(w => (
        <button key={w.id} onClick={() => onChange(w.id)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            value === w.id
              ? 'bg-white text-blue-700 shadow border border-blue-100'
              : 'text-gray-500 hover:text-gray-800'
          }`}>{w.label}</button>
      ))}
    </div>
  );
}

// ── counterparty trend chart ──────────────────────────────────────────────────
function CounterpartyTrendChart({ detail, partyType }) {
  const [selected, setSelected] = useState(() => new Set(detail.slice(0, 5).map(d => d.key)));
  const [showTable, setShowTable] = useState(false);
  if (!detail.length) return null;

  const chartData = (detail[0]?.monthly || []).map((m, i) => {
    const row = { label: m.label };
    detail.forEach(cp => { row[cp.key] = cp.monthly[i]?.count ?? 0; });
    return row;
  });

  const toggle = (key) => setSelected(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <SectionTitle
        title={`${partyType === 'consignor' ? 'Consignee' : 'Consignor'} Monthly Activity — 12 Months`}
        sub="Toggle each party to show/hide their trend line"
      />
      <div className="flex flex-wrap gap-2 mb-6">
        {detail.map((cp, i) => (
          <button key={cp.key} onClick={() => toggle(cp.key)}
            className={`text-sm px-3.5 py-1.5 rounded-full border-2 font-semibold transition-all ${
              selected.has(cp.key) ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
            style={selected.has(cp.key) ? { background: COLORS[i % COLORS.length] } : {}}>
            {cp.name || cp.gstin} ({cp.total_12m?.count ?? 0})
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTip />} />
          <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16 }} />
          {detail.map((cp, i) => selected.has(cp.key) && (
            <Line key={cp.key} type="monotone" dataKey={cp.key} name={cp.name || cp.gstin}
              stroke={COLORS[i % COLORS.length]} strokeWidth={3}
              dot={{ r: 4, fill: COLORS[i % COLORS.length] }} activeDot={{ r: 7 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <button onClick={() => setShowTable(v => !v)}
        className="mt-5 flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
        {showTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showTable ? 'Hide' : 'Show'} detail table
      </button>

      {showTable && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wide text-xs">
                <th className="py-3 px-4 text-left">Company</th>
                <th className="py-3 px-4 text-right">12m Total</th>
                <th className="py-3 px-4 text-right">Weight</th>
                <th className="py-3 px-4 text-right">Active Months</th>
                <th className="py-3 px-4 text-right">First Seen</th>
                <th className="py-3 px-4 text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {detail.map((cp, i) => (
                <tr key={cp.key} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="font-bold text-gray-800">{cp.name}</span>
                    {cp.gstin && <span className="text-gray-400 font-mono text-xs">{cp.gstin}</span>}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-gray-800">{cp.total_12m?.count ?? 0}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{fmtKg(cp.total_12m?.weight)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-lg text-sm">
                      {cp.active_months} / 12
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500">{cp.first_seen || '—'}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{cp.last_seen  || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── relationship web ──────────────────────────────────────────────────────────
function RelationshipWeb({ web, entityName, partyType }) {
  const [selected, setSelected] = useState(web[0] || null);
  if (!web.length) return null;

  const label = partyType === 'consignor' ? 'Consignee' : 'Consignor';
  const excColor = (pct) => pct >= 50 ? '#10b981' : pct >= 20 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <SectionTitle
        title="Relationship Web"
        sub={`How exclusively each ${label.toLowerCase()} ships through ${entityName}`}
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Left: exclusivity list (2 cols wide) */}
        <div className="xl:col-span-2 space-y-2.5">
          {web.map(cp => {
            const color = excColor(cp.exclusivity_pct);
            const isActive = selected?.name === cp.name;
            return (
              <button key={cp.name} onClick={() => setSelected(cp)}
                className={`w-full text-left rounded-xl p-4 border-2 transition-all ${
                  isActive ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-100 hover:border-gray-300 bg-white'
                }`}>
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <p className="font-extrabold text-gray-800">{cp.name}</p>
                    {cp.gstin && <p className="text-xs text-gray-400 font-mono mt-0.5">{cp.gstin}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xl font-extrabold" style={{ color }}>{cp.exclusivity_pct}%</p>
                    <p className="text-xs text-gray-400">{cp.total_distinct_partners} partners</p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(cp.exclusivity_pct, 100)}%`, background: color }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 font-medium">
                  <span>{fmt(cp.consignments_with_subject_12m)} with you</span>
                  <span>{fmt(cp.total_consignments_12m)} total (12m)</span>
                </div>
              </button>
            );
          })}

          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
            {[['≥ 50%', '#10b981', 'Ships mainly through you'],
              ['20–49%', '#f59e0b', 'Multi-transporter'],
              ['< 20%', '#ef4444', "You're one of many"]].map(([lbl, color, desc]) => (
              <div key={lbl} className="flex items-center gap-2 text-sm text-gray-500">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="font-bold" style={{ color }}>{lbl}</span>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: selected detail (3 cols wide) */}
        {selected && (
          <div className="xl:col-span-3">
            <div className="mb-1 flex items-baseline gap-3">
              <p className="text-lg font-extrabold text-gray-900">{selected.name}</p>
              <span className="text-sm font-bold" style={{ color: excColor(selected.exclusivity_pct) }}>
                {selected.exclusivity_pct}% exclusive
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-5">Monthly shipment total vs share with {entityName}</p>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={selected.monthly_activity} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="total_count"        name="All partners" fill="#e2e8f0" radius={[5,5,0,0]} />
                <Bar dataKey="with_subject_count" name={`With ${entityName}`} fill="#3b82f6" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>

            {(selected.other_top_partners || []).length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                  Other transporters this {label.toLowerCase()} uses
                </p>
                <div className="space-y-2">
                  {selected.other_top_partners.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <span className="font-semibold text-gray-700 text-sm">{p.name}
                        {p.gstin && <span className="text-gray-400 font-mono text-xs ml-2">{p.gstin}</span>}
                      </span>
                      <span className="font-extrabold text-gray-600 text-sm bg-white px-3 py-1 rounded-lg border border-gray-200">{p.count} shipments</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function ConsignorConsigneeAnalyticsPage() {
  const [query, setQuery]     = useState('');
  const [type, setType]       = useState('consignor');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [cityWin, setCityWin] = useState('this_month');
  const [cpWin,   setCpWin]   = useState('this_month');
  const [trendVis, setTrendVis] = useState({ count: true, packages: true, weight: true });
  const toggleTrend = (key) => setTrendVis(v => ({ ...v, [key]: !v[key] }));

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res  = await fetch(`${API_URL}/api/analytics/party?query=${encodeURIComponent(q)}&type=${type}`);
      const json = await res.json();
      if (json.status === 'success') setData(json);
      else setError(json.message || 'No data found for this query.');
    } catch { setError('Could not connect to the analytics API. Please try again.'); }
    finally  { setLoading(false); }
  };

  const tm = data?.summary?.this_month || {};
  const lm = data?.summary?.last_month || {};
  const wk = data?.summary?.last_week  || {};
  const yr = data?.summary?.this_year  || {};

  const trend    = data?.monthly_trend || [];
  const cities   = (data?.city_breakdown?.[cityWin] || []).slice(0, 12);
  const cps      = (data?.counterparty_breakdown?.[cpWin] || []).slice(0, 12);
  const pmodes   = data?.payment_mode_breakdown?.this_month || [];
  const dtypes   = data?.delivery_type_breakdown?.this_month || [];
  const cpDetail = data?.counterparty_monthly_detail || [];
  const cpWeb    = data?.counterparty_web || [];
  const newSet   = new Set((data?.counterparty_delta?.new_this_month || []).map(c => c.name));
  const dropped  = data?.counterparty_delta?.dropped || [];
  const recurring= data?.counterparty_delta?.recurring || [];
  const { new_cities_this_month = [], dropped_cities = [], declined_cities = [] } = data?.city_delta || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Full-width content — only horizontal padding, no max-width cap */}
      <div className="w-full px-6 xl:px-10 py-8 space-y-8">

        {/* Page header */}
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shrink-0">
            <BarChart2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Party Analytics</h1>
            <p className="text-base text-gray-500 mt-0.5">12-month consignor & consignee insights — cities, counterparties, relationships</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Search Party</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1 gap-1 shrink-0">
              {['consignor','consignee'].map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    type === t ? 'bg-white text-blue-700 shadow border border-blue-200' : 'text-gray-500 hover:text-gray-700'
                  }`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input type="text" value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Enter GSTIN (15 chars) or company name…"
                className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white" />
              {query && (
                <button onClick={() => { setQuery(''); setData(null); setError(null); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <button onClick={search} disabled={loading || !query.trim()}
              className="flex items-center gap-2.5 px-8 py-3 bg-blue-600 text-white text-base font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md shadow-blue-200">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              {loading ? 'Analysing…' : 'Analyse'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-5 text-base text-red-700 font-semibold">
            <X className="h-5 w-5 shrink-0" />{error}
          </div>
        )}

        {data && (
          <div className="space-y-8">

            {/* Entity header */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 flex flex-wrap justify-between items-start gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-1.5">
                  <h2 className="text-2xl font-extrabold text-gray-900">{data.entity.name}</h2>
                  <span className="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full uppercase">{data.party_type}</span>
                  <span className="bg-gray-100 text-gray-600 text-sm font-medium px-3 py-1 rounded-full">{data.entity.matched_by}</span>
                </div>
                <p className="text-base text-gray-400 font-mono">{data.entity.gstin || 'No GSTIN on record'}</p>
              </div>
              <div className="text-right text-sm text-gray-400 space-y-1">
                <p>This month <span className="font-semibold text-gray-600">{data.windows?.this_month?.from} → {data.windows?.this_month?.to}</span></p>
                <p>Last month <span className="font-semibold text-gray-600">{data.windows?.last_month?.from} → {data.windows?.last_month?.to}</span></p>
                <p className="text-lg font-extrabold text-gray-800 mt-2">{fmt(data.total_rows_fetched)} bilties (12 months)</p>
              </div>
            </div>

            {/* KPI grid — 4 on md, 8 on xl */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
              <KpiCard label="This Month"  value={tm.count ?? 0} sub="consignments"
                delta={pctDelta(tm.count, lm.count)} icon={Package} accent="blue" />
              <KpiCard label="Last Month"  value={lm.count ?? 0} sub="consignments"
                delta={null} icon={Package} accent="violet" />
              <KpiCard label="Last 7 Days" value={wk.count ?? 0} sub="consignments"
                delta={null} icon={TrendingUp} accent="cyan" />
              <KpiCard label="This Year"   value={yr.count ?? 0} sub={`${fmt(data.summary?.all_time_total)} all time`}
                delta={null} icon={BarChart2} accent="green" />
              <KpiCard label="Weight / Month"   value={fmtKg(tm.weight)}   sub={`${fmtKg(lm.weight)} last month`}
                delta={pctDelta(tm.weight, lm.weight)}   icon={Weight}   accent="amber" />
              <KpiCard label="Packages / Month" value={fmt(tm.packages)}   sub={`${fmt(lm.packages)} last month`}
                delta={pctDelta(tm.packages, lm.packages)} icon={Package} accent="pink" />
              <KpiCard label="Value / Month"    value={fmtRs(tm.value)}    sub={`${fmtRs(lm.value)} last month`}
                delta={pctDelta(tm.value, lm.value)}     icon={TrendingUp} accent="green" />
              <KpiCard label="Cities Reached"   value={(data.city_breakdown?.this_month || []).length}
                sub="this month" delta={null} icon={MapPin} accent="cyan" />
            </div>

            {/* 12-month area trend + payment donut */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                  <SectionTitle title="12-Month Shipment Trend" sub="Toggle lines to compare consignments, packages, and weight" />
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {[
                      { key: 'count',    label: 'Consignments', color: '#3b82f6' },
                      { key: 'packages', label: 'Packages',     color: '#f97316' },
                      { key: 'weight',   label: 'Weight (kg)',  color: '#10b981' },
                    ].map(({ key, label, color }) => (
                      <button key={key} onClick={() => toggleTrend(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                          trendVis[key] ? 'text-white border-transparent shadow-sm' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'
                        }`}
                        style={trendVis[key] ? { background: color } : {}}>
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: trendVis[key] ? '#fff' : color }} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={380}>
                  <AreaChart data={trend} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <defs>
                      <linearGradient id="gcnt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gpkg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gwt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis yAxisId="left"  orientation="left"  tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    {trendVis.count    && <Area yAxisId="left"  type="monotone" dataKey="count"    name="Consignments" stroke="#3b82f6" strokeWidth={3} fill="url(#gcnt)" dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 7 }} />}
                    {trendVis.packages && <Area yAxisId="left"  type="monotone" dataKey="packages" name="Packages"     stroke="#f97316" strokeWidth={3} fill="url(#gpkg)" dot={{ r: 4, fill: '#f97316' }} activeDot={{ r: 7 }} />}
                    {trendVis.weight   && <Area yAxisId="right" type="monotone" dataKey="weight"   name="Weight (kg)"  stroke="#10b981" strokeWidth={3} fill="url(#gwt)"  dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 7 }} />}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Payment + delivery */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col gap-6">
                <div>
                  <SectionTitle title="Payment Split" sub="This month" />
                  {pmodes.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-8">No data</p>
                    : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={pmodes} dataKey="count" nameKey="mode" cx="50%" cy="50%"
                            innerRadius={58} outerRadius={88} paddingAngle={4}
                            label={({ mode, percent }) => `${mode} ${(percent*100).toFixed(0)}%`}
                            labelLine={false}>
                            {pmodes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                    )
                  }
                </div>
                {dtypes.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Delivery Type</p>
                    <div className="flex gap-3">
                      {dtypes.map((d, i) => (
                        <div key={i} className="flex-1 rounded-xl border-2 border-gray-100 bg-gray-50 p-4 text-center">
                          <p className="text-xs font-bold uppercase text-gray-500">{d.type}</p>
                          <p className="text-2xl font-extrabold text-gray-800 mt-1">{d.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Monthly value bar chart */}
            {trend.some(t => t.value > 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                <SectionTitle title="Monthly Value Trend — 12 Months" sub="Freight value billed per month" />
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trend} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="value" name="Value (₹)" radius={[8,8,0,0]}>
                      {trend.map((_, i) => <Cell key={i} fill={i === trend.length - 1 ? '#5b21b6' : '#8b5cf6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* City breakdown — horizontal bar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <SectionTitle title="City Breakdown — Top 12" sub="Consignment volume per destination city" />
                <WindowTabs value={cityWin} onChange={setCityWin} />
              </div>
              {cities.length === 0
                ? <p className="text-base text-gray-400 text-center py-16">No city data for this period</p>
                : (
                  <ResponsiveContainer width="100%" height={Math.max(300, cities.length * 46)}>
                    <BarChart data={cities} layout="vertical" margin={{ left: 0, right: 60, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="city_name" width={110} tick={{ fontSize: 13, fill: '#374151', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="count" name="Consignments" radius={[0,8,8,0]} label={{ position: 'right', fontSize: 13, fill: '#6b7280', fontWeight: 700 }}>
                        {cities.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>

            {/* City delta cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { title: 'New Cities This Month',   items: new_cities_this_month, icon: ArrowUpRight,
                  bg: 'bg-emerald-50', border: 'border-emerald-200', head: 'text-emerald-700',
                  chip: 'bg-emerald-100 text-emerald-800', empty: 'No new cities this month' },
                { title: 'Cities No Longer Served', items: dropped_cities,        icon: X,
                  bg: 'bg-red-50',     border: 'border-red-200',     head: 'text-red-600',
                  chip: 'bg-red-100 text-red-700',         empty: 'No dropped cities' },
              ].map(({ title, items, icon: Icon, bg, border, head, chip, empty }) => (
                <div key={title} className={`rounded-2xl border-2 ${border} ${bg} p-6`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className={`h-5 w-5 ${head}`} />
                    <h4 className={`font-extrabold ${head}`}>{title}</h4>
                    <span className={`ml-auto text-sm font-extrabold px-2.5 py-1 rounded-full ${chip}`}>{items.length}</span>
                  </div>
                  {items.length === 0
                    ? <p className="text-sm text-gray-400">{empty}</p>
                    : <div className="flex flex-wrap gap-2">{items.map(c => <span key={c} className={`text-sm font-semibold px-2.5 py-1 rounded-full ${chip}`}>{c}</span>)}</div>
                  }
                </div>
              ))}

              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="h-5 w-5 text-amber-600" />
                  <h4 className="font-extrabold text-amber-700">Declining Cities</h4>
                  <span className="ml-auto text-sm font-extrabold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{declined_cities.length}</span>
                </div>
                {declined_cities.length === 0
                  ? <p className="text-sm text-gray-400">No declining cities</p>
                  : <div className="space-y-2">{declined_cities.slice(0, 6).map(c => (
                      <div key={c.city_name} className="flex justify-between text-sm py-1 border-b border-amber-100">
                        <span className="font-semibold text-gray-700">{c.city_name}</span>
                        <span className="font-extrabold text-red-500">{c.last_month_count} → {c.this_month_count} <span className="text-gray-400 font-normal">({c.change})</span></span>
                      </div>
                    ))}</div>
                }
              </div>
            </div>

            {/* Counterparty table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Top {data.party_type === 'consignor' ? 'Consignees' : 'Consignors'}
                  </h2>
                  <div className="flex gap-2 mt-2">
                    {newSet.size > 0 && <span className="text-sm font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">{newSet.size} new</span>}
                    {dropped.length > 0 && <span className="text-sm font-bold bg-red-100 text-red-600 px-3 py-1 rounded-full">{dropped.length} lost</span>}
                  </div>
                </div>
                <WindowTabs value={cpWin} onChange={setCpWin} />
              </div>
              {cps.length === 0
                ? <p className="text-base text-gray-400 text-center py-12">No counterparty data</p>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-100 text-xs text-gray-400 font-bold uppercase tracking-widest">
                          <th className="py-3 text-left pl-2 w-8">#</th>
                          <th className="py-3 text-left">Company</th>
                          <th className="py-3 text-right">Count</th>
                          <th className="py-3 text-right">Weight</th>
                          <th className="py-3 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cps.map((cp, i) => {
                          const isNew = newSet.has(cp.name);
                          const rec   = recurring.find(r => r.name === cp.name);
                          return (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 pl-2 text-gray-300 font-extrabold text-sm">{i + 1}</td>
                              <td className="py-4 pr-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-gray-800 text-base">{cp.name}</span>
                                  {isNew && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-extrabold">NEW</span>}
                                  {rec && <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${rec.change >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{rec.change >= 0 ? '+' : ''}{rec.change} vs last mo</span>}
                                </div>
                                {cp.gstin && <div className="text-xs text-gray-400 mt-0.5 font-mono">{cp.gstin}</div>}
                              </td>
                              <td className="py-4 text-right font-extrabold text-gray-800 text-base">{cp.count}</td>
                              <td className="py-4 text-right text-gray-500 text-sm">{fmtKg(cp.weight)}</td>
                              <td className="py-4 text-right font-extrabold text-gray-800 text-base">{fmtRs(cp.value)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              }
              {dropped.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-sm font-bold text-red-500">Lost this month: {dropped.map(c => c.name).join(' · ')}</p>
                </div>
              )}
            </div>

            {/* Counterparty volume bar */}
            {cps.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                <SectionTitle
                  title={`${data.party_type === 'consignor' ? 'Consignee' : 'Consignor'} Volume Comparison`}
                  sub="Shipment count by counterparty"
                />
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={cps} margin={{ top: 8, right: 16, bottom: 60, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Consignments" radius={[8,8,0,0]}>
                      {cps.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Per-counterparty 12-month trend */}
            {cpDetail.length > 0 && (
              <CounterpartyTrendChart detail={cpDetail} partyType={data.party_type} />
            )}

            {/* Relationship web */}
            {cpWeb.length > 0 && (
              <RelationshipWeb web={cpWeb} entityName={data.entity.name} partyType={data.party_type} />
            )}

          </div>
        )}
      </div>
    </div>
  );
}
