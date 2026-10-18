import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, ArrowUpRight, BarChart3, Bell, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Command, FileUp, FolderKanban, Gauge, Globe2, Grid2X2, Link2,
  Menu, QrCode, Search, Settings2, ShieldAlert, Tags, UsersRound, X,
} from 'lucide-react'
import { IconButton, Toast } from './ui'
import { useApp } from '../context/AppContext'

const groups = [
  { label: 'Workspace', items: [
    { label: 'Overview', path: '/app', icon: Gauge },
    { label: 'Links', path: '/app/links', icon: Link2, count: '1.2k' },
    { label: 'Analytics', path: '/app/analytics', icon: BarChart3 },
    { label: 'Campaigns', path: '/app/campaigns', icon: FolderKanban },
  ] },
  { label: 'Manage', items: [
    { label: 'Tags & folders', path: '/app/organization', icon: Tags },
    { label: 'QR codes', path: '/app/qr-codes', icon: QrCode },
    { label: 'Bulk import', path: '/app/import', icon: FileUp },
    { label: 'Link in bio', path: '/app/bio', icon: Grid2X2 },
  ] },
  { label: 'Platform', items: [
    { label: 'Admin overview', path: '/admin', icon: ShieldAlert },
    { label: 'Global links', path: '/admin/links', icon: Globe2 },
    { label: 'User management', path: '/admin/users', icon: UsersRound },
    { label: 'Abuse monitoring', path: '/admin/abuse', icon: ShieldAlert },
    { label: 'Domain blocklist', path: '/admin/domains', icon: Settings2 },
    { label: 'Platform analytics', path: '/admin/analytics', icon: Activity },
    { label: 'Admin settings', path: '/admin/settings', icon: Settings2 },
  ] },
]

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, authLoading, toast, notify, dismissToast, links, signOut: endSession } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const navGroups = user?.role === 'admin' ? groups : groups.filter((group) => group.label !== 'Platform')
  const initials = (user?.name || user?.email || 'LP').split(/[\s@]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
  const matches = query.trim() ? links.filter((link) => `${link.alias} ${link.destination} ${link.campaign}`.toLowerCase().includes(query.toLowerCase())).slice(0, 4) : []
  const activeLabel = navGroups.flatMap((group) => group.items).find((item) => location.pathname === item.path)?.label
    || (location.pathname.includes('/links/') ? 'Link details' : 'Create link')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: `${location.pathname}${location.search}` } })
      return
    }
    if (location.pathname.startsWith('/admin') && user.role !== 'admin') {
      navigate('/app', { replace: true })
    }
  }, [authLoading, user, location.pathname, navigate])

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setProfileOpen(false)
        setDrawer(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function signOut() {
    try {
      await endSession()
      navigate('/', { replace: true })
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  if (authLoading || !user || (location.pathname.startsWith('/admin') && user.role !== 'admin')) {
    return <div className="route-loading" role="status"><span className="loading-mark" /><span>{authLoading ? 'Restoring your session…' : 'Opening your workspace…'}</span></div>
  }

  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${drawer ? 'drawer-open' : ''}`}>
    {drawer && <button className="drawer-backdrop" aria-label="Close navigation" onClick={() => setDrawer(false)} />}
    <aside className="sidebar">
      <div className="brand-row"><Link to="/app" className="brand"><span className="brand-mark"><Activity size={19} strokeWidth={2.4} /></span>{!collapsed && <span>link<span className="brand-accent">pulse</span></span>}</Link><IconButton label="Close navigation" className="mobile-close" onClick={() => setDrawer(false)}><X size={18} /></IconButton></div>
      <div className="workspace-select"><span className="workspace-avatar">{initials.slice(0, 1)}</span>{!collapsed && <span className="workspace-copy"><strong>{user.name}</strong><small>{user.plan || user.role}</small></span>}</div>
      <div className="side-nav">{navGroups.map((group) => <div className="nav-group" key={group.label}><div className="nav-label">{!collapsed && group.label}</div>{group.items.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === '/app' || path === '/admin'} onClick={() => setDrawer(false)} title={collapsed ? label : undefined} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{path === '/app/links' && <small>{links.length}</small>}</NavLink>)}</div>)}</div>
      <div className="sidebar-bottom"><NavLink to="/app/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setDrawer(false)}><Settings2 size={18} /><span>Settings</span></NavLink><button className="help-card" onClick={() => notify('Help center opens when connected to the LinkPulse support workspace.')}><span className="help-icon"><CircleHelp size={17} /></span>{!collapsed && <span><strong>Need a hand?</strong><small>Visit our help center <ArrowUpRight size={11} /></small></span>}</button><button className="collapse-control" onClick={() => setCollapsed((state) => !state)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Collapse</>}</button></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="topbar-left"><IconButton label="Open navigation" className="menu-trigger" onClick={() => setDrawer(true)}><Menu size={19} /></IconButton><div className="breadcrumbs">Workspace <ChevronRight size={14} /><strong>{activeLabel}</strong></div></div>
        <div className="topbar-actions">
          <button className={`global-search ${searchOpen ? 'search-active' : ''}`} onClick={() => setSearchOpen((open) => !open)}><Search size={16} /><span>Search links, campaigns...</span><kbd><Command size={11} /> K</kbd></button>
          <IconButton label="Notifications" className="notification-button" onClick={() => notify('Notifications are not configured for this account yet.', 'info')}><Bell size={18} /></IconButton>
          <div className="profile-wrap"><button className="profile-trigger" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}><span className="user-avatar">{initials}</span><ChevronDown size={13} /></button>{profileOpen && <div className="profile-menu"><strong>{user.name}</strong><small>{user.email}</small><Link to="/app/settings" onClick={() => setProfileOpen(false)}>Profile & settings</Link><button onClick={signOut}>Sign out</button></div>}</div>
        </div>
        {searchOpen && <div className="search-panel"><div className="search-input-wrap"><Search size={17} /><input autoFocus placeholder="Search your links..." value={query} onChange={(event) => setQuery(event.target.value)} /><IconButton label="Close search" onClick={() => { setSearchOpen(false); setQuery('') }}><X size={15} /></IconButton></div><div className="search-results">{matches.length ? matches.map((link) => <button key={link.id} onClick={() => { navigate(`/app/links/${link.id}`); setSearchOpen(false); setQuery('') }}><Link2 size={16} /><span><strong>{link.alias}</strong><small>{link.destination}</small></span><span className="result-clicks">{link.clicks.toLocaleString()} clicks</span></button>) : <p>{query ? 'No links found. Try another search.' : 'Type to search across links and campaigns.'}</p>}</div></div>}
      </header>
      <main className="main-content"><Outlet /></main>
      <footer className="app-footer"><span>© 2026 LinkPulse</span><span>Account-backed workspace</span><span><i className="online-dot" /> API connection required</span></footer>
    </div>
    <Toast toast={toast} onClose={dismissToast} />
  </div>
}
