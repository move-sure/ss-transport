'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MODE_COLORS = {
  'TO-PAY': '#f59e0b',
  'PAID':   '#22c55e',
  'FOC':    '#94a3b8',
};

export default function PaymentDonut({ data }) {
  const modes = data.payment_mode_breakdown?.this_month || [];
  const deliveryTypes = data.delivery_type_breakdown?.this_month || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Payment Mode</h3>
        {modes.length === 0 ? (
          <p className="text-xs text-gray-400">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={modes}
                dataKey="count"
                nameKey="mode"
                cx="50%"
                cy="50%"
                outerRadius={65}
                label={({ mode, percent }) => `${mode} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {modes.map((m, i) => (
                  <Cell key={i} fill={MODE_COLORS[m.mode] || '#6366f1'} />
                ))}
              </Pie>
              <Tooltip formatter={(val, name) => [val, name]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {deliveryTypes.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-2 text-sm">Delivery Type</h3>
          <div className="flex gap-3">
            {deliveryTypes.map((d, i) => (
              <div key={i} className="flex-1 rounded-lg bg-gray-50 border border-gray-100 p-2 text-center">
                <p className="text-xs font-semibold uppercase text-gray-500">{d.type}</p>
                <p className="text-lg font-bold text-gray-800">{d.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
