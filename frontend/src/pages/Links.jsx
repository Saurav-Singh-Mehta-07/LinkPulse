import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Copy, ExternalLink, Link2, LockKeyhole, Plus, QrCode, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ClickTrendChart } from '../components/Charts'
import LinkTable from '../components/LinkTable'
import { Badge, Button, Card, Field, PageHeader } from '../components/ui'
import { useApp } from '../context/AppContext'
import { api, normalizeLink } from '../services/api'

const aliasPattern = /^[a-zA-Z0-9_-]{3,32}$/

export function LinksPage() {
  const { links, loadingLinks } = useApp()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All links')
  const [sort, setSort] = useState('clicks')
  const filtered = useMemo(() => links.filter((link) => {
    const matchesQuery = `${link.alias} ${link.destination} ${link.campaign}`.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = status === 'All links' || (status === 'Expiring soon' ? link.status === 'Expiring soon' : (status === 'Active' ? link.status === 'Active' : link.status === status))
    return matchesQuery && matchesStatus
  }), [links, query, status])
  if (loadingLinks) return <div className="page-stack"><PageHeader eyebrow="LINK MANAGEMENT" title="All links" description="Create, organize, and track every link in one place." /><div className="route-loading" role="status"><span className="loading-mark" /><span>Loading links…</span></div></div>
  return <div className="page-stack">
    <PageHeader eyebrow="LINK MANAGEMENT" title="All links" description="Create, organize, and track every link in one place." actions={<Link to="/app/links/new" className="button button-primary"><Plus size={16} /> Create link</Link>} />
    <div className="list-toolbar"><div className="filter-tabs">{['All links', 'Active', 'Expiring soon', 'Expired'].map((item) => <button className={status === item ? 'selected' : ''} key={item} onClick={() => setStatus(item)}>{item}{item === 'All links' && <span>{links.length}</span>}</button>)}</div><div className="list-tools"><div className="table-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search links..." aria-label="Search links" /></div><select aria-label="Sort links" className="select-button" value={sort} onChange={(event) => setSort(event.target.value)}><option value="clicks">Most clicks</option><option value="newest">Newest first</option><option value="alphabetical">Alphabetical</option></select></div></div>
    <Card className="links-card">{filtered.length ? <LinkTable rows={filtered} sortMode={sort} /> : <div className="empty-state"><span className="empty-icon"><Link2 size={22} /></span><h3>No links match your filters</h3><p>Try changing the search or status filter.</p><Button variant="secondary" onClick={() => { setQuery(''); setStatus('All links') }}>Clear filters</Button></div>}</Card>
  </div>
}

