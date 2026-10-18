import { useEffect, useState } from 'react'
import { Activity, ArrowRight, ArrowUpRight, BarChart3, Check, CheckCircle2, Globe2, Link2, LockKeyhole, QrCode, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ClickTrendChart } from '../components/Charts'
import { Button, Card, Field } from '../components/ui'
import { useApp } from '../context/AppContext'
import { api } from '../services/api'

function PublicHeader() {
  return <header className="public-header"><Link to="/" className="brand"><span className="brand-mark"><Activity size={19} strokeWidth={2.4} /></span><span>link<span className="brand-accent">pulse</span></span></Link><nav><a href="#features">Features</a><a href="#analytics-preview">Analytics</a><a href="#security">Security</a></nav><div><Link to="/login" className="login-link">Log in</Link><Link to="/register" className="button button-primary button-sm">Get started <ArrowRight size={14} /></Link></div></header>
}

function PublicFooter() {
  return <footer className="public-footer"><Link to="/" className="brand"><span className="brand-mark"><Activity size={17} /></span><span>link<span className="brand-accent">pulse</span></span></Link><span>© 2026 LinkPulse. Clear links. Clear insights.</span><div><a href="#features">Features</a><Link to="/login">Sign in</Link><Link to="/register">Get started</Link></div></footer>
}

