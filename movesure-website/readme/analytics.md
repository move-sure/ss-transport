# Party Analytics API — v2

Full consignor / consignee analytics including 12-month trend, per-counterparty monthly breakdown, and a **relationship web** showing how exclusively each counterparty works with the searched party vs others.

---

## Endpoint

```
GET /api/analytics/party
```

### Query Parameters

| Param   | Required | Values | Default |
|---------|----------|--------|---------|
| `query` | Yes | GSTIN (15 chars) or company name (partial) | — |
| `type`  | No | `consignor` \| `consignee` | `consignor` |

### Examples

```bash
# By GSTIN
GET /api/analytics/party?query=09AWMPS0747E1Z8&type=consignor

# By name (partial match)
GET /api/analytics/party?query=ANIL LOCKS&type=consignor

# Consignee analytics
GET /api/analytics/party?query=09BKVPM1672G1ZM&type=consignee
```

---

## Complete Response Structure

```jsonc
{
  "status": "success",

  // Who was found
  "entity": {
    "id": "uuid-or-null",
    "name": "ANIL LOCKS PRIVATE LIMITED",
    "gstin": "09AAACA2669Q1Z4",
    "matched_by": "gstin_master"   // gstin_master | gstin_bilty_fallback | name
  },

  "party_type": "consignor",
  "total_rows_fetched": 342,

  // Exact date bounds — show these in UI so user knows what "this month" means
  "windows": {
    "this_month": { "from": "2026-07-01", "to": "2026-07-10" },
    "last_month": { "from": "2026-06-01", "to": "2026-06-30" },
    "last_week":  { "from": "2026-07-04", "to": "2026-07-10" },
    "this_year":  { "from": "2026-01-01", "to": "2026-07-10" }
  },

  // ── KPI CARDS ─────────────────────────────────────────────────────────────
  "summary": {
    "this_month":     { "count": 28, "weight": 1240.5, "packages": 180, "value": 42000.0 },
    "last_month":     { "count": 35, "weight": 1680.0, "packages": 230, "value": 58000.0 },
    "last_week":      { "count": 9,  "weight": 380.0,  "packages": 55,  "value": 13500.0 },
    "this_year":      { "count": 210,"weight": 9200.0, "packages": 1400,"value": 320000.0 },
    "all_time_total": 342   // total rows in last 12 months
  },

  // ── 12-MONTH TREND (line/bar chart) ───────────────────────────────────────
  // 12 entries, one per month, oldest first
  "monthly_trend": [
    { "month": "2025-08", "label": "Aug 2025", "count": 22, "weight": 900.0,  "packages": 140, "value": 30000.0 },
    { "month": "2025-09", "label": "Sep 2025", "count": 28, "weight": 1100.0, "packages": 170, "value": 38000.0 },
    { "month": "2025-10", "label": "Oct 2025", "count": 31, "weight": 1400.0, "packages": 200, "value": 48000.0 },
    { "month": "2025-11", "label": "Nov 2025", "count": 29, "weight": 1200.0, "packages": 185, "value": 44000.0 },
    { "month": "2025-12", "label": "Dec 2025", "count": 35, "weight": 1600.0, "packages": 225, "value": 55000.0 },
    { "month": "2026-01", "label": "Jan 2026", "count": 30, "weight": 1300.0, "packages": 195, "value": 46000.0 },
    { "month": "2026-02", "label": "Feb 2026", "count": 28, "weight": 1150.0, "packages": 180, "value": 41000.0 },
    { "month": "2026-03", "label": "Mar 2026", "count": 38, "weight": 1700.0, "packages": 250, "value": 60000.0 },
    { "month": "2026-04", "label": "Apr 2026", "count": 42, "weight": 2000.0, "packages": 280, "value": 70000.0 },
    { "month": "2026-05", "label": "May 2026", "count": 40, "weight": 1900.0, "packages": 260, "value": 65000.0 },
    { "month": "2026-06", "label": "Jun 2026", "count": 35, "weight": 1680.0, "packages": 230, "value": 58000.0 },
    { "month": "2026-07", "label": "Jul 2026", "count": 28, "weight": 1240.5, "packages": 180, "value": 42000.0 }
  ],

  // ── CITY BREAKDOWN ────────────────────────────────────────────────────────
  // Sorted by count desc. pct_of_total = share of all consignments this period.
  "city_breakdown": {
    "this_month": [
      { "city_id": "uuid", "city_name": "Kanpur",   "count": 10, "weight": 450.0, "packages": 65, "value": 15000.0, "pct_of_total": 35.7 },
      { "city_id": "uuid", "city_name": "Lucknow",  "count": 8,  "weight": 320.0, "packages": 50, "value": 12000.0, "pct_of_total": 28.6 }
    ],
    "last_month": [ /* same shape */ ],
    "this_year":  [ /* same shape */ ]
  },

  // ── CITY DELTA (this month vs last month) ─────────────────────────────────
  "city_delta": {
    "new_cities_this_month": ["Agra", "Allahabad"],   // cities added this month
    "dropped_cities": ["Meerut"],                      // cities dropped vs last month
    "declined_cities": [
      { "city_name": "Kanpur", "last_month_count": 15, "this_month_count": 10, "change": -5 }
    ]
  },

  // ── COUNTERPARTY BREAKDOWN (this/last month) ──────────────────────────────
  "counterparty_breakdown": {
    "this_month": [
      { "key": "07ABCDE1234F1Z5", "name": "DELHI TRADERS",   "gstin": "07ABCDE1234F1Z5", "count": 8, "weight": 320.0, "packages": 50, "value": 12000.0 }
    ],
    "last_month": [ /* same shape */ ]
  },

  // ── COUNTERPARTY DELTA (new / dropped / recurring) ────────────────────────
  "counterparty_delta": {
    "new_this_month": [
      { "name": "AGRA WHOLESALERS", "gstin": "09AGRA1234X1Z1", "count": 3 }
    ],
    "dropped": [
      { "name": "OLD CUSTOMER LTD", "gstin": "09OLDC5678Y1Z2", "count": 5 }
    ],
    "recurring": [
      { "name": "DELHI TRADERS", "gstin": "07ABCDE1234F1Z5", "this_month_count": 8, "last_month_count": 10, "change": -2 }
    ]
  },

  // ── COUNTERPARTY MONTHLY DETAIL (NEW) ────────────────────────────────────
  // For each of the top 15 counterparties: 12-month monthly breakdown.
  // Use this to draw a "per-consignee trend line" on the graph.
  "counterparty_monthly_detail": [
    {
      "key":    "07ABCDE1234F1Z5",
      "name":   "DELHI TRADERS",
      "gstin":  "07ABCDE1234F1Z5",
      "total_12m": { "count": 68, "weight": 2800.0, "packages": 420, "value": 95000.0 },
      "active_months": 9,       // how many months they had at least 1 consignment
      "first_seen": "2025-10",  // first month in the 12m window they appeared
      "last_seen":  "2026-07",
      "monthly": [
        { "month": "2025-08", "label": "Aug 2025", "count": 0, "weight": 0,   "packages": 0, "value": 0 },
        { "month": "2025-09", "label": "Sep 2025", "count": 0, "weight": 0,   "packages": 0, "value": 0 },
        { "month": "2025-10", "label": "Oct 2025", "count": 5, "weight": 200, "packages": 30,"value": 7000 },
        { "month": "2025-11", "label": "Nov 2025", "count": 4, "weight": 160, "packages": 24,"value": 5600 },
        // ... 12 entries total
        { "month": "2026-07", "label": "Jul 2026", "count": 8, "weight": 320, "packages": 50,"value": 12000 }
      ]
    },
    // ... up to 15 counterparties
  ],

  // ── COUNTERPARTY WEB (NEW) ────────────────────────────────────────────────
  // For each of the top 10 counterparties: their TOTAL market activity
  // across ALL consignors — not just the searched party.
  // Shows how "exclusive" or "shared" the relationship is.
  "counterparty_web": [
    {
      "name":  "DELHI TRADERS",
      "gstin": "07ABCDE1234F1Z5",

      // How much they did with the SEARCHED party in 12m
      "consignments_with_subject_12m": 68,
      "weight_with_subject_12m":       2800.0,
      "packages_with_subject_12m":     420,
      "value_with_subject_12m":        95000.0,

      // Their total footprint (across all partners in our system)
      "total_consignments_12m":    120,
      "total_distinct_partners":   4,    // they work with 4 different consignors total

      // Exclusivity: 68/120 = 56.7% of their shipments are with you
      "exclusivity_pct": 56.7,

      // Who else they work with (top 5 other partners)
      "other_top_partners": [
        { "name": "SHARMA TRADERS",  "gstin": "09SHAR5678Y1Z1", "count": 28 },
        { "name": "JAIN INDUSTRIES", "gstin": "09JAIN9012Z1Z2", "count": 15 },
        { "name": "GUPTA EXPORTS",   "gstin": "09GUPT3456A1Z3", "count": 9  }
      ],

      // 12-month monthly breakdown — dual data for graph:
      //   total_count = their total volume that month (all partners)
      //   with_subject_count = volume with searched party only
      "monthly_activity": [
        {
          "month": "2025-08", "label": "Aug 2025",
          "total_count": 8,  "total_weight": 320, "total_packages": 48, "total_value": 11000,
          "with_subject_count": 0, "with_subject_weight": 0, "with_subject_packages": 0, "with_subject_value": 0
        },
        {
          "month": "2026-07", "label": "Jul 2026",
          "total_count": 12, "total_weight": 490, "total_packages": 72, "total_value": 17500,
          "with_subject_count": 8, "with_subject_weight": 320, "with_subject_packages": 50, "with_subject_value": 12000
        }
        // ... 12 entries
      ]
    }
    // ... up to 10 counterparties
  ],

  // ── PAYMENT / DELIVERY BREAKDOWN ──────────────────────────────────────────
  "payment_mode_breakdown": {
    "this_month": [
      { "mode": "TO-PAY", "count": 16 },
      { "mode": "PAID",   "count": 10 },
      { "mode": "FOC",    "count": 2  }
    ]
  },
  "delivery_type_breakdown": {
    "this_month": [
      { "type": "godown", "count": 20 },
      { "type": "door",   "count": 8  }
    ]
  }
}
```

