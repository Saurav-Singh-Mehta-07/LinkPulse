import { Component, Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import { AppProvider } from './context/AppContext'

const LandingPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.LandingPage })))
const LoginPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.ResetPasswordPage })))
const ShortLinkPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.ShortLinkPage })))
const PublicBioPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.PublicBioPage })))
const LinkStatusPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.LinkStatusPage })))
const ErrorPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.ErrorPage })))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const LinksPage = lazy(() => import('./pages/Links').then((module) => ({ default: module.LinksPage })))
const LinkWizard = lazy(() => import('./pages/Links').then((module) => ({ default: module.LinkWizard })))
const LinkDetails = lazy(() => import('./pages/Links').then((module) => ({ default: module.LinkDetails })))
const AnalyticsPage = lazy(() => import('./pages/WorkspacePages').then((module) => ({ default: module.AnalyticsPage })))
const CampaignsPage = lazy(() => import('./pages/WorkspacePages').then((module) => ({ default: module.CampaignsPage })))
const OrganizationPage = lazy(() => import('./pages/WorkspacePages').then((module) => ({ default: module.OrganizationPage })))
const QrCodesPage = lazy(() => import('./pages/WorkspacePages').then((module) => ({ default: module.QrCodesPage })))
const ImportPage = lazy(() => import('./pages/WorkspacePages').then((module) => ({ default: module.ImportPage })))
const BioPage = lazy(() => import('./pages/WorkspacePages').then((module) => ({ default: module.BioPage })))
const SettingsPage = lazy(() => import('./pages/WorkspacePages').then((module) => ({ default: module.SettingsPage })))
const AdminDashboard = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminDashboard })))
const AdminLinksPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminLinksPage })))
const UsersPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.UsersPage })))
const AbusePage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AbusePage })))
const DomainsPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.DomainsPage })))
const AdminAnalyticsPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminAnalyticsPage })))
const AdminSettingsPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminSettingsPage })))

function LoadingPage() {
  return <div className="route-loading" role="status"><span className="loading-mark" /><span>Loading LinkPulse…</span></div>
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return <main className="error-boundary"><span className="brand-mark">!</span><h1>Something went wrong</h1><p>LinkPulse couldn’t render this page. Try reloading the app.</p><button className="button button-primary" onClick={() => window.location.reload()}>Reload app</button></main>
    return this.props.children
  }
}

function RouteTable() {
  return <Suspense fallback={<LoadingPage />}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/s/:alias" element={<ShortLinkPage />} />
    <Route path="/bio/:slug" element={<PublicBioPage />} />
    <Route path="/link/:status" element={<LinkStatusPage />} />
    <Route element={<AppShell />}>
      <Route path="/app" element={<Dashboard />} />
      <Route path="/app/links" element={<LinksPage />} />
      <Route path="/app/links/new" element={<LinkWizard />} />
      <Route path="/app/links/:id" element={<LinkDetails />} />
      <Route path="/app/analytics" element={<AnalyticsPage />} />
      <Route path="/app/campaigns" element={<CampaignsPage />} />
      <Route path="/app/organization" element={<OrganizationPage />} />
      <Route path="/app/qr-codes" element={<QrCodesPage />} />
      <Route path="/app/import" element={<ImportPage />} />
      <Route path="/app/bio" element={<BioPage />} />
      <Route path="/app/settings" element={<SettingsPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/links" element={<AdminLinksPage />} />
      <Route path="/admin/users" element={<UsersPage />} />
      <Route path="/admin/abuse" element={<AbusePage />} />
      <Route path="/admin/domains" element={<DomainsPage />} />
      <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
      <Route path="/admin/settings" element={<AdminSettingsPage />} />
    </Route>
    <Route path="*" element={<ErrorPage />} />
  </Routes></Suspense>
}

export default function App() {
  return <ErrorBoundary><AppProvider><RouteTable /></AppProvider></ErrorBoundary>
}
