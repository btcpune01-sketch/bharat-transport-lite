import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

function MonthlyChart({ title, description, data, color }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <div className="h-64 w-full" role="img" aria-label={`${title} for the last 12 months`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} width={42} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.period || ''}
              formatter={(value) => [value, 'Count']}
              cursor={{ fill: '#f1f5f9' }}
            />
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default function MonthlyStatsCharts({ bills = [], bilties = [] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MonthlyChart
        title="Monthly Bill Count"
        description="Bills created each month over the last 12 months"
        data={bills}
        color="#0f766e"
      />
      <MonthlyChart
        title="Monthly Bilty Count"
        description="Bilties created each month over the last 12 months"
        data={bilties}
        color="#2563eb"
      />
    </div>
  )
}