---

## Field-to-Graph Mapping

| Graph / Widget | API Field |
|----------------|-----------|
| Total consignments KPI | `summary.this_month.count` |
| MoM % change | `(this_month.count - last_month.count) / last_month.count * 100` |
| 12-month line chart | `monthly_trend[].count` + `.weight` |
| Top cities bar chart | `city_breakdown.this_month[]` |
| City share pie | `city_breakdown.this_month[].pct_of_total` |
| New cities badge | `city_delta.new_cities_this_month` |
| Cities in decline table | `city_delta.declined_cities` |
| Top counterparties list | `counterparty_breakdown.this_month[]` |
| Per-counterparty trend (12 lines) | `counterparty_monthly_detail[].monthly[]` |
| Active months badge | `counterparty_monthly_detail[].active_months` |
| New business | `counterparty_delta.new_this_month` |
| Lost business | `counterparty_delta.dropped` |
| Exclusivity score | `counterparty_web[].exclusivity_pct` |
| Web dual bar (total vs with-you) | `counterparty_web[].monthly_activity[]` |
| Other partners of consignee | `counterparty_web[].other_top_partners[]` |
| Payment mode donut | `payment_mode_breakdown.this_month[]` |
| Delivery type split | `delivery_type_breakdown.this_month[]` |

