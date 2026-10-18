import { useEffect, useState } from 'react'
import { Activity, ArrowRight, CircleAlert, Globe2, Plus, Search, ShieldAlert, ShieldCheck, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader } from '../components/ui'
import { ClickTrendChart, SourceChart } from '../components/Charts'
import { api } from '../services/api'
import { useApp } from '../context/AppContext'

const periodChoices = ['Last 7 days', 'Last 30 days', 'Last 90 days']
const number = (value) => Number(value || 0).toLocaleString()

function dateQuery(period) {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - Number(period.match(/\d+/)?.[0] || 30))
  return { from: from.toISOString(), to: to.toISOString(), groupBy: 'day' }
}

function usePlatformSummary(period) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const { notify } = useApp()
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.admin.analytics(dateQuery(period))
      .then((result) => { if (!cancelled) setReport(result) })
      .catch((error) => { if (!cancelled) notify(error.message, 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period, notify])
  return { report, loading }
}

function platformStats(report) {
  return [
    { label: 'Total clicks', value: report?.totalClicks, icon: Activity, color: 'mint' },
    { label: 'Total links', value: report?.totalLinks, icon: Globe2, color: 'blue' },
    { label: 'Active users', value: report?.activeUsers, icon: UsersRound, color: 'violet' },
    { label: 'Open abuse reports', value: report?.flaggedLinks, icon: ShieldAlert, color: 'amber' },
  ]
}

