'use client';

const delta = (current, previous) => {
  if (!previous) return null;
  const pct = ((current - previous) / previous * 100).toFixed(1);
  return { pct, up: current >= previous };
};

function Card({ label, value, sub, badge, badgeColor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <span className="text-2xl font-bold text-gray-800">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
      {badge && (
        <span className={`text-xs font-semibold ${badgeColor === 'green' ? 'text-green-600' : 'text-red-500'}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

export default function SummaryCards({ data }) {
  const tm = data.summary.this_month;
  const lm = data.summary.last_month;
  const wk = data.summary.last_week;
  const yr = data.summary.this_year;
  const d  = delta(tm.count, lm.count);
  const dw = delta(tm.weight, lm.weight);
  const dv = delta(tm.value, lm.value);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card
        label="This Month"
        value={tm.count}
        sub="consignments"
        badge={d ? `${d.up ? '+' : ''}${d.pct}% vs last month` : undefined}
        badgeColor={d?.up ? 'green' : 'red'}
      />
      <Card label="Last Month" value={lm.count} sub="consignments" />
      <Card label="Last 7 Days" value={wk.count} sub="consignments" />
      <Card label="This Year" value={yr.count} sub={`${data.summary.all_time_total} all time`} />

      <Card
        label="Weight This Month"
        value={`${tm.weight.toLocaleString()} kg`}
        sub={`${lm.weight.toLocaleString()} kg last month`}
        badge={dw ? `${dw.up ? '+' : ''}${dw.pct}%` : undefined}
        badgeColor={dw?.up ? 'green' : 'red'}
      />
      <Card label="Packages This Month" value={tm.packages} sub={`${lm.packages} last month`} />
      <Card
        label="Value This Month"
        value={`₹${tm.value.toLocaleString('en-IN')}`}
        sub={`₹${lm.value.toLocaleString('en-IN')} last month`}
        badge={dv ? `${dv.up ? '+' : ''}${dv.pct}%` : undefined}
        badgeColor={dv?.up ? 'green' : 'red'}
      />
      <Card
        label="Cities Reached"
        value={(data.city_breakdown.this_month || []).length}
        sub="this month"
      />
    </div>
  );
}