---

## Error Responses

| Scenario | Status | Message |
|----------|--------|---------|
| Not found | 404 | `"No consignor found matching '...'"` |
| Invalid type | 400 | `"type must be 'consignor' or 'consignee'"` |
| Missing query | 400 | `"query parameter is required"` |

---

## How Matching Works

```
Input query
  │
  ├─ 15-char alphanumeric? ──► GSTIN path
  │       ├─ consignors/consignees table (gst_num)   → matched_by: "gstin_master"
  │       └─ bilty.consignor_gst fallback            → matched_by: "gstin_bilty_fallback"
  │
  └─ Otherwise ──► Name path
          └─ ilike "%query%" on company_name         → matched_by: "name"
```

GST is always preferred — names drift after updates, GSTIN is stable.

---

## Service File Reference

```
services/analytics/
├── __init__.py
└── party_analytics_service.py
      ├── get_party_analytics(query, party_type)        ← public entry point
      ├── _resolve_entity(sb, query, party_type)        ← GSTIN / name → entity
      ├── _fetch_bilties(sb, entity, party_type, from)  ← paginated main fetch
      ├── _build_city_map(sb)                           ← {city_id: city_name}
      ├── _aggregate(rows, city_map, entity, ...)       ← all computations
      ├── _fetch_counterparty_web(sb, top_cps, ...)     ← web relationship queries
      └── _date_windows(anchor)                         ← 12m window bounds
```

