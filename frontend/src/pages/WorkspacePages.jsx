import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, Download, FileUp, Folder, Link2, Plus, QrCode, Tag, Trash2, UserRound, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import { ClickTrendChart, SourceChart } from '../components/Charts'
import { Badge, Button, Card, EmptyState, Field, PageHeader } from '../components/ui'
import { useApp } from '../context/AppContext'
import { api } from '../services/api'

export function AnalyticsPage() {
  const [period, setPeriod] = useState('Last 30 days')
  const [tab, setTab] = useState('Traffic sources')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const { notify } = useApp()
  useEffect(() => {
    let cancelled = false
    const days = Number(period.match(/\d+/)?.[0] || 30)
    const to = new Date()
    const from = new Date(to)
    from.setDate(from.getDate() - days)
    setLoading(true)
    api.analytics.get({ from: from.toISOString(), to: to.toISOString(), groupBy: 'day' })
      .then((result) => { if (!cancelled) setReport(result) })
      .catch((error) => { if (!cancelled) notify(error.message, 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period, notify])
  const trend = (report?.clickTrend || []).map((item) => ({
    date: new Date(item.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    clicks: item.clicks,
    visitors: item.uniqueVisitors,
  }))
  const rows = tab === 'Traffic sources' ? report?.sources || [] : report?.browsers || []
  const totalClicks = rows.reduce((sum, item) => sum + item.clicks, 0)
  return <div className="page-stack">
    <PageHeader eyebrow="PERFORMANCE" title="Analytics" description="Understand what’s working and where your audience comes from." actions={<select className="select-button" value={period} onChange={(event) => setPeriod(event.target.value)}><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option></select>} />
    <div className="stats-grid analytics-stats"><Card className="stat-card"><div className="stat-top"><span className="stat-icon stat-mint"><Link2 size={18} /></span><span className="stat-period">{period}</span></div><div className="stat-label">Total clicks</div><div className="stat-bottom"><strong>{loading ? '—' : (report?.totalClicks || 0).toLocaleString()}</strong></div></Card><Card className="stat-card"><div className="stat-top"><span className="stat-icon stat-blue"><UserRound size={18} /></span><span className="stat-period">{period}</span></div><div className="stat-label">Unique visitors</div><div className="stat-bottom"><strong>{loading ? '—' : (report?.uniqueVisitors || 0).toLocaleString()}</strong></div></Card><Card className="stat-card"><div className="stat-top"><span className="stat-icon stat-violet"><ArrowUpRight size={18} /></span><span className="stat-period">Current total</span></div><div className="stat-label">Active links</div><div className="stat-bottom"><strong>{loading ? '—' : (report?.activeLinks || 0).toLocaleString()}</strong></div></Card></div>
    <Card className="analytics-trend-card"><div className="card-heading"><div><h2>Click performance</h2><p>Daily link activity · {period.toLowerCase()}</p></div><div className="chart-legend-inline"><span><i className="legend-dot mint-dot" />Clicks</span><span><i className="legend-dot blue-dot" />Unique visitors</span></div></div><div className="large-chart">{trend.length ? <ClickTrendChart data={trend} /> : <EmptyState title={loading ? 'Loading click activity' : 'No click activity yet'}>{loading ? 'Fetching analytics for this date range.' : 'Share a short link to start collecting analytics.'}</EmptyState>}</div></Card>
    <div className="analytics-lower-grid"><Card><div className="card-heading"><div><h2>Audience breakdown</h2><p>Distribution by device type</p></div></div><SourceChart devices values={report?.devices || []} /></Card><Card className="source-table-card"><div className="card-heading"><div><h2>{tab}</h2><p>{tab === 'Traffic sources' ? 'Referrers driving the most visits' : 'Browsers used to visit your links'}</p></div></div><div className="filter-tabs compact-tabs">{['Traffic sources', 'Browsers'].map((name) => <button key={name} className={tab === name ? 'selected' : ''} onClick={() => setTab(name)}>{name}</button>)}</div>{rows.length ? <div className="source-table">{rows.map((row) => <div className="source-row" key={row.source || row.browser}><span>{row.source || row.browser}</span><div className="source-bar"><i style={{ width: `${totalClicks ? Math.max(1, row.clicks / totalClicks * 100) : 0}%` }} /></div><strong>{row.clicks.toLocaleString()}</strong><small>{totalClicks ? `${(row.clicks / totalClicks * 100).toFixed(1)}%` : '0%'}</small></div>)}</div> : <EmptyState title={loading ? 'Loading report' : 'No report data yet'}>{loading ? 'Analytics are being loaded.' : 'Traffic data will appear after links receive clicks.'}</EmptyState>}</Card></div>
  </div>
}

export function CampaignsPage() {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [sort, setSort] = useState('clicks')
  const { campaigns: items, rawCampaigns, setCampaigns, refreshWorkspace, notify } = useApp()
  const [saving, setSaving] = useState(false)
  const sortedItems = [...items].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : b.clickCount - a.clickCount)
  async function createCampaign(event) {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const campaign = await api.campaigns.create({ name: name.trim() })
      setCampaigns((previous) => [...previous, campaign])
      await refreshWorkspace()
      setName(''); setShowForm(false); notify('Campaign created.')
    } catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }
  return <div className="page-stack">
    <PageHeader eyebrow="ORGANIZE" title="Campaigns" description="Group related links and measure campaign performance." actions={<Button onClick={() => setShowForm((value) => !value)}><Plus size={16} /> New campaign</Button>} />
    {showForm && <Card className="inline-form-card"><form onSubmit={createCampaign}><Field label="Campaign name"><input autoFocus placeholder="e.g. Black Friday 2026" value={name} onChange={(event) => setName(event.target.value)} required /></Field><Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create campaign'}</Button><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button></form></Card>}
    <div className="campaign-overview-grid"><Card><span className="stat-label">Active campaigns</span><strong className="overview-number">{items.filter((item) => item.status === 'Active').length}</strong><small className="muted-cell">Across your workspace</small></Card><Card><span className="stat-label">Campaign clicks</span><strong className="overview-number">{items.reduce((sum, item) => sum + item.clickCount, 0).toLocaleString()}</strong><small className="muted-cell">All recorded campaign activity</small></Card><Card><span className="stat-label">Links in campaigns</span><strong className="overview-number">{items.reduce((sum, item) => sum + item.links, 0)}</strong><small className="muted-cell">Organized and trackable</small></Card></div>
    <Card className="campaigns-table-card"><div className="card-heading"><div><h2>All campaigns</h2><p>{items.length} campaigns in your workspace</p></div><select className="select-button" aria-label="Sort campaigns" value={sort} onChange={(event) => setSort(event.target.value)}><option value="clicks">Most clicks</option><option value="name">Campaign name</option></select></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Campaign</th><th>Links</th><th>Total clicks</th><th>Progress</th><th>Status</th><th>Actions</th></tr></thead><tbody>{sortedItems.map((item) => <tr key={item.id}><td><div className="link-cell"><span className="campaign-monogram">{item.name.slice(0, 1)}</span><div><strong>{item.name}</strong><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Created recently'}</small></div></div></td><td>{item.links}</td><td><strong>{item.clickCount.toLocaleString()}</strong></td><td><div className="progress-track table-progress"><i style={{ width: `${items[0]?.clickCount ? Math.round(item.clickCount / items[0].clickCount * 100) : 0}%` }} /></div></td><td><Badge tone={item.status === 'Active' ? 'positive' : 'muted'}>{item.status}</Badge></td><td><Button size="sm" variant="secondary" onClick={async () => {
      const nextStatus = item.status === 'Active' ? 'paused' : 'active'
      try {
        const result = await api.campaigns.update(item.id, { status: nextStatus })
        setCampaigns(rawCampaigns.map((campaign) => campaign._id === item.id ? result : campaign))
        notify(`Campaign ${nextStatus === 'active' ? 'resumed' : 'paused'}.`)
      } catch (error) { notify(error.message, 'error') }
    }}>{item.status === 'Active' ? 'Pause' : 'Resume'}</Button></td></tr>)}</tbody></table></div></Card>
  </div>
}

export function OrganizationPage() {
  const [tab, setTab] = useState('Tags')
  const [entry, setEntry] = useState('')
  const { tags, folders, links, refreshWorkspace, notify } = useApp()
  const [saving, setSaving] = useState(false)
  async function addEntry(event) {
    event.preventDefault()
    if (!entry.trim()) return
    setSaving(true)
    try {
      if (tab === 'Tags') await api.tags.create({ name: entry.trim() })
      else await api.folders.create({ name: entry.trim() })
      await refreshWorkspace()
      notify(`${tab.slice(0, -1)} created.`); setEntry('')
    } catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }
  async function remove(item) {
    if (!window.confirm(`Remove ${item.name}?`)) return
    try {
      if (tab === 'Tags') await api.tags.remove(item._id)
      else await api.folders.remove(item._id)
      await refreshWorkspace()
      notify(`${tab.slice(0, -1)} removed.`)
    } catch (error) { notify(error.message, 'error') }
  }
  const items = tab === 'Tags'
    ? tags.map((item, index) => ({ ...item, count: links.filter((link) => link.tagIds?.includes(item._id)).length, color: item.color || ['#73e2c1', '#68a9ff', '#a98aff', '#f2bb69'][index % 4] }))
    : folders.map((item) => ({ ...item, count: links.filter((link) => link.folderId === item._id).length }))
  return <div className="page-stack"><PageHeader eyebrow="ORGANIZE" title="Tags & folders" description="Keep your links organized with a structure that works for you." actions={<form className="add-inline" onSubmit={addEntry}><input value={entry} onChange={(event) => setEntry(event.target.value)} placeholder={`New ${tab === 'Tags' ? 'tag' : 'folder'} name`} aria-label="New item name" /><Button type="submit" disabled={saving}><Plus size={15} /> Add {tab === 'Tags' ? 'tag' : 'folder'}</Button></form>} />
    <div className="filter-tabs"><button className={tab === 'Tags' ? 'selected' : ''} onClick={() => setTab('Tags')}>Tags <span>{tags.length}</span></button><button className={tab === 'Folders' ? 'selected' : ''} onClick={() => setTab('Folders')}>Folders <span>{folders.length}</span></button></div>
    <div className="organization-grid">{items.map((item) => <Card className="organization-item" key={item._id}><span className={`organization-icon ${tab === 'Tags' ? 'tag-icon' : 'folder-icon'}`} style={tab === 'Tags' ? { color: item.color, background: `${item.color}18` } : {}}>{tab === 'Tags' ? <Tag size={18} /> : <Folder size={18} />}</span><div className="organization-copy"><strong>{item.name}</strong><small>{item.count} links</small></div><button className="remove-item" aria-label={`Remove ${item.name}`} onClick={() => remove(item)}><Trash2 size={15} /></button></Card>)}</div>
    {!items.length && <EmptyState icon={tab === 'Tags' ? Tag : Folder} title={`No ${tab.toLowerCase()} yet`}>Add one above to start organizing your links.</EmptyState>}
  </div>
}

export function QrCodesPage() {
  const { links, loadingLinks, notify } = useApp()
  const [selected, setSelected] = useState(links[0]?.id || '')
  const [color, setColor] = useState('#10201d')
  const [qrUrl, setQrUrl] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const qrRef = useRef(null)
  const link = links.find((item) => item.id === selected)
  useEffect(() => {
    if (links.length && !links.some((item) => item.id === selected)) setSelected(links[0].id)
  }, [links, selected])
  useEffect(() => {
    if (!link) { setQrUrl(''); return undefined }
    let cancelled = false
    setQrLoading(true)
    api.links.qr(link.id)
      .then((result) => { if (!cancelled) setQrUrl(result.url) })
      .catch((error) => { if (!cancelled) { setQrUrl(''); notify(error.message, 'error') } })
      .finally(() => { if (!cancelled) setQrLoading(false) })
    return () => { cancelled = true }
  }, [link?.id, notify])
  function download() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg || !link || !qrUrl) return
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `${link.alias}-qr.svg`; anchor.click(); URL.revokeObjectURL(url)
    notify('QR code downloaded as an SVG.')
  }
  if (loadingLinks) return <div className="page-stack"><PageHeader eyebrow="SHARE EVERYWHERE" title="QR codes" description="Turn any short link into a scannable, print-ready code." /><div className="route-loading" role="status"><span className="loading-mark" /><span>Loading links…</span></div></div>
  return <div className="page-stack"><PageHeader eyebrow="SHARE EVERYWHERE" title="QR codes" description="Turn any short link into a scannable, print-ready code." />
    <div className="qr-layout"><Card className="qr-config-card"><h2>Customize your QR code</h2><p>Choose a link and adjust your code styling.</p>{links.length ? <><Field label="Choose a link"><select value={selected} onChange={(event) => setSelected(event.target.value)}>{links.map((item) => <option key={item.id} value={item.id}>{item.alias} — {item.shortUrl}</option>)}</select></Field><Field label="QR code color"><div className="color-picker"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /><span>{color.toUpperCase()}</span></div></Field><Button onClick={download} disabled={!qrUrl || qrLoading}><Download size={15} /> Download SVG</Button></> : <EmptyState icon={QrCode} title="Create a link first">QR codes are generated from your short links.</EmptyState>}</Card><Card className="qr-preview-card"><div className="qr-preview-head"><span>LIVE PREVIEW</span><Badge tone="positive">High resolution</Badge></div>{link && (qrLoading ? <div className="route-loading" role="status">Loading QR code…</div> : qrUrl ? <><div className="qr-code-stage" ref={qrRef}><QRCodeSVG title={`QR code for ${link.alias}`} value={qrUrl} size={208} bgColor="#fff" fgColor={color} level="H" includeMargin /></div><strong>{link.alias}</strong><small>{qrUrl}</small></> : <EmptyState icon={QrCode} title="QR code unavailable">Enable QR codes for this link to generate a download.</EmptyState>)}</Card></div>
  </div>
}

