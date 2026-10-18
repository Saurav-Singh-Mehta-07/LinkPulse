import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from 'recharts'
import { deviceData, sourceData, trendData } from '../data/mockData'

const chartTooltip = {
  contentStyle: { background: '#141c1e', border: '1px solid #293638', borderRadius: 10, color: '#eff6f3', fontSize: 12 },
  labelStyle: { color: '#8d9d9e', marginBottom: 4 },
  itemStyle: { color: '#d6e2de' },
}

export function ClickTrendChart({ compact = false, data = trendData }) {
  return <div className={`chart-wrap ${compact ? 'chart-compact' : ''}`}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="click-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#73e2c1" stopOpacity={0.22} /><stop offset="90%" stopColor="#73e2c1" stopOpacity={0} /></linearGradient>
          <linearGradient id="visitor-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6caaff" stopOpacity={0.13} /><stop offset="90%" stopColor="#6caaff" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke="#263234" strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#718184', fontSize: 11 }} tickMargin={11} minTickGap={26} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#718184', fontSize: 11 }} tickFormatter={(value) => `${value / 1000}k`} />
        <Tooltip {...chartTooltip} formatter={(value, name) => [Number(value).toLocaleString(), name === 'clicks' ? 'Clicks' : 'Unique visitors']} />
        <Area type="monotone" dataKey="clicks" stroke="#73e2c1" strokeWidth={2.3} fill="url(#click-fill)" activeDot={{ r: 4, strokeWidth: 0 }} />
        {!compact && <Area type="monotone" dataKey="visitors" stroke="#6caaff" strokeWidth={1.8} fill="url(#visitor-fill)" activeDot={{ r: 3, strokeWidth: 0 }} />}
      </AreaChart>
    </ResponsiveContainer>
  </div>
}

export function SourceChart({ devices = false, values }) {
  const fallback = devices ? deviceData : sourceData
  const colors = ['#73e2c1', '#68a9ff', '#a98aff', '#f2bb69', '#e4829e', '#8d9d9e']
  const rawData = values?.length ? values.map((item) => ({
    name: item.name || item.device || item.source || item.browser || 'Other',
    count: item.clicks || 0,
  })) : values ? [] : fallback.map((item) => ({ name: item.name, count: item.value }))
  const total = rawData.reduce((sum, item) => sum + item.count, 0)
  const data = rawData.map((item, index) => ({
    name: item.name,
    value: total ? Math.round(item.count * 1000 / total) / 10 : 0,
    color: colors[index % colors.length],
  }))
  if (!data.length || !total) {
    return <div className="empty-state"><h3>No traffic data yet</h3><p>Chart breakdowns appear after links receive clicks.</p></div>
  }
  return <div className="donut-layout">
    <div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="67%" outerRadius="91%" paddingAngle={3} stroke="none">{data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip {...chartTooltip} formatter={(value) => [`${value}%`, 'Share']} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{total.toLocaleString()}</strong><small>{devices ? 'clicks' : 'clicks'}</small></div></div>
    <div className="chart-legend">{data.map((item) => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><strong>{item.value}%</strong></div>)}</div>
  </div>
}