export function LandingPage() {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  function shorten(event) {
    event.preventDefault()
    try { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); navigate(`/app/links/new?destination=${encodeURIComponent(url)}`) }
    catch { setError('Please enter a valid URL, including https://.') }
  }
  return <div className="public-site"><PublicHeader />
    <main>
      <section className="landing-hero"><div className="hero-content"><div className="hero-kicker"><span className="live-pip" /> LINK INTELLIGENCE, IN FOCUS</div><h1>Every link has<br />{' '}a <span>story.</span></h1><p className="hero-subtitle">Shorten, share, and see what happens next. LinkPulse gives your links the clarity and intelligence to move your business forward.</p><form className="shorten-form" onSubmit={shorten}><Link2 size={17} /><input value={url} onChange={(event) => { setUrl(event.target.value); setError('') }} aria-label="Destination URL" placeholder="Paste a long link to shorten..." type="url" /><Button type="submit">Shorten link <ArrowRight size={15} /></Button></form>{error && <small className="landing-error">{error}</small>}<div className="hero-assurance"><span><CheckCircle2 size={14} /> No credit card required</span><span><CheckCircle2 size={14} /> Free to get started</span><span><CheckCircle2 size={14} /> Built for teams</span></div></div>
      <div className="hero-product-preview"><div className="preview-glow" /><div className="preview-window"><div className="preview-window-top"><div><i /><i /><i /></div><span>Product preview · illustrative metrics</span><span className="window-avatars">LP</span></div><div className="mini-dashboard"><div className="mini-sidebar"><span className="brand-mark"><Activity size={15} /></span><i className="mini-nav-active" /><i /><i /><i /><i /></div><div className="mini-main"><div className="mini-greeting"><div><small>OVERVIEW</small><h3>Your links, in focus</h3></div><span>Last 30 days⌄</span></div><div className="mini-stat-row"><div><small>Total clicks</small><strong>248,392</strong><em><ArrowUpRight size={10} />18.6%</em></div><div><small>Active links</small><strong>1,284</strong><em><ArrowUpRight size={10} />12.4%</em></div><div><small>Visitors</small><strong>184,205</strong><em><ArrowUpRight size={10} />9.2%</em></div></div><div className="mini-chart-card"><div><strong>Click performance</strong><small>Clicks over time</small></div><div className="mini-chart"><ClickTrendChart compact /></div></div><div className="mini-link-row"><span><Link2 size={12} /> Example short link</span><small>Illustrative</small><i>Preview</i></div></div></div></div></div><div className="hero-side-note"><span>01 / LINK ANALYTICS</span><strong>Make every<br />click count.</strong></div></section>
      <section className="trusted-strip"><span>BUILT FOR THE WAY MODERN TEAMS WORK</span><div><strong>northstar</strong><strong>frame<span>.</span></strong><strong>mono<span>®</span></strong><strong>STRATA</strong><strong>goodside</strong></div></section>
      <section className="public-features section-wrap" id="features"><div className="section-intro"><span className="eyebrow">MORE THAN A SHORT LINK</span><h2>From first click<br />to <span>what’s next.</span></h2><p>One small link can unlock a whole lot of signal. LinkPulse helps you create cleaner links and understand the people behind every visit.</p></div><div className="feature-grid"><Card className="feature-card feature-highlight"><span className="feature-icon"><Link2 size={19} /></span><h3>Links that look the part</h3><p>Build memorable short links with custom aliases, branded domains, and QR codes that bring your brand into every scan.</p><div className="feature-url"><span>lnk.pulse/</span><strong>your-next-launch</strong><Check size={15} /></div></Card><Card className="feature-card"><span className="feature-icon blue-feature"><BarChart3 size={19} /></span><h3>Clarity behind every click</h3><p>See where your audience comes from, what they use, and which campaigns are earning their attention.</p><div className="feature-stat"><strong>+24.8%</strong><span>campaign engagement <ArrowUpRight size={13} /></span></div></Card><Card className="feature-card"><span className="feature-icon violet-feature"><QrCode size={19} /></span><h3>Bridge print to digital</h3><p>Generate polished, high-resolution QR codes for packaging, events, and everything in between.</p><div className="feature-qr"><QrCode size={43} /><div><strong>Scan to discover</strong><small>Ready for wherever your audience is</small></div></div></Card><Card className="feature-card"><span className="feature-icon amber-feature"><ShieldCheck size={19} /></span><h3>Trust built into the link</h3><p>Password protection, expiring links, and click limits help you share confidently and stay in control.</p><div className="feature-security"><LockKeyhole size={16} /><span>Protected destination</span><i>ENABLED</i></div></Card></div></section>
      <section className="analytics-promo" id="analytics-preview"><div className="promo-copy"><span className="eyebrow">YOUR NEXT MOVE, INFORMED</span><h2>Good data makes<br /><span>great decisions.</span></h2><p>Get the full picture, not just the click count. LinkPulse turns your links into actionable insight — so your next move is always a little smarter.</p><Link to="/register" className="text-link">See what your links can do <ArrowRight size={15} /></Link></div><div className="promo-dashboard"><div className="promo-dash-header"><span>Illustrative analytics preview</span><small>Example data</small></div><div className="promo-graph"><ClickTrendChart /></div><div className="promo-legend"><span><i /> Clicks</span><span><i /> Visitors</span><strong>— <small>real-time data appears in your account</small></strong></div></div></section>
      <section className="security-section" id="security"><div className="security-symbol"><ShieldCheck size={23} /></div><div><span className="eyebrow">PRIVACY, WITHOUT THE FOOTNOTES</span><h2>Your links. Your data.<br />Always <span>in your control.</span></h2><p>We believe link intelligence should be built on trust. Keep sensitive destinations private, set your own expiration rules, and stay in control from first share to final click.</p><ul><li><Check size={15} /> Password-protected destinations</li><li><Check size={15} /> Configurable expiry and click limits</li><li><Check size={15} /> Transparent analytics controls</li></ul></div><div className="security-seal"><ShieldCheck size={42} /><span>SECURE BY<br />DESIGN</span></div></section>
      <section className="landing-cta"><div className="cta-spark"><Sparkles size={19} /></div><span className="eyebrow">A CLEARER PICTURE STARTS HERE</span><h2>Ready to see what’s<br /><span>behind your links?</span></h2><p>Sign up free. Your next insight is one click away.</p><Link to="/register" className="button button-primary">Get started with LinkPulse <ArrowRight size={15} /></Link></section>
    </main><PublicFooter />
  </div>
}