export function ImportPage() {
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const { notify, refreshWorkspace } = useApp()
  async function processFile(file) {
    if (!file) return
    setLoading(true)
    try {
      const result = await api.links.importCsv(file)
      setParsed(result)
      if (result.created) await refreshWorkspace()
      notify(`Import complete: ${result.created} created and ${result.invalid} invalid rows.`, result.invalid ? 'error' : 'success')
    } catch (error) { notify(error.message, 'error') }
    finally { setLoading(false); if (inputRef.current) inputRef.current.value = '' }
  }
  return <div className="page-stack"><PageHeader eyebrow="SAVE TIME" title="Bulk import" description="Add many links at once using a CSV file." />
    <div className="import-layout"><Card className="import-card"><div className="upload-area" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); processFile(event.dataTransfer.files[0]) }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click() }}><span className="upload-icon"><FileUp size={22} /></span><h2>{loading ? 'Uploading and validating…' : 'Drop your CSV here'}</h2><p>or <strong>browse files</strong> from your computer</p><small>CSV file · up to 2 MB</small><input ref={inputRef} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={(event) => processFile(event.target.files[0])} /></div><div className="import-help"><strong>CSV format</strong><p>Include a <code>destination</code> column (or <code>url</code> / <code>long_url</code>). An optional <code>alias</code> column can set custom short links.</p><button onClick={() => { const csv = 'destination,alias\\nhttps://example.com/page,example-page'; const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = 'linkpulse-template.csv'; a.click(); URL.revokeObjectURL(url) }}><Download size={14} /> Download template</button></div></Card>
      {parsed && <Card className="import-results"><div className="card-heading"><div><h2>Import results</h2><p>Server-validated row results.</p></div><button className="icon-button" aria-label="Clear import results" onClick={() => setParsed(null)}><X size={16} /></button></div><div className="import-summary"><span className="valid-count"><Check size={15} />{parsed.created} created</span><span className="invalid-count"><X size={15} />{parsed.invalid} invalid</span></div><div className="validation-list">{parsed.results.slice(0, 100).map((row) => <div key={row.row}><Badge tone={row.status === 'created' ? 'positive' : 'warning'}>{row.status === 'created' ? 'Created' : 'Invalid'}</Badge><span>Row {row.row}</span><code>{row.link?.destination || row.errors?.map((item) => item.message).join('; ') || 'Row imported.'}</code></div>)}</div></Card>}
    </div>
  </div>
}