export function AdminDashboard() {
  const [period, setPeriod] = useState('Last 30 days')
  const { report, loading } = usePlatformSummary(period)
  const { notify } = useApp()
  const [links, setLinks] = useState([])
  const [reports, setReports] = useState([])
  useEffect(() => {
    let cancelled = false
    Promise.all([api.admin.links({ limit: 5, sort: 'createdAt', order: 'desc' }), api.admin.reports({ status: 'open', limit: 5 })])
      .then(([linkResult, reportResult]) => {
        if (cancelled) return
        setLinks(linkResult.items)
        setReports(reportResult.items)
      })
      .catch((error) => { if (!cancelled) notify(error.message, 'error') })
    return () => { cancelled = true }
  }, [notify])
  const chartData = (report?.clickTrend || []).map((item) => ({
    date: new Date(item.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    clicks: item.clicks,
    visitors: item.uniqueVisitors,
  }))
  return <div className="page-stack admin-page">
    <PageHeader eyebrow="PLATFORM CONTROL" title="Admin overview" description="Platform health, user activity, and trust & safety at a glance." actions={<Badge tone="neutral">Live platform data</Badge>} />
    <div className="stats-grid admin-stats">{platformStats(report).map(({ label, value, icon: Icon, color }) => <Card className="stat-card" key={label}><div className="stat-top"><span className={`stat-icon stat-${color}`}><Icon size={17} /></span><span className="stat-period">{period}</span></div><div className="stat-label">{label}</div><div className="stat-bottom"><strong>{loading ? '—' : number(value)}</strong></div></Card>)}</div>
    <div className="admin-overview-grid"><Card className="admin-chart-card"><div className="card-heading"><div><h2>Platform activity</h2><p>Clicks across all workspaces · {period.toLowerCase()}</p></div><select className="select-button" aria-label="Platform activity period" value={period} onChange={(event) => setPeriod(event.target.value)}>{periodChoices.map((item) => <option key={item}>{item}</option>)}</select></div><div className="admin-chart">{chartData.length ? <ClickTrendChart data={chartData} /> : <EmptyState title={loading ? 'Loading platform activity' : 'No click activity yet'}>{loading ? 'Platform analytics are loading.' : 'Platform click trends will appear when visitors use short links.'}</EmptyState>}</div></Card>
      <Card className="incident-card"><div className="card-heading"><div><h2>Trust & safety</h2><p>Open reports requiring attention</p></div><span className="alert-count">{reports.length}</span></div>{reports.length ? reports.map((item) => <div className="incident-row" key={item._id}><span className="incident-icon incident-warning"><CircleAlert size={15} /></span><div><strong>{item.reason} report</strong><small>{item.linkId?.code || 'Link unavailable'} · {item.status}</small><small className="incident-age">{new Date(item.createdAt).toLocaleString()}</small></div></div>) : <EmptyState title="No open reports">New reports will appear here for review.</EmptyState>}<Link className="card-link" to="/admin/abuse">Review all reports <ArrowRight size={14} /></Link></Card>
    </div>
    <Card className="admin-links-preview"><div className="card-heading"><div><h2>Recent platform links</h2><p>Latest activity across all workspaces</p></div><Link to="/admin/links" className="card-link">Manage links <ArrowRight size={14} /></Link></div>{links.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Link</th><th>Owner</th><th>Clicks</th><th>Status</th><th>Created</th></tr></thead><tbody>{links.map((item) => <tr key={item._id}><td><span className="short-link">{item.shortUrl}</span></td><td>{item.user?.email || '—'}</td><td>{number(item.clicks)}</td><td><Badge tone={item.status === 'active' ? 'positive' : 'muted'}>{item.status}</Badge></td><td>{new Date(item.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <EmptyState title="No platform links">{loading ? 'Loading latest links.' : 'Platform links will appear here.'}</EmptyState>}</Card>
  </div>
}

export function AdminLinksPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const { notify } = useApp()
  const load = async () => {
    setLoading(true)
    try {
      const result = await api.admin.links({ q: query.trim(), status: filter, limit: 100, sort: 'createdAt', order: 'desc' })
      setRows(result.items)
    } catch (error) { notify(error.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer) }, [query, filter])
  async function takeAction(item) {
    const restore = item.status === 'taken_down'
    if (!window.confirm(`${restore ? 'Restore' : 'Take down'} ${item.shortUrl}?`)) return
    try {
      await api.admin.moderateLink(item._id, restore ? 'Reviewed by platform administrator' : 'Platform administrator takedown', restore)
      notify(restore ? 'Link restored.' : 'Link taken down. Historical analytics were retained.')
      await load()
    } catch (error) { notify(error.message, 'error') }
  }
  return <div className="page-stack"><PageHeader eyebrow="PLATFORM CONTROL" title="Global links" description="Review and moderate links across all LinkPulse workspaces." actions={<Badge tone="neutral">{rows.length.toLocaleString()} loaded</Badge>} />
    <Card className="admin-table-card"><div className="admin-toolbar"><div className="table-search"><Search size={15} /><input aria-label="Search global links" placeholder="Search alias or destination" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select className="select-button" aria-label="Filter status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option><option value="taken_down">Taken down</option><option value="expired">Expired</option></select></div>{loading ? <div className="route-loading" role="status">Loading platform links…</div> : rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Short link</th><th>Destination</th><th>Owner</th><th>Clicks</th><th>Status</th><th>Moderation</th></tr></thead><tbody>{rows.map((item) => <tr key={item._id}><td><strong className="short-link">{item.shortUrl}</strong></td><td><span className="destination" title={item.destination}>{item.destination}</span></td><td>{item.user?.email || '—'}</td><td>{number(item.clicks)}</td><td><Badge tone={item.status === 'active' ? 'positive' : 'muted'}>{item.status}</Badge></td><td>{item.status === 'taken_down' || item.status === 'active' ? <Button size="sm" variant="secondary" onClick={() => takeAction(item)}>{item.status === 'taken_down' ? 'Restore' : 'Take down'}</Button> : '—'}</td></tr>)}</tbody></table></div> : <EmptyState title="No links found">Try a different search or status filter.</EmptyState>}</Card>
  </div>
}

export function UsersPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const { notify } = useApp()
  const load = async () => {
    setLoading(true)
    try {
      const result = await api.admin.users({ q: query.trim(), status, limit: 100 })
      setRows(result.items)
    } catch (error) { notify(error.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer) }, [query, status])
  async function toggleStatus(user) {
    const next = user.status === 'suspended' ? 'active' : 'suspended'
    if (!window.confirm(`${next === 'suspended' ? 'Suspend' : 'Restore access for'} ${user.name}?`)) return
    try {
      const result = await api.admin.setUserStatus(user._id, next)
      setRows((current) => current.map((item) => item._id === user._id ? result.user : item))
      notify(`${user.name}'s account is now ${next}.`)
    } catch (error) { notify(error.message, 'error') }
  }
  return <div className="page-stack"><PageHeader eyebrow="PLATFORM CONTROL" title="User management" description="Manage account access and roles across the platform." />
    <Card className="admin-table-card"><div className="admin-toolbar"><div className="table-search"><Search size={15} /><input placeholder="Search users by name or email" aria-label="Search users" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select className="select-button" aria-label="Filter user status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select></div>{loading ? <div className="route-loading" role="status">Loading users…</div> : rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>User</th><th>Role</th><th>Plan</th><th>Joined</th><th>Status</th><th>Account action</th></tr></thead><tbody>{rows.map((user) => <tr key={user._id}><td><div className="user-table-cell"><span className="mini-avatar">{user.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td><td>{user.role}</td><td><Badge tone="neutral">{user.plan}</Badge></td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td><Badge tone={user.status === 'active' ? 'positive' : 'muted'}>{user.status}</Badge></td><td>{user.role === 'admin' ? 'Protected administrator' : <Button size="sm" variant="secondary" onClick={() => toggleStatus(user)}>{user.status === 'suspended' ? 'Restore' : 'Suspend'}</Button>}</td></tr>)}</tbody></table></div> : <EmptyState title="No users found">Try a different search or status filter.</EmptyState>}</Card>
  </div>
}

export function AbusePage() {
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('open')
  const [loading, setLoading] = useState(true)
  const { notify } = useApp()
  const load = async () => {
    setLoading(true)
    try {
      const result = await api.admin.reports({ status: filter, limit: 100 })
      setReports(result.items)
    } catch (error) { notify(error.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filter])
  async function resolve(item, status, resolution = '') {
    try {
      if (status === 'resolved' && resolution === 'Take down link') {
        if (!item.linkId?._id) throw new Error('The reported link is no longer available for takedown.')
        await api.admin.moderateLink(item.linkId._id, `Abuse report ${item._id}: ${item.reason}`, false)
      }
      await api.admin.reviewReport(item._id, status, resolution)
      setSelected(null)
      notify(status === 'resolved' && resolution === 'Take down link' ? 'Report resolved and link taken down.' : `Report ${status}.`)
      await load()
    } catch (error) { notify(error.message, 'error') }
  }
  const openCount = reports.filter((item) => ['open', 'reviewing'].includes(item.status)).length
  return <div className="page-stack"><PageHeader eyebrow="TRUST & SAFETY" title="Abuse monitoring" description="Investigate abuse reports and protect LinkPulse users." actions={<Badge tone="warning"><CircleAlert size={12} /> {openCount} open reports</Badge>} />
    <div className="moderation-stats"><Card><span className="stat-label">Reports in view</span><strong>{reports.length}</strong><small>Current filter</small></Card><Card><span className="stat-label">Open reports</span><strong>{openCount}</strong><small>Require review</small></Card><Card><span className="stat-label">Resolved / dismissed</span><strong>{reports.filter((item) => ['resolved', 'dismissed'].includes(item.status)).length}</strong><small>Historical moderation records</small></Card></div>
    <Card className="abuse-list-card"><div className="card-heading"><div><h2>Abuse reports</h2><p>Review submitted reports and record a disposition.</p></div><select className="select-button" aria-label="Filter abuse report status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option><option value="all">All statuses</option></select></div>{loading ? <div className="route-loading" role="status">Loading reports…</div> : reports.length ? reports.map((item) => <div className="abuse-row" key={item._id}><span className="abuse-warning"><ShieldAlert size={17} /></span><div className="abuse-main"><div><strong>{item.reason} report</strong><Badge tone={['open', 'reviewing'].includes(item.status) ? 'warning' : 'positive'}>{item.status}</Badge></div><code>{item.linkId?.code || 'link unavailable'} → {item.linkId?.destination || item.details || 'No details provided'}</code><small>{new Date(item.createdAt).toLocaleString()} {item.email ? `· ${item.email}` : ''}</small></div><Button variant="secondary" size="sm" onClick={() => setSelected(item)}>Review</Button></div>) : <EmptyState title="No reports in this view">Reports matching this status will appear here.</EmptyState>}</Card>
    {selected && <Modal title="Review abuse report" onClose={() => setSelected(null)} footer={<><Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>{selected.status !== 'reviewing' && <Button variant="secondary" onClick={() => resolve(selected, 'reviewing', 'Under review')}>Mark reviewing</Button>}<Button variant="secondary" onClick={() => resolve(selected, 'dismissed', 'Report dismissed after review')}>Dismiss</Button><Button variant="danger" onClick={() => resolve(selected, 'resolved', 'Take down link')}>Take down link</Button></>}><div className="review-details"><Badge tone="warning">{selected.reason}</Badge><p><strong>Short link</strong><code>{selected.linkId?.code || 'Unavailable'}</code></p><p><strong>Destination</strong><code>{selected.linkId?.destination || 'Unavailable'}</code></p><p><strong>Report details</strong>{selected.details || 'No additional details supplied.'}</p><div className="warning-callout"><CircleAlert size={16} /> Takedown disables the redirect while preserving the link and its click history.</div></div></Modal>}
  </div>
}

export function DomainsPage() {
  const [domains, setDomains] = useState([])
  const [domain, setDomain] = useState('')
  const [reason, setReason] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const { notify } = useApp()
  const load = async () => {
    setLoading(true)
    try {
      const result = await api.admin.domains({ limit: 100 })
      setDomains(result.items)
    } catch (error) { notify(error.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const visibleDomains = domains.filter((item) => `${item.domain} ${item.reason}`.toLowerCase().includes(query.toLowerCase()))
  async function add(event) {
    event.preventDefault()
    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
    if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(cleaned)) { notify('Enter a valid domain name, such as example.com.', 'error'); return }
    try {
      const result = await api.admin.addDomain({ domain: cleaned, reason: reason.trim() || 'Added by administrator' })
      setDomains((items) => [result.domain, ...items])
      setDomain(''); setReason(''); notify(`${cleaned} added to the blocklist.`)
    } catch (error) { notify(error.message, 'error') }
  }
  async function remove(item) {
    if (!window.confirm(`Remove ${item.domain} from the blocklist?`)) return
    try {
      await api.admin.removeDomain(item._id)
      setDomains((items) => items.filter((entry) => entry._id !== item._id))
      notify(`${item.domain} removed from the blocklist.`)
    } catch (error) { notify(error.message, 'error') }
  }
  return <div className="page-stack"><PageHeader eyebrow="TRUST & SAFETY" title="Domain blocklist" description="Prevent short links from redirecting to known malicious domains." actions={<Badge tone="neutral"><ShieldCheck size={12} /> {domains.length} blocked</Badge>} />
    <Card className="blocklist-form-card"><div><h2>Block a domain</h2><p>New links pointing to a blocked domain will be rejected.</p></div><form onSubmit={add}><Field label="Domain"><input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" required /></Field><Field label="Reason"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. confirmed phishing" /></Field><Button type="submit"><Plus size={15} /> Add domain</Button></form></Card>
    <Card className="blocklist-card"><div className="card-heading"><div><h2>Blocked domains</h2><p>Domain rules are enforced for new link destinations.</p></div><div className="table-search"><Search size={14} /><input placeholder="Search domains" aria-label="Search blocklist" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>{loading ? <div className="route-loading" role="status">Loading blocklist…</div> : visibleDomains.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Domain</th><th>Reason</th><th>Date added</th><th>Action</th></tr></thead><tbody>{visibleDomains.map((item) => <tr key={item._id}><td><strong>{item.domain}</strong></td><td>{item.reason}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td><td><Button size="sm" variant="secondary" onClick={() => remove(item)}>Remove</Button></td></tr>)}</tbody></table></div> : <EmptyState title="No blocked domains">Add a domain above to prevent new short links pointing to it.</EmptyState>}</Card>
  </div>
}

export function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('Last 30 days')
  const { report, loading } = usePlatformSummary(period)
  const chartData = (report?.clickTrend || []).map((item) => ({
    date: new Date(item.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    clicks: item.clicks,
    visitors: item.uniqueVisitors,
  }))
  return <div className="page-stack"><PageHeader eyebrow="PLATFORM INTELLIGENCE" title="Platform analytics" description="A complete view of LinkPulse usage across all workspaces." actions={<select className="select-button" value={period} onChange={(event) => setPeriod(event.target.value)}>{periodChoices.map((item) => <option key={item}>{item}</option>)}</select>} />
    <div className="stats-grid admin-stats">{platformStats(report).slice(0, 3).map(({ label, value, icon: Icon, color }) => <Card className="stat-card" key={label}><div className="stat-top"><span className={`stat-icon stat-${color}`}><Icon size={17} /></span><span className="stat-period">Platform-wide</span></div><div className="stat-label">{label}</div><div className="stat-bottom"><strong>{loading ? '—' : number(value)}</strong></div></Card>)}</div>
    <Card className="analytics-trend-card"><div className="card-heading"><div><h2>Platform click volume</h2><p>{period} · all workspaces</p></div><Button variant="secondary" onClick={() => window.print()}>Print report</Button></div><div className="large-chart">{chartData.length ? <ClickTrendChart data={chartData} /> : <EmptyState title={loading ? 'Loading platform report' : 'No platform clicks yet'}>{loading ? 'Fetching current platform analytics.' : 'The trend will populate as links receive visits.'}</EmptyState>}</div></Card>
    <div className="analytics-lower-grid"><Card><div className="card-heading"><div><h2>Top referrers</h2><p>Click volume by source</p></div></div><SourceChart values={report?.sources || []} /></Card><Card><div className="card-heading"><div><h2>Top countries</h2><p>Click volume by country code</p></div></div><SourceChart values={(report?.countries || []).map((item) => ({ source: item.countryCode || 'Unknown', clicks: item.clicks }))} /></Card></div>
    <div className="campaign-overview-grid"><Card><span className="stat-label">New accounts</span><strong className="overview-number">{loading ? '—' : number(report?.newUsers)}</strong><small>Created within the selected range</small></Card><Card><span className="stat-label">Unique visitors</span><strong className="overview-number">{loading ? '—' : number(report?.uniqueVisitors)}</strong><small>Privacy-conscious estimate</small></Card><Card><span className="stat-label">Open abuse reports</span><strong className="overview-number">{loading ? '—' : number(report?.flaggedLinks)}</strong><small>Require moderation review</small></Card></div>
  </div>
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { notify } = useApp()
  useEffect(() => {
    let cancelled = false
    Promise.all([api.admin.settings(), api.admin.auditLogs({ limit: 10 })])
      .then(([settingsResult, logResult]) => {
        if (cancelled) return
        setSettings(settingsResult)
        setAuditLogs(logResult.items)
      })
      .catch((error) => { if (!cancelled) notify(error.message, 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [notify])
  async function save() {
    if (!settings) return
    setSaving(true)
    try {
      const result = await api.admin.updateSettings({
        allowRegistration: settings.allowRegistration,
        maintenanceMode: settings.maintenanceMode,
        defaultLinkLimit: Number(settings.defaultLinkLimit),
      })
      setSettings(result)
      notify('Platform settings saved.')
    } catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }
  function toggle(key) {
    setSettings((current) => ({ ...current, [key]: !current[key] }))
  }
  return <div className="page-stack"><PageHeader eyebrow="PLATFORM CONTROL" title="Administrative settings" description="Manage platform-wide defaults and access controls." actions={<Badge tone="warning">Admin only</Badge>} />
    {loading ? <div className="route-loading" role="status">Loading administrative settings…</div> : settings && <>
      <Card className="settings-card"><div className="settings-section-head"><div><h2>Platform configuration</h2><p>Changes are applied after saving and written to the audit log.</p></div></div>{[['allowRegistration', 'New user registrations', 'Allow new LinkPulse accounts.'], ['maintenanceMode', 'Maintenance mode', 'Restrict platform access during maintenance.']].map(([key, title, subtitle]) => <div className="setting-row" key={key}><div><strong>{title}</strong><small>{subtitle}</small></div><button className={`toggle ${settings[key] ? 'toggle-on' : ''}`} role="switch" aria-checked={Boolean(settings[key])} aria-label={title} onClick={() => toggle(key)}><i /></button></div>)}<div className="setting-row"><div><strong>Default link limit</strong><small>Maximum links allowed per user account.</small></div><Field label="Link limit"><input type="number" min="1" max="100000" value={settings.defaultLinkLimit} onChange={(event) => setSettings((current) => ({ ...current, defaultLinkLimit: event.target.value }))} /></Field></div><div className="settings-actions"><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button></div></Card>
      <Card className="admin-table-card"><div className="card-heading"><div><h2>Recent audit activity</h2><p>Administrative and account changes.</p></div></div>{auditLogs.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Action</th><th>Actor</th><th>Resource</th><th>Time</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={log._id}><td>{log.action}</td><td>{log.actorId?.email || log.actorId?.name || 'System'}</td><td>{log.resourceType}</td><td>{new Date(log.occurredAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <EmptyState title="No audit activity yet">Administrative actions will be recorded here.</EmptyState>}</Card>
    </>}
  </div>
}