function AuthLayout({ title, subtitle, children, footer }) {
  return <div className="auth-page"><Link to="/" className="brand auth-brand"><span className="brand-mark"><Activity size={19} /></span><span>link<span className="brand-accent">pulse</span></span></Link><Card className="auth-card"><span className="auth-accent"><Zap size={15} /></span><h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>{children}<div className="auth-foot">{footer}</div></Card><span className="auth-legal">© 2026 LinkPulse · Privacy first</span></div>
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  async function submit(event) {
    event.preventDefault()
    if (!email.includes('@') || !password) { setError('Enter a valid email and your password.'); return }
    setLoading(true)
    try { await signIn({ email, password }); navigate(location.state?.from || '/app', { replace: true }) }
    catch (reason) { setError(reason.message); setLoading(false) }
  }
  return <AuthLayout title="Welcome back" subtitle="Sign in to your LinkPulse workspace." footer={<>New to LinkPulse? <Link to="/register">Create your account</Link></>}>
    <form className="auth-form" onSubmit={submit}><Field label="Email address" error={error && !email.includes('@') ? 'Enter a valid email address.' : ''}><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="you@company.com" autoComplete="email" required /></Field><Field label="Password"><input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} placeholder="Enter your password" autoComplete="current-password" required /><Link className="forgot-link" to="/forgot-password">Forgot password?</Link></Field>{error && <div className="auth-error" role="alert">{error}</div>}<Button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'} {!loading && <ArrowRight size={15} />}</Button></form>
  </AuthLayout>
}

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  async function submit(event) {
    event.preventDefault()
    if (!name.trim() || !email.includes('@') || password.length < 12) { setError('Add your name, a valid email, and a password of at least 12 characters.'); return }
    setLoading(true)
    try { await register({ name, email, password }); navigate(location.state?.from || '/app', { replace: true }) }
    catch (reason) { setError(reason.message); setLoading(false) }
  }
  return <AuthLayout title="Create your account" subtitle="Start making every link more meaningful." footer={<>Already have an account? <Link to="/login">Sign in</Link></>}>
    <form className="auth-form" onSubmit={submit}><Field label="Your name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" autoComplete="name" required /></Field><Field label="Work email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required /></Field><Field label="Password"><input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} placeholder="At least 12 characters" autoComplete="new-password" required /></Field>{error && <div className="auth-error" role="alert">{error}</div>}<Button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Creating account…' : 'Create free account'} {!loading && <ArrowRight size={15} />}</Button></form>
  </AuthLayout>
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event) { event.preventDefault(); if (!email.includes('@')) { setError('Enter a valid email address.'); return } setLoading(true); try { await api.auth.forgotPassword(email); setError(''); setSent(true) } catch (reason) { setError(reason.message) } finally { setLoading(false) } }
  return <AuthLayout title={sent ? 'Check your inbox' : 'Reset your password'} subtitle={sent ? `If an account exists for ${email}, a reset link would be sent.` : 'Enter the email associated with your account.'} footer={<>Remembered it? <Link to="/login">Back to sign in</Link></>}>
    {sent ? <div className="reset-confirm"><span><CheckCircle2 size={20} /></span><p>If an account exists for that address, password reset instructions have been sent.</p><Link to="/login" className="text-link">Return to sign in <ArrowRight size={14} /></Link></div> : <form className="auth-form" onSubmit={submit}><Field label="Email address" error={error}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required /></Field><Button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset instructions'} <ArrowRight size={15} /></Button></form>}
  </AuthLayout>
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  async function submit(event) { event.preventDefault(); if (password.length < 12) { setError('Use at least 12 characters.'); return } if (password !== confirmation) { setError('Passwords do not match.'); return } const token = searchParams.get('token'); if (!token) { setError('This password reset link is missing its token. Request a new one.'); return } setLoading(true); try { await api.auth.resetPassword({ token, password }); setError(''); setConfirmed(true) } catch (reason) { setError(reason.message) } finally { setLoading(false) } }
  return <AuthLayout title={confirmed ? 'Password updated' : 'Choose a new password'} subtitle={confirmed ? 'Your password has been updated. Sign in with your new password.' : 'Create a strong password for your LinkPulse account.'} footer={<>Back to <Link to="/login">sign in</Link></>}>
    {confirmed ? <div className="reset-confirm"><span><CheckCircle2 size={20} /></span><p>Your password has been updated successfully.</p><Link to="/login" className="text-link">Sign in <ArrowRight size={14} /></Link></div> : <form className="auth-form" onSubmit={submit}><Field label="New password"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /></Field><Field label="Confirm password"><input type="password" value={confirmation} autoComplete="new-password" required onChange={(event) => { setConfirmation(event.target.value); setError('') }} /></Field>{error && <div className="auth-error" role="alert">{error}</div>}<Button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Updating…' : 'Update password'} <ArrowRight size={15} /></Button></form>}
  </AuthLayout>
}

function PublicState({ icon: Icon, eyebrow, title, description, action }) {
  return <div className="public-state-page"><Link to="/" className="brand auth-brand"><span className="brand-mark"><Activity size={18} /></span><span>link<span className="brand-accent">pulse</span></span></Link><div className="public-state-card"><span className="state-symbol"><Icon size={22} /></span><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p>{action}</div><span className="state-foot">Secure links, clear insights · LinkPulse</span></div>
}

export function ShortLinkPage() {
  const { alias } = useParams()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const code = searchParams.get('code')
  async function unlock(event) {
    event.preventDefault()
    if (!code) { setError('This protected link is missing its short code.'); return }
    setLoading(true)
    try {
      await api.links.unlock(code, password)
      window.location.assign(`${api.shortBaseUrl}/${encodeURIComponent(code)}`)
    } catch (reason) { setError(reason.message); setLoading(false) }
  }
  if (alias === 'locked') return <PublicState icon={LockKeyhole} eyebrow="PROTECTED DESTINATION" title="This link is private" description="Enter the password shared by the link creator to continue." action={<form className="unlock-form" onSubmit={unlock}><Field label="Link password" error={error}><input type="password" autoFocus value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} placeholder="Enter password" /></Field><Button type="submit" disabled={!password || loading}>{loading ? 'Checking…' : 'Unlock destination'} <ArrowRight size={14} /></Button></form>} />
  return <PublicState icon={Globe2} eyebrow="LINK STATUS" title={alias === 'expired' ? 'This link has expired' : alias === 'disabled' ? 'This link is unavailable' : 'We couldn’t open this link'} description={alias === 'expired' ? 'The link owner set an expiration date that has passed.' : alias === 'disabled' ? 'The link owner has disabled this destination.' : `“${alias}” isn’t available.`} action={<Link to="/" className="text-link">Go to LinkPulse <ArrowRight size={14} /></Link>} />
}