export function BioPage() {
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [links, setLinks] = useState([])
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { notify } = useApp()
  useEffect(() => {
    let cancelled = false
    api.bio.get()
      .then((page) => {
        if (!cancelled && page) {
          setSlug(page.slug || '')
          setTitle(page.displayName || '')
          setDescription(page.bio || '')
          setLinks(page.links || [])
        }
      })
      .catch((error) => { if (!cancelled) notify(error.message, 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [notify])
  function addBioLink() { setLinks((items) => [...items, { title: '', url: '', enabled: true }]) }
  async function save() {
    if (title.trim().length < 1) { notify('Enter a display name for your bio page.', 'error'); return }
    const normalizedSlug = slug.trim().toLowerCase() || title.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '')
    const invalid = links.find((item) => !item.title.trim() || (() => { try { return !['http:', 'https:'].includes(new URL(item.url).protocol) } catch { return true } })())
    if (invalid) { notify(`Enter a title and valid http or https URL for "${invalid.title || 'untitled link'}".`, 'error'); return }
    setSaving(true)
    try {
      const page = await api.bio.save({
        slug: normalizedSlug,
        displayName: title.trim(),
        bio: description.trim(),
        links: links.map(({ title: linkTitle, url, enabled }) => ({ title: linkTitle.trim(), url: url.trim(), enabled: enabled !== false })),
        published: true,
      })
      setSlug(page.slug)
      setNotice('Changes saved to your account.')
      notify('Bio page saved.')
    } catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }
  return <div className="page-stack"><PageHeader eyebrow="ONE LINK, MANY DESTINATIONS" title="Link in bio" description="Build a simple, branded landing page for your social profiles." actions={<Button onClick={save} disabled={saving || loading}>{saving ? 'Saving…' : 'Save changes'}</Button>} />
    {loading ? <div className="route-loading" role="status">Loading your bio page…</div> : <div className="bio-layout"><Card className="bio-editor"><div className="card-heading"><div><h2>Page content</h2><p>Edit the content shown in your published bio page.</p></div></div><Field label="Public page slug"><input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="your-name" /></Field><Field label="Display name"><input value={title} onChange={(event) => setTitle(event.target.value)} /></Field><Field label="Short bio"><textarea rows="3" value={description} onChange={(event) => setDescription(event.target.value)} /></Field><div className="bio-links-heading"><strong>Your links</strong><Button size="sm" variant="secondary" onClick={addBioLink}><Plus size={14} /> Add link</Button></div>{links.map((item, index) => <div className="bio-edit-row" key={index}><input aria-label={`Link ${index + 1} title`} value={item.title} onChange={(event) => setLinks((items) => items.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry))} /><input aria-label={`Link ${index + 1} URL`} value={item.url} onChange={(event) => setLinks((items) => items.map((entry, i) => i === index ? { ...entry, url: event.target.value } : entry))} /><button aria-label={`Remove ${item.title || `link ${index + 1}`}`} onClick={() => setLinks((items) => items.filter((_, i) => i !== index))}><Trash2 size={15} /></button></div>)}{notice && <small className="saved-note">{notice}</small>}</Card><Card className="bio-preview-card"><div className="preview-browser"><span /><span /><span /><small>LinkPulse bio · {slug || 'your-slug'}</small></div><div className="bio-phone-preview"><div className="bio-profile-avatar">{title.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><h2>{title || 'Your name'}</h2><p>{description || 'Your short bio goes here.'}</p>{links.filter((item) => item.enabled !== false).map((item, i) => <div className="bio-preview-link" key={i}>{item.title || 'Untitled link'}<ArrowRight size={15} /></div>)}<small>Made with LinkPulse</small></div></Card></div>}
  </div>
}

export function SettingsPage() {
  const { user, setUser, notify } = useApp()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [preferences, setPreferences] = useState({ theme: 'dark', emailUpdates: true, weeklySummary: false })
  const [savingProfile, setSavingProfile] = useState(false)
  const [loadingPreferences, setLoadingPreferences] = useState(true)
  useEffect(() => {
    let cancelled = false
    api.account.preferences()
      .then((result) => { if (!cancelled) setPreferences((current) => ({ ...current, ...result })) })
      .catch((error) => { if (!cancelled) notify(error.message, 'error') })
      .finally(() => { if (!cancelled) setLoadingPreferences(false) })
    return () => { cancelled = true }
  }, [notify])
  async function save(event) {
    event.preventDefault()
    setSavingProfile(true)
    try {
      const profile = await api.account.updateProfile({ name: name.trim(), email: email.trim() })
      setUser(profile)
      notify('Profile updated.')
    } catch (error) { notify(error.message, 'error') }
    finally { setSavingProfile(false) }
  }
  async function updatePreference(key, value) {
    try {
      const result = await api.account.updatePreferences({ [key]: value })
      setPreferences((current) => ({ ...current, ...result }))
      notify('Preference saved.')
    } catch (error) { notify(error.message, 'error') }
  }
  return <div className="page-stack"><PageHeader eyebrow="YOUR WORKSPACE" title="Settings" description="Manage your profile and preferences." /><div className="settings-tabs">{['Profile', 'Security', 'Preferences'].map((label) => <a key={label} href={`#${label.toLowerCase()}`} onClick={(event) => { event.preventDefault(); document.getElementById(label.toLowerCase())?.scrollIntoView({ behavior: 'smooth' }) }}>{label}</a>)}</div>
    <Card className="settings-card" id="profile"><div className="settings-section-head"><div><h2>Profile</h2><p>Update your personal information.</p></div><span className="settings-avatar">{name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span></div><form onSubmit={save} className="settings-form"><Field label="Full name"><input value={name} onChange={(event) => setName(event.target.value)} required /></Field><Field label="Email address"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field><div className="settings-actions"><Button type="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</Button></div></form></Card>
    <Card className="settings-card" id="security"><div className="settings-section-head"><div><h2>Security</h2><p>Manage your sign-in credentials.</p></div></div><div className="setting-row"><div><strong>Authenticated session</strong><small>Sessions are managed with secure, HTTP-only cookies.</small></div><Badge tone="positive">Protected</Badge></div><div className="setting-row"><div><strong>Password</strong><small>Request a secure password reset link by email.</small></div><Link to="/forgot-password" className="button button-secondary">Change password</Link></div></Card>
    <Card className="settings-card" id="preferences"><div className="settings-section-head"><div><h2>Preferences</h2><p>Customize your LinkPulse experience.</p></div></div><div className="setting-row"><div><strong>Email updates</strong><small>Receive important product and account updates.</small></div><button className={`toggle ${preferences.emailUpdates ? 'toggle-on' : ''}`} role="switch" aria-checked={preferences.emailUpdates} aria-label="Email updates" disabled={loadingPreferences} onClick={() => updatePreference('emailUpdates', !preferences.emailUpdates)}><i /></button></div><div className="setting-row"><div><strong>Weekly summary</strong><small>Receive a weekly summary of your link performance.</small></div><button className={`toggle ${preferences.weeklySummary ? 'toggle-on' : ''}`} role="switch" aria-checked={preferences.weeklySummary} aria-label="Weekly summary" disabled={loadingPreferences} onClick={() => updatePreference('weeklySummary', !preferences.weeklySummary)}><i /></button></div><div className="setting-row"><div><strong>Interface theme</strong><small>Dark theme is currently selected.</small></div><Badge tone="neutral">{preferences.theme === 'light' ? 'Light' : 'Dark'}</Badge></div></Card>
  </div>
}