---

## Frontend Implementation Guide

### Stack: React + TypeScript + Recharts

Install Recharts if not already installed:
```bash
npm install recharts
```

---

### API Hook

```tsx
// hooks/usePartyAnalytics.ts
import { useState } from "react";

const BASE = process.env.REACT_APP_API_URL; // e.g. http://localhost:5000

export interface MonthBucket {
  month: string; label: string;
  count: number; weight: number; packages: number; value: number;
}

export interface CounterpartyMonthly {
  key: string; name: string; gstin: string;
  total_12m: { count: number; weight: number; packages: number; value: number };
  active_months: number;
  first_seen: string | null;
  last_seen: string | null;
  monthly: MonthBucket[];
}

export interface WebActivity {
  month: string; label: string;
  total_count: number; total_weight: number;
  with_subject_count: number; with_subject_weight: number;
}

export interface CounterpartyWeb {
  name: string; gstin: string;
  consignments_with_subject_12m: number;
  weight_with_subject_12m: number;
  packages_with_subject_12m: number;
  value_with_subject_12m: number;
  total_consignments_12m: number;
  total_distinct_partners: number;
  exclusivity_pct: number;
  other_top_partners: { name: string; gstin: string; count: number }[];
  monthly_activity: WebActivity[];
}

export interface AnalyticsData {
  status: string;
  entity: { name: string; gstin: string; matched_by: string };
  party_type: string;
  windows: Record<string, { from: string; to: string }>;
  total_rows_fetched: number;
  summary: Record<string, { count: number; weight: number; packages: number; value: number }>;
  monthly_trend: MonthBucket[];
  city_breakdown: Record<string, { city_name: string; count: number; weight: number; pct_of_total: number }[]>;
  city_delta: { new_cities_this_month: string[]; dropped_cities: string[]; declined_cities: any[] };
  counterparty_breakdown: Record<string, { name: string; gstin: string; count: number; value: number }[]>;
  counterparty_delta: { new_this_month: any[]; dropped: any[]; recurring: any[] };
  counterparty_monthly_detail: CounterpartyMonthly[];
  counterparty_web: CounterpartyWeb[];
  payment_mode_breakdown: { this_month: { mode: string; count: number }[] };
  delivery_type_breakdown: { this_month: { type: string; count: number }[] };
}

export function usePartyAnalytics() {
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const search = async (query: string, type: "consignor" | "consignee") => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${BASE}/api/analytics/party?query=${encodeURIComponent(query)}&type=${type}`);
      const json = await res.json();
      if (json.status === "success") {
        setData(json);
      } else {
        setError(json.message || "Not found");
        setData(null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, search };
}
```

---

### Component 1 — Search Bar

```tsx
// components/analytics/PartySearchBar.tsx
import { useState } from "react";