export function ErrorPage() {
  return <PublicState icon={Globe2} eyebrow="404 · PAGE NOT FOUND" title="This page took a wrong turn." description="The page you’re looking for doesn’t exist or may have moved." action={<Link to="/" className="text-link">Back to home <ArrowRight size={14} /></Link>} />
}

export function PublicBioPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.bio.public(slug)
      .then((result) => { if (!cancelled) { setPage(result); setError('') } })
      .catch((reason) => { if (!cancelled) setError(reason.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])
  if (loading) return <div className="route-loading" role="status"><span className="loading-mark" /><span>Loading bio page…</span></div>
  if (error || !page) return <PublicState icon={Globe2} eyebrow="LINK IN BIO" title="This page is unavailable" description={error || 'This page is not published or no longer exists.'} action={<Link to="/" className="text-link">Go to LinkPulse <ArrowRight size={14} /></Link>} />
  return <main className={`public-state-page bio-public-page theme-${page.theme || 'dark'}`}><div className="bio-phone-preview"><div className="bio-profile-avatar">{page.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><h1>{page.displayName}</h1><p>{page.bio}</p>{page.links.map((item) => <a className="bio-preview-link" key={item._id || item.url} href={item.url} target="_blank" rel="noreferrer">{item.title}<ArrowRight size={15} /></a>)}<Link to="/" className="text-link">Made with LinkPulse</Link></div></main>
}

export function LinkStatusPage() {
  const { status } = useParams()
  const title = status === 'expired' ? 'This link has expired' : status === 'disabled' ? 'This link is unavailable' : 'We couldn’t open this link'
  const description = status === 'expired' ? 'The link owner set an expiration date that has passed.' : status === 'disabled' ? 'The link owner has disabled this destination.' : 'This short link is invalid or could not be found.'
  return <PublicState icon={Globe2} eyebrow="LINK STATUS" title={title} description={description} action={<Link to="/" className="text-link">Go to LinkPulse <ArrowRight size={14} /></Link>} />
}
