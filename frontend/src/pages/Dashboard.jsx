import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Clock3, Link2, MousePointer2, Plus, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ClickTrendChart, SourceChart } from '../components/Charts'
import LinkTable from '../components/LinkTable'
import { Card, PageHeader } from '../components/ui'
import { api } from '../services/api'
import { useApp } from '../context/AppContext'

const statIcons = [MousePointer2, Link2, UsersRound]
const periods = ['Last 7 days', 'Last 30 days', 'Last 90 days']

function queryFor(period) {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - Number(period.match(/\d+/)?.[0] || 30))
  return { from: from.toISOString(), to: to.toISOString(), groupBy: 'day' }
}

export default function Dashboard() {
  const { links, campaigns, user, notify } = useApp()
  const [period, setPeriod] = useState(periods[1])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requestError, setRequestError] = useState('')
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setRequestError('')
    api.analytics.get(queryFor(period))
      .then((result) => { if (!cancelled) setReport(result) })
      .catch((error) => { if (!cancelled) { setRequestError(error.message); notify(error.message, 'error') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period, notify])

  const trend = useMemo(() => (report?.clickTrend || []).map((item) => ({
    date: new Date(item.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    clicks: item.clicks,
    visitors: item.uniqueVisitors,
  })), [report])
  const statValues = [
    report?.totalClicks ?? 0,
    report?.activeLinks ?? 0,
    report?.uniqueVisitors ?? 0,
  ]
  const statLabels = ['Total clicks', 'Active links', 'Unique visitors']
  const latestLinks = [...links].sort((a, b) => new Date(b.createdAt || b.created) - new Date(a.createdAt || a.created)).slice(0, 5)
  const bestCampaigns = campaigns
    .map((item) => ({ ...item, clickCount: report?.campaigns?.find((row) => row.campaignId === item.id)?.clicks || 0 }))
    .sort((a, b) => b.clickCount - a.clickCount).slice(0, 3)
  const campaignTotal = bestCampaigns[0]?.clickCount || 0
  const expiring = report?.expiringLinks || []

  return <div className="page-stack">
    <PageHeader eyebrow="LINK PERFORMANCE" title={`Good to see you, ${(user?.name || 'there').split(' ')[0]}`} description="A clear view of your links and their performance." actions={<><select className="select-button" aria-label="Dashboard reporting period" value={period} onChange={(event) => setPeriod(event.target.value)}>{periods.map((item) => <option key={item}>{item}</option>)}</select><Link to="/app/links/new" className="button button-primary"><Plus size={16} /> Create link</Link></>} />
    {requestError && <div className="warning-callout" role="alert">{requestError}</div>}
    <div className="stats-grid">{statLabels.map((label, index) => { const Icon = statIcons[index]; return <Card className="stat-card" key={label}><div className="stat-top"><span className={`stat-icon stat-${['mint', 'blue', 'violet'][index]}`}><Icon size={18} /></span><span className="stat-period">{period.toLowerCase()}</span></div><div className="stat-label">{label}</div><div className="stat-bottom"><strong>{loading ? '—' : statValues[index].toLocaleString()}</strong></div></Card> })}</div>
    <div className="dashboard-grid-main">
      <Card className="chart-card"><div className="card-heading"><div><h2>Click performance</h2><p>Clicks and unique visitors · {period.toLowerCase()}</p></div><span className="chart-range-label">{trend.length} days</span></div><div className="chart-metrics"><div><i className="legend-dot mint-dot" />Total clicks <strong>{(report?.totalClicks || 0).toLocaleString()}</strong></div><div><i className="legend-dot blue-dot" />Unique visitors <strong>{(report?.uniqueVisitors || 0).toLocaleString()}</strong></div></div><div className="main-line-chart">{loading ? <div className="route-loading" role="status">Loading analytics…</div> : trend.length ? <ClickTrendChart data={trend} /> : <div className="empty-state"><h3>No click activity yet</h3><p>Share one of your short links to start seeing performance data.</p></div>}</div></Card>
      <Card className="traffic-card"><div className="card-heading"><div><h2>Traffic sources</h2><p>Where your audience comes from</p></div></div><SourceChart values={report?.sources || []} /><Link to="/app/analytics" className="card-link">View traffic report <ArrowRight size={14} /></Link></Card>
    </div>
    <div className="dashboard-grid-secondary">
      <Card className="recent-card"><div className="card-heading"><div><h2>Recent links</h2><p>Your latest shortened URLs</p></div><Link to="/app/links" className="card-link">View all <ArrowRight size={14} /></Link></div>{latestLinks.length ? <LinkTable rows={latestLinks} compact /> : <div className="empty-state"><span className="empty-icon"><Link2 size={22} /></span><h3>No links yet</h3><p>Create your first short link to begin.</p><Link className="text-link" to="/app/links/new">Create a link <ArrowRight size={14} /></Link></div>}</Card>
      <Card className="campaign-card"><div className="card-heading"><div><h2>Top campaigns</h2><p>Performance at a glance</p></div><Link to="/app/campaigns" className="card-link">All campaigns <ArrowRight size={14} /></Link></div>{bestCampaigns.length ? <div className="campaign-list">{bestCampaigns.map((item) => <div className="campaign-row" key={item.id}><span className="campaign-monogram">{item.name.slice(0, 1)}</span><div className="campaign-info"><div><strong>{item.name}</strong><span>{item.links} links</span></div><div className="progress-track"><i style={{ width: `${campaignTotal ? Math.round(item.clickCount / campaignTotal * 100) : 0}%` }} /></div></div><div className="campaign-result"><strong>{item.clickCount.toLocaleString()}</strong></div></div>)}</div> : <div className="empty-state"><h3>No campaigns yet</h3><p>Create a campaign to organize related links.</p></div>}</Card>
    </div>
    <div className="dashboard-grid-tertiary">
      <Card className="device-card"><div className="card-heading"><div><h2>Devices</h2><p>Clicks by device type</p></div></div><SourceChart devices values={report?.devices || []} /></Card>
      <Card className="alert-card"><div className="card-heading"><div><h2>Expiring links</h2><p>Links scheduled to expire within 7 days</p></div><span className="alert-count">{expiring.length}</span></div>{expiring.length ? expiring.slice(0, 4).map((item) => {
        const match = links.find((link) => link.code === item.code || link.alias === item.code)
        return <div className="attention-item" key={item.code}><span className="attention-icon warning-icon"><Clock3 size={16} /></span><div><strong>{item.code}</strong><small>Expires {new Date(item.expiresAt).toLocaleString()}</small></div>{match && <Link to={`/app/links/${match.id}`} aria-label={`View ${item.code}`}><ArrowRight size={15} /></Link>}</div>
      }) : <div className="empty-state"><h3>No upcoming expirations</h3><p>Your active links have no scheduled expiry in the next week.</p></div>}</Card>
      <Card className="insight-card"><span className="insight-tag"><ArrowUpRight size={13} /> LIVE REPORT</span><h3>Your links have earned<br /><span>{(report?.totalClicks || 0).toLocaleString()} clicks</span></h3><p>Metrics reflect the selected date range and update from recorded link activity.</p><Link to="/app/analytics" className="insight-link">Explore analytics <ArrowRight size={14} /></Link></Card>
    </div>
  </div>
}