export function LinkWizard() {
  const { campaigns, folders, createLink, notify } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [values, setValues] = useState({ destination: searchParams.get('destination') || '', alias: '', expiry: '', maxClicks: '', password: '', campaignId: '', tags: '', folderId: '', qr: true })
  const [aliasTouched, setAliasTouched] = useState(false)
  const [aliasState, setAliasState] = useState('')
  const [aliasError, setAliasError] = useState('')
  useEffect(() => {
    const alias = values.alias.trim()
    if (!alias || !aliasPattern.test(alias)) { setAliasState(''); setAliasError(''); return undefined }
    let cancelled = false
    setAliasState('checking')
    setAliasError('')
    const timer = window.setTimeout(() => {
      api.links.aliasAvailability(alias)
        .then((result) => { if (!cancelled) setAliasState(result.available ? 'available' : 'taken') })
        .catch((error) => { if (!cancelled) { setAliasState('error'); setAliasError(error.message) } })
    }, 250)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [values.alias])
  const previewAlias = values.alias.trim() || 'your-custom-alias'
  const previewUrl = new URL(`/${previewAlias}`, api.shortBaseUrl).toString()
  function setValue(key, value) { setValues((previous) => ({ ...previous, [key]: value })); setErrors((previous) => ({ ...previous, [key]: '' })) }

  function validateOne() {
    const next = {}
    let destination
    try { destination = new URL(values.destination) } catch { next.destination = 'Enter a valid destination URL, including https://.' }
    if (destination && !['http:', 'https:'].includes(destination.protocol)) next.destination = 'Use a secure http:// or https:// URL.'
    if (values.alias && !aliasPattern.test(values.alias.trim())) next.alias = 'Use 3–32 letters, numbers, dashes, or underscores.'
    else if (values.alias && aliasState === 'taken') next.alias = 'This alias is already taken. Choose another.'
    else if (values.alias && aliasState === 'error') next.alias = aliasError || 'Alias availability could not be checked.'
    else if (values.alias && aliasState !== 'available') next.alias = 'Wait for the alias availability check to finish.'
    setErrors(next)
    return Object.keys(next).length === 0
  }
  function validateTwo() {
    const next = {}
    if (values.expiry && new Date(values.expiry) <= new Date()) next.expiry = 'Choose a future date and time.'
    if (values.maxClicks && (!Number.isInteger(Number(values.maxClicks)) || Number(values.maxClicks) < 1)) next.maxClicks = 'Enter a whole number greater than zero.'
    if (values.password && values.password.length < 6) next.password = 'Use at least 6 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }
  async function submit() {
    if (!validateOne()) { setStep(1); return }
    if (!validateTwo()) return
    setSaving(true)
    try {
      const link = await createLink({
        ...values,
        destination: values.destination.trim(),
        alias: values.alias.trim(),
        expiry: values.expiry ? new Date(values.expiry).toISOString() : null,
      })
      notify('Your link is ready to share.')
      navigate(`/app/links/${link.id}`)
    } catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }

  return <div className="page-stack wizard-page">
    <Link className="back-link" to="/app/links"><ArrowLeft size={15} /> Back to links</Link>
    <PageHeader eyebrow="LINK BUILDER" title="Create a new link" description="Create and configure a short link for your audience." />
    <div className="wizard-layout">
      <div className="wizard-main">
        <div className="wizard-steps"><div className={`wizard-step ${step >= 1 ? 'current' : ''}`}><span>{step > 1 ? <Check size={14} /> : '01'}</span><div><strong>Destination</strong><small>Set up your short link</small></div></div><i /><div className={`wizard-step ${step === 2 ? 'current' : ''}`}><span>02</span><div><strong>Customize</strong><small>Optional settings</small></div></div></div>
        {step === 1 ? <Card className="wizard-card"><div className="wizard-card-title"><span className="step-icon"><Link2 size={17} /></span><div><h2>Where should your link go?</h2><p>Paste the full URL you want people to visit.</p></div></div>
          <Field label="Destination URL" error={errors.destination}><div className="input-with-icon"><ExternalLink size={16} /><input autoFocus type="url" placeholder="https://example.com/your-page" value={values.destination} onChange={(event) => setValue('destination', event.target.value)} /></div></Field>
          <div className="field alias-field"><label htmlFor="custom-link-alias">Custom back-half <span className="optional">Optional</span></label><div className={`alias-input ${errors.alias ? 'input-error' : ''}`}><span>{new URL('/', api.shortBaseUrl).host}/</span><input id="custom-link-alias" aria-label="Custom link alias" placeholder="your-custom-alias" value={values.alias} onChange={(event) => { setAliasTouched(true); setValue('alias', event.target.value) }} /></div>{errors.alias ? <small className="field-error" role="alert">{errors.alias}</small> : <small className="field-hint">{!values.alias ? 'Leave blank to generate a short, random alias.' : !aliasTouched ? 'Your custom link will be easy to remember.' : aliasState === 'checking' ? 'Checking alias availability…' : aliasState === 'available' ? '✓ This alias is available.' : aliasState === 'taken' ? 'This alias is already taken.' : aliasState === 'error' ? aliasError : 'Use 3–32 letters, numbers, dashes, or underscores.'}</small>}</div>
          <div className="preview-box"><div><span className="preview-check"><CheckCircle2 size={16} /></span><span><strong>Short link preview</strong><small>Ready to share once created</small></span></div><code>{previewUrl}</code></div>
          <div className="wizard-footer"><span>Step 1 of 2</span><Button onClick={() => { if (validateOne()) setStep(2) }}>Customize link <ArrowRight size={15} /></Button></div>
        </Card> : <Card className="wizard-card"><div className="wizard-card-title"><span className="step-icon"><Sparkles size={17} /></span><div><h2>Make it yours</h2><p>These settings are optional. You can change them later.</p></div></div>
          <div className="form-grid"><Field label="Expires on" hint="Leave blank for a link that never expires." error={errors.expiry}><div className="input-with-icon"><Clock3 size={15} /><input type="datetime-local" value={values.expiry} onChange={(event) => setValue('expiry', event.target.value)} /></div></Field><Field label="Maximum clicks" hint="Disable automatically after this many clicks." error={errors.maxClicks}><input type="number" min="1" placeholder="Unlimited" value={values.maxClicks} onChange={(event) => setValue('maxClicks', event.target.value)} /></Field></div>
          <Field label="Password protection" hint="Visitors will need this password to continue." error={errors.password}><div className="input-with-icon"><LockKeyhole size={15} /><input type="password" placeholder="Add a password (optional)" value={values.password} onChange={(event) => setValue('password', event.target.value)} /></div></Field>
          <div className="form-grid"><Field label="Campaign"><select value={values.campaignId} onChange={(event) => setValue('campaignId', event.target.value)}><option value="">No campaign</option>{campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Folder"><select value={values.folderId} onChange={(event) => setValue('folderId', event.target.value)}><option value="">Unfiled</option>{folders.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></Field></div>
          <Field label="Tags" hint="Separate multiple tags with commas."><input placeholder="e.g. social, launch, q4" value={values.tags} onChange={(event) => setValue('tags', event.target.value)} /></Field>
          <button className={`qr-option ${values.qr ? 'checked' : ''}`} onClick={() => setValue('qr', !values.qr)}><span className="checkbox">{values.qr && <Check size={13} />}</span><QrCode size={18} /><span><strong>Generate a QR code</strong><small>Create a scannable code for this short link</small></span></button>
          <div className="final-review"><strong><CheckCircle2 size={15} /> Ready to create</strong><span>{previewUrl}</span><small>Destination: {values.destination}</small></div>
          <div className="wizard-footer"><Button variant="secondary" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</Button><span>Step 2 of 2</span><Button onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create link'} {!saving && <ArrowRight size={15} />}</Button></div>
        </Card>}
      </div>
      <aside className="wizard-aside"><Card className="wizard-tip"><span className="tip-icon"><Sparkles size={16} /></span><h3>A good link goes a long way</h3><p>Choose an alias that’s short, recognizable, and easy to remember.</p><div className="tip-example"><small>EXAMPLE</small><code>lnk.pulse/summer-drop</code></div></Card><div className="wizard-assurance"><ShieldCheck size={17} /><span><strong>Built for trust</strong><small>Every link is encrypted and protected by LinkPulse.</small></span></div></aside>
    </div>
  </div>
}

export function LinkDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { links, loadingLinks, campaigns, folders, tags, updateLink, deleteLink, notify } = useApp()
  const listedLink = links.find((item) => item.id === id)
  const [loadedLink, setLoadedLink] = useState(null)
  const [detailAnalytics, setDetailAnalytics] = useState(null)
  const [qrUrl, setQrUrl] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const link = listedLink || loadedLink
  const [editing, setEditing] = useState(false)
  const [destination, setDestination] = useState(link?.destination || '')
  useEffect(() => {
    if (listedLink) {
      setLoadedLink(null)
      setDestination(listedLink.destination)
      return undefined
    }
    let cancelled = false
    setLoadingDetail(true)
    api.links.get(id)
      .then((result) => {
        if (!cancelled) setLoadedLink(normalizeLink(result, { campaigns: campaigns.map((item) => ({ ...item, _id: item.id })), folders, tags }))
      })
      .catch((error) => { if (!cancelled) notify(error.message, 'error') })
      .finally(() => { if (!cancelled) setLoadingDetail(false) })
    return () => { cancelled = true }
  }, [id, listedLink, campaigns, folders, tags, notify])
  useEffect(() => {
    if (!link) return undefined
    let cancelled = false
    api.links.analytics(id)
      .then((result) => { if (!cancelled) setDetailAnalytics(result) })
      .catch((error) => { if (!cancelled) notify(error.message, 'error') })
    if (link.qr !== false) {
      api.links.qr(id)
        .then((result) => { if (!cancelled) setQrUrl(result.url) })
        .catch((error) => { if (!cancelled) notify(error.message, 'error') })
    }
    return () => { cancelled = true }
  }, [id, link?.qr, notify])
  if (!link && (loadingLinks || loadingDetail)) return <div className="route-loading" role="status"><span className="loading-mark" /><span>Loading link details…</span></div>
  if (!link) return <div className="page-stack"><PageHeader title="Link not found" description="This link may have been removed or is not accessible to your account." actions={<Link to="/app/links" className="button button-secondary">Back to links</Link>} /></div>
  async function copy() { try { await navigator.clipboard.writeText(link.shortUrl); notify('Short link copied to clipboard.') } catch { notify(`Copy this link: ${link.shortUrl}`, 'error') } }
  async function save() {
    try { const parsed = new URL(destination); if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Use an http or https URL.'); await updateLink(link.id, { destination }); setEditing(false); notify('Destination updated.') }
    catch (error) { notify(error.message === 'Invalid URL' ? 'Enter a valid destination URL.' : error.message, 'error') }
  }
  async function toggle() { try { await updateLink(link.id, { status: link.status === 'Disabled' ? 'Active' : 'Disabled' }); notify(`Link ${link.status === 'Disabled' ? 'enabled' : 'disabled'}.`) } catch (error) { notify(error.message, 'error') } }
  async function remove() { if (window.confirm(`Disable "${link.alias}"? Historical analytics will be retained.`)) { try { await deleteLink(link.id); notify('Link disabled. Historical analytics were retained.'); navigate('/app/links') } catch (error) { notify(error.message, 'error') } } }
  const trend = (detailAnalytics?.clickTrend || []).map((item) => ({
    date: new Date(item.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    clicks: item.clicks,
    visitors: item.uniqueVisitors,
  }))
  return <div className="page-stack">
    <Link className="back-link" to="/app/links"><ArrowLeft size={15} /> All links</Link>
    <PageHeader eyebrow="LINK DETAILS" title={link.alias} description={link.destination} actions={<><Button variant="secondary" onClick={toggle}>{link.status === 'Disabled' ? 'Enable link' : 'Disable link'}</Button><Button variant="secondary" onClick={() => setEditing((value) => !value)}>Edit destination</Button><Button onClick={copy}><Copy size={15} /> Copy link</Button></>} />
    <div className="detail-grid"><Card className="detail-main-card"><div className="detail-short-url"><span><Link2 size={17} /> {link.shortUrl}</span><Badge tone={link.status === 'Active' ? 'positive' : 'warning'}>{link.status}</Badge></div><div className="detail-stat-row"><div><small>Total clicks</small><strong>{(detailAnalytics?.totalClicks ?? link.clicks).toLocaleString()}</strong><span className="muted-cell">Selected date range</span></div><div><small>Unique visitors</small><strong>{(detailAnalytics?.uniqueVisitors ?? 0).toLocaleString()}</strong><span className="muted-cell">Privacy-conscious estimate</span></div><div><small>Created</small><strong className="small-value">{link.created}</strong><span className="muted-cell">Link owner</span></div></div><div className="card-heading detail-chart-head"><div><h2>Performance</h2><p>Clicks and unique visitors over time</p></div><span className="select-button">Last 30 days</span></div><div className="detail-chart">{trend.length ? <ClickTrendChart data={trend} /> : <div className="empty-state"><h3>No click activity yet</h3><p>Analytics will appear after this short link receives a visit.</p></div>}</div></Card>
      <div className="detail-side"><Card className="detail-info-card"><h2>Link information</h2>{editing ? <><Field label="Destination URL"><input value={destination} onChange={(event) => setDestination(event.target.value)} /></Field><div className="edit-actions"><Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button><Button onClick={save}>Save changes</Button></div></> : <dl className="info-list"><div><dt>Destination</dt><dd title={link.destination}>{link.destination}</dd></div><div><dt>Campaign</dt><dd>{link.campaign}</dd></div><div><dt>Folder</dt><dd>{link.folder || 'Unfiled'}</dd></div><div><dt>Tags</dt><dd>{link.tags || 'None'}</dd></div><div><dt>Expiry</dt><dd>{link.expiry || 'Never'}</dd></div><div><dt>Password</dt><dd>{link.password ? 'Protected' : 'None'}</dd></div></dl>}<button className="delete-link" onClick={remove}>Disable link and retain analytics</button></Card>{link.qr !== false && qrUrl && <Card className="detail-qr-card"><div><h2>QR code</h2><p>Scan to open this link</p></div><QRCodeSVG title={`QR code for ${link.alias}`} value={qrUrl} size={112} bgColor="#fff" fgColor="#101719" level="H" includeMargin /></Card>}</div></div>
  </div>
}