export function PartySearchBar({ onSearch, loading }: {
  onSearch: (q: string, t: "consignor" | "consignee") => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [type, setType]   = useState<"consignor" | "consignee">("consignor");

  return (
    <div className="flex gap-2">
      <input
        className="flex-1 border rounded-lg px-3 py-2 text-sm"
        placeholder="Enter GSTIN (09XXXX...) or company name..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onSearch(query, type)}
      />
      <select
        className="border rounded-lg px-3 py-2 text-sm"
        value={type}
        onChange={e => setType(e.target.value as any)}
      >
        <option value="consignor">Consignor</option>
        <option value="consignee">Consignee</option>
      </select>
      <button
        className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        onClick={() => onSearch(query, type)}
        disabled={loading || !query.trim()}
      >
        {loading ? "Loading..." : "Analyse"}
      </button>
    </div>
  );
}
```

---

### Component 2 — KPI Summary Cards

```tsx
// components/analytics/SummaryCards.tsx
import { AnalyticsData } from "../../hooks/usePartyAnalytics";

function pctChange(curr: number, prev: number): string | null {
  if (!prev) return null;
  const pct = ((curr - prev) / prev * 100).toFixed(1);
  return `${curr >= prev ? "+" : ""}${pct}% vs last month`;
}

export function SummaryCards({ data }: { data: AnalyticsData }) {
  const tm = data.summary.this_month;
  const lm = data.summary.last_month;
  const wk = data.summary.last_week;

  const cards = [
    { label: "This Month",   value: tm.count,                      sub: "consignments",     delta: pctChange(tm.count, lm.count),   up: tm.count >= lm.count },
    { label: "Last Month",   value: lm.count,                      sub: "consignments" },
    { label: "Last 7 Days",  value: wk.count,                      sub: "consignments" },
    { label: "This Year",    value: data.summary.this_year.count,  sub: "consignments" },
    { label: "Weight (Mo)",  value: `${tm.weight} kg`,             sub: `${lm.weight} kg last mo`, delta: pctChange(tm.weight, lm.weight), up: tm.weight >= lm.weight },
    { label: "Packages (Mo)",value: tm.packages,                    sub: `${lm.packages} last mo` },
    { label: "Value (Mo)",   value: `₹${tm.value.toLocaleString()}`, sub: "" },
    { label: "Cities (Mo)",  value: data.city_breakdown.this_month.length, sub: "destinations" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <div key={i} className="bg-white rounded-xl shadow p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{c.label}</div>
          <div className="text-2xl font-bold text-gray-800">{c.value}</div>
          {c.sub && <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>}
          {c.delta && (
            <div className={`text-xs font-semibold mt-1 ${c.up ? "text-green-600" : "text-red-500"}`}>
              {c.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### Component 3 — 12-Month Overall Trend

```tsx
// components/analytics/TrendChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { AnalyticsData } from "../../hooks/usePartyAnalytics";

export function TrendChart({ data }: { data: AnalyticsData }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3">12-Month Trend</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data.monthly_trend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
          <YAxis yAxisId="left"  orientation="left"  tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left"  type="monotone" dataKey="count"   name="Consignments" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
          <Line yAxisId="right" type="monotone" dataKey="weight"  name="Weight (kg)"  stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### Component 4 — Per-Counterparty Monthly Detail

This draws one line per counterparty on the same chart, so you can see each consignee's 12-month activity with the searched consignor.

```tsx
// components/analytics/CounterpartyTrendChart.tsx
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { AnalyticsData } from "../../hooks/usePartyAnalytics";

const COLORS = ["#2563eb","#dc2626","#16a34a","#d97706","#7c3aed","#0891b2","#db2777","#65a30d","#ea580c","#6366f1"];

export function CounterpartyTrendChart({ data }: { data: AnalyticsData }) {
  const detail = data.counterparty_monthly_detail;
  const [selected, setSelected] = useState<Set<string>>(
    new Set(detail.slice(0, 5).map(d => d.key))  // default: top 5 selected
  );

  // Reshape into [{label, [cp_key]: count, ...}]
  const months = detail[0]?.monthly.map(m => m.label) || [];
  const chartData = detail[0]?.monthly.map((_, i) => {
    const row: Record<string, any> = { label: detail[0].monthly[i].label };
    detail.forEach(cp => {
      row[cp.key] = cp.monthly[i].count;
    });
    return row;
  }) || [];

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3">
        {data.party_type === "consignor" ? "Consignee" : "Consignor"} Monthly Activity (12 months)
      </h3>

      {/* Toggle chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {detail.map((cp, i) => (
          <button
            key={cp.key}
            onClick={() => toggle(cp.key)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
              selected.has(cp.key)
                ? "text-white border-transparent"
                : "bg-white text-gray-500 border-gray-300"
            }`}
            style={selected.has(cp.key) ? { background: COLORS[i % COLORS.length] } : {}}
          >
            {cp.name || cp.gstin} ({cp.total_12m.count})
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {detail.map((cp, i) =>
            selected.has(cp.key) ? (
              <Line
                key={cp.key}
                type="monotone"
                dataKey={cp.key}
                name={cp.name || cp.gstin}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Detail table below chart */}
      <table className="w-full text-xs mt-4">
        <thead>
          <tr className="text-gray-400 border-b">
            <th className="text-left py-1.5">Company</th>
            <th className="text-right py-1.5">Total 12m</th>
            <th className="text-right py-1.5">Weight</th>
            <th className="text-right py-1.5">Active Months</th>
            <th className="text-right py-1.5">First Seen</th>
            <th className="text-right py-1.5">Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {detail.map((cp, i) => (
            <tr key={cp.key} className="border-b hover:bg-gray-50">
              <td className="py-1.5 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="font-medium">{cp.name}</span>
                {cp.gstin && <span className="text-gray-400 ml-1">{cp.gstin}</span>}
              </td>
              <td className="text-right">{cp.total_12m.count}</td>
              <td className="text-right">{cp.total_12m.weight} kg</td>
              <td className="text-right">{cp.active_months} / 12</td>
              <td className="text-right">{cp.first_seen || "—"}</td>
              <td className="text-right">{cp.last_seen  || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Component 5 — Counterparty Web (Relationship View)

Shows each counterparty's total market footprint and what % of their shipments are with the searched party.

```tsx
// components/analytics/CounterpartyWebView.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { AnalyticsData, CounterpartyWeb } from "../../hooks/usePartyAnalytics";
import { useState } from "react";

export function CounterpartyWebView({ data }: { data: AnalyticsData }) {
  const web = data.counterparty_web;
  const [selected, setSelected] = useState<CounterpartyWeb | null>(web[0] || null);

  if (!web.length) return null;

  const label = data.party_type === "consignor" ? "Consignee" : "Consignor";

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-1">Relationship Web</h3>
      <p className="text-xs text-gray-400 mb-4">
        How much of each {label.toLowerCase()}'s total shipments are with {data.entity.name}?
      </p>

      {/* Exclusivity overview — one row per counterparty */}
      <div className="space-y-2 mb-6">
        {web.map((cp, i) => (
          <button
            key={cp.name}
            className={`w-full text-left rounded-lg p-3 border transition-all ${
              selected?.name === cp.name ? "border-blue-400 bg-blue-50" : "border-gray-100 hover:border-gray-300"
            }`}
            onClick={() => setSelected(cp)}
          >
            <div className="flex justify-between items-center mb-1">
              <div>
                <span className="text-sm font-semibold">{cp.name}</span>
                {cp.gstin && <span className="text-xs text-gray-400 ml-2">{cp.gstin}</span>}
              </div>
              <div className="text-right">
                <span className="text-sm font-bold" style={{ color: cp.exclusivity_pct >= 50 ? "#16a34a" : cp.exclusivity_pct >= 20 ? "#d97706" : "#dc2626" }}>
                  {cp.exclusivity_pct}% with you
                </span>
                <div className="text-xs text-gray-400">{cp.total_distinct_partners} other partners</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${Math.min(cp.exclusivity_pct, 100)}%`,
                  background: cp.exclusivity_pct >= 50 ? "#16a34a" : cp.exclusivity_pct >= 20 ? "#d97706" : "#dc2626",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{cp.consignments_with_subject_12m} with you</span>
              <span>{cp.total_consignments_12m} total (12m)</span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected counterparty detail */}
      {selected && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-700 mb-3">
            {selected.name} — Monthly Activity
          </h4>

          {/* Dual bar: total vs with-subject */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={selected.monthly_activity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_count"        name="Total (all partners)"    fill="#e2e8f0" />
              <Bar dataKey="with_subject_count" name={`With ${data.entity.name}`} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>

          {/* Other partners they work with */}
          {selected.other_top_partners.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">
                Other partners this {label.toLowerCase()} works with
              </div>
              <div className="space-y-1">
                {selected.other_top_partners.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm border-b pb-1">
                    <span>{p.name} {p.gstin && <span className="text-xs text-gray-400">{p.gstin}</span>}</span>
                    <span className="font-medium">{p.count} consignments</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### Component 6 — City Bar Chart

```tsx
// components/analytics/CityChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AnalyticsData } from "../../hooks/usePartyAnalytics";

const COLORS = ["#2563eb","#7c3aed","#db2777","#ea580c","#16a34a","#0891b2","#ca8a04","#dc2626","#059669","#8b5cf6"];

export function CityChart({ data }: { data: AnalyticsData }) {
  const cities = data.city_breakdown.this_month.slice(0, 10);
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-700">Top Cities — This Month</h3>
        <div className="flex gap-2 text-xs">
          {data.city_delta.new_cities_this_month.length > 0 && (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              +{data.city_delta.new_cities_this_month.length} new
            </span>
          )}
          {data.city_delta.dropped_cities.length > 0 && (
            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              -{data.city_delta.dropped_cities.length} dropped
            </span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={cities} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="city_name" width={90} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: any) => [v, "Consignments"]} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {cities.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### Component 7 — City Delta Cards

```tsx
// components/analytics/CityDeltaCards.tsx
import { AnalyticsData } from "../../hooks/usePartyAnalytics";

export function CityDeltaCards({ data }: { data: AnalyticsData }) {
  const { new_cities_this_month, dropped_cities, declined_cities } = data.city_delta;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-green-700 mb-2">New Cities This Month</h4>
        {new_cities_this_month.length === 0
          ? <p className="text-xs text-gray-400">None</p>
          : new_cities_this_month.map(c => (
              <span key={c} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full mr-1 mb-1">{c}</span>
            ))
        }
      </div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-red-600 mb-2">Dropped Cities</h4>
        {dropped_cities.length === 0
          ? <p className="text-xs text-gray-400">None</p>
          : dropped_cities.map(c => (
              <span key={c} className="inline-block bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full mr-1 mb-1">{c}</span>
            ))
        }
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-yellow-700 mb-2">Declining Cities</h4>
        {declined_cities.length === 0
          ? <p className="text-xs text-gray-400">None</p>
          : declined_cities.slice(0, 5).map(c => (
              <div key={c.city_name} className="flex justify-between text-xs mb-1">
                <span>{c.city_name}</span>
                <span className="text-red-500">{c.last_month_count} → {c.this_month_count} ({c.change})</span>
              </div>
            ))
        }
      </div>
    </div>
  );
}
```

---

### Component 8 — Full Dashboard Page

```tsx
// pages/PartyAnalyticsPage.tsx
import { usePartyAnalytics }      from "../hooks/usePartyAnalytics";
import { PartySearchBar }         from "../components/analytics/PartySearchBar";
import { SummaryCards }           from "../components/analytics/SummaryCards";
import { TrendChart }             from "../components/analytics/TrendChart";
import { CityChart }              from "../components/analytics/CityChart";
import { CityDeltaCards }         from "../components/analytics/CityDeltaCards";
import { CounterpartyTrendChart } from "../components/analytics/CounterpartyTrendChart";
import { CounterpartyWebView }    from "../components/analytics/CounterpartyWebView";

export function PartyAnalyticsPage() {
  const { data, loading, error, search } = usePartyAnalytics();

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">Party Analytics</h1>

      <PartySearchBar onSearch={search} loading={loading} />

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Entity header */}
          <div className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{data.entity.name}</h2>
              <p className="text-sm text-gray-500">
                {data.entity.gstin || "No GSTIN"} · {data.party_type} · {data.total_rows_fetched} bilties (12m)
              </p>
            </div>
            <div className="text-xs text-gray-400 text-right space-y-0.5">
              <div>This month: {data.windows.this_month.from} → {data.windows.this_month.to}</div>
              <div>Last month: {data.windows.last_month.from} → {data.windows.last_month.to}</div>
              <div>Matched by: {data.entity.matched_by}</div>
            </div>
          </div>

          {/* KPI Cards */}
          <SummaryCards data={data} />

          {/* 12-month overall trend */}
          <TrendChart data={data} />

          {/* City breakdown + delta */}
          <CityChart data={data} />
          <CityDeltaCards data={data} />

          {/* Per-counterparty 12-month trend (toggle lines) */}
          <CounterpartyTrendChart data={data} />

          {/* Relationship web */}
          <CounterpartyWebView data={data} />
        </>
      )}
    </div>
  );
}
```

---

## Dashboard Layout (Visual)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [ Search: GSTIN or name... ]  [ Consignor ▼ ]  [ Analyse ]               │
├────────────────────────────────────────────────────────────────────────────┤
│  ANIL LOCKS PRIVATE LIMITED   09AAACA2669Q1Z4  ·  consignor               │
│  This month: Jul 1–10  ·  Last month: Jun 1–30  ·  342 bilties (12m)      │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤
│ This Mo  │ Last Mo  │ Last 7d  │ This Yr  │ Wt(Mo)  │ Pkg(Mo) │ Val(Mo) │
│  28 +3%  │  35      │  9       │  210     │1240 kg  │  180    │ ₹42000 │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴─────────┤
│  12-Month Overall Trend (count left axis, weight right axis)               │
│  Aug─Sep─Oct─Nov─Dec─Jan─Feb─Mar─Apr─May─Jun─Jul                          │
├────────────────────────────────────────────────────────────────────────────┤
│  Top Cities Bar Chart (horizontal, top 10) │ +2 new  -1 dropped           │
├───────────────────┬──────────────────────────┬────────────────────────────┤
│ NEW CITIES        │ DROPPED CITIES            │ DECLINING CITIES            │
│ Agra, Allahabad   │ Meerut                   │ Kanpur: 15→10 (-5)          │
├────────────────────────────────────────────────────────────────────────────┤
│  Per-Consignee 12-Month Trend (toggle chips for each consignee)            │
│  [DELHI TRADERS ×] [UP DISTRIBUTORS ×] [JAIN INDUSTRIES]  ...             │
│  Line chart — each line = one consignee's monthly count with this party    │
│  Table below: active months, first seen, last seen, 12m total              │
├────────────────────────────────────────────────────────────────────────────┤
│  Relationship Web                                                           │
│  DELHI TRADERS ████████████████░░░░ 56.7% with you  4 other partners      │
│  UP DISTRIBUT. ██████░░░░░░░░░░░░░░ 31.2% with you  7 other partners      │
│  JAIN IND.     ████░░░░░░░░░░░░░░░░ 18.5% with you  9 other partners      │
│  ─────────────────────────────────────────────────────────────────────     │
│  [Selected: DELHI TRADERS]                                                 │
│  Dual bar: ░ = total shipments, ■ = with you — per month                  │
│  Other partners: SHARMA TRADERS (28)  JAIN IND (15)  GUPTA EXP (9)       │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Understanding `exclusivity_pct`

```
exclusivity_pct = (consignments_with_subject_12m / total_consignments_12m) × 100

≥ 70%  → High exclusivity — this consignee mainly ships through you
30–70% → Moderate — they use multiple transporters
< 30%  → Low — they work with many others; you're one of several options
```

Use colour coding: green ≥ 50%, orange 20–49%, red < 20%.

---

## Key Notes

1. **12-month window** — data always covers the last 12 calendar months. `windows` in the response contains exact dates.
2. **Pagination** — the service pages through bilty in 1 000-row chunks; all rows are loaded before aggregation.
3. **WEB_TOP_N = 10** — counterparty web queries run for the top 10 counterparties only (by 12m consignment count) to keep response time reasonable.
4. **counterparty_monthly_detail top 15** — monthly detail is returned for top 15 counterparties by 12m total.
5. **`exclusivity_pct` uses your system's data only** — if a counterparty uses other transporters whose bilties aren't in your DB, the total will be under-counted and exclusivity over-estimated.
