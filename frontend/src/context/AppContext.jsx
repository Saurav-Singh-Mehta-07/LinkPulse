import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, normalizeLink } from '../services/api'

const AppContext = createContext(null)

function formatCampaign(item, links, analytics) {
  const report = analytics?.campaigns?.find((campaign) => campaign.campaignId === item._id)
  const campaignLinks = links.filter((link) => link.campaignId === item._id)
  const clicks = report?.clicks ?? campaignLinks.reduce((sum, link) => sum + link.clicks, 0)
  return {
    ...item,
    id: item._id,
    links: campaignLinks.length,
    clicks: clicks.toLocaleString(),
    clickCount: clicks,
    change: '—',
    progress: 0,
    status: item.status === 'active' ? 'Active' : item.status === 'archived' ? 'Archived' : 'Paused',
  }
}

export function AppProvider({ children }) {
  const [links, setLinks] = useState([])
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [campaigns, setCampaigns] = useState([])
  const [tags, setTags] = useState([])
  const [folders, setFolders] = useState([])
  const [bioPage, setBioPage] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [adminAnalytics, setAdminAnalytics] = useState(null)
  const [toast, setToast] = useState(null)
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)

  const notify = useCallback((message, type = 'success') => setToast({ message, type, key: Date.now() }), [])
  const dismissToast = useCallback(() => setToast(null), [])

  const refreshLinks = useCallback(async (params = {}) => {
    if (!user) { setLinks([]); setLoadingLinks(false); return [] }
    setLoadingLinks(true)
    try {
      const result = await api.links.list({ page: 1, limit: 100, ...params })
      const normalized = result.items.map((item) => normalizeLink(item, { campaigns, folders, tags }))
      setLinks(normalized)
      return normalized
    } finally {
      setLoadingLinks(false)
    }
  }, [user, campaigns, folders, tags])

  const refreshWorkspace = useCallback(async () => {
    if (!user) return
    setLoadingWorkspace(true)
    try {
      const [campaignResult, tagResult, folderResult, bioResult, analyticsResult, linkResult] = await Promise.all([
        api.campaigns.list(),
        api.tags.list(),
        api.folders.list(),
        api.bio.get(),
        api.analytics.get(),
        api.links.list({ page: 1, limit: 100 }),
      ])
      const normalizedLinks = linkResult.items.map((item) => normalizeLink(item, {
        campaigns: campaignResult, folders: folderResult, tags: tagResult,
      }))
      setCampaigns(campaignResult)
      setTags(tagResult)
      setFolders(folderResult)
      setBioPage(bioResult)
      setAnalytics(analyticsResult)
      setLinks(normalizedLinks)
    } finally {
      setLoadingLinks(false)
      setLoadingWorkspace(false)
    }
  }, [user])

  const refreshAnalytics = useCallback(async (params = {}) => {
    const result = await api.analytics.get(params)
    setAnalytics(result)
    return result
  }, [])

  const refreshAdminAnalytics = useCallback(async (params = {}) => {
    const result = await api.admin.analytics(params)
    setAdminAnalytics(result)
    return result
  }, [])

  const loadUser = useCallback(async () => {
    setAuthLoading(true)
    try {
      const currentUser = await api.auth.me()
      setUser(currentUser)
      return currentUser
    } catch (error) {
      if (error.status !== 401) notify(error.message, 'error')
      setUser(null)
      setLinks([])
      setCampaigns([])
      setTags([])
      setFolders([])
      setBioPage(null)
      return null
    } finally {
      setAuthLoading(false)
    }
  }, [notify])

  useEffect(() => {
    loadUser()
    const unauthorized = () => {
      setUser(null)
      setLinks([])
      setCampaigns([])
      setTags([])
      setFolders([])
      setBioPage(null)
    }
    window.addEventListener('linkpulse:unauthorized', unauthorized)
    return () => window.removeEventListener('linkpulse:unauthorized', unauthorized)
  }, [loadUser])

  useEffect(() => {
    if (user) {
      refreshWorkspace().catch((error) => notify(error.message, 'error'))
    } else if (!authLoading) {
      setLoadingLinks(false)
    }
  }, [user, authLoading, refreshWorkspace, notify])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const signIn = useCallback(async (credentials) => {
    const current = await api.auth.login(credentials)
    setUser(current)
    return current
  }, [])
  const register = useCallback(async (values) => {
    const current = await api.auth.register(values)
    setUser(current)
    return current
  }, [])
  const signOut = useCallback(async () => {
    await api.auth.logout()
    setUser(null)
    setLinks([])
    setCampaigns([])
    setTags([])
    setFolders([])
    setBioPage(null)
  }, [])

  const resolveTagIds = useCallback(async (values) => {
    if (Array.isArray(values.tagIds)) return values.tagIds
    const names = typeof values.tags === 'string'
      ? values.tags.split(',').map((name) => name.trim()).filter(Boolean)
      : []
    const resolved = []
    for (const name of names) {
      let tag = tags.find((item) => item.name.toLowerCase() === name.toLowerCase())
      if (!tag) {
        tag = await api.tags.create({ name })
        setTags((items) => [...items, tag])
      }
      resolved.push(tag._id)
    }
    return resolved
  }, [tags])

  const createLink = useCallback(async (values) => {
    const tagIds = await resolveTagIds(values)
    const result = await api.links.create({
      destination: values.destination.trim(),
      ...(values.alias?.trim() ? { alias: values.alias.trim() } : {}),
      ...(values.title?.trim() ? { title: values.title.trim() } : {}),
      campaignId: values.campaignId || null,
      folderId: values.folderId || null,
      tagIds,
      expiresAt: values.expiresAt || values.expiry || null,
      maxClicks: values.maxClicks ? Number(values.maxClicks) : null,
      password: values.password || null,
      qrEnabled: values.qrEnabled ?? values.qr ?? true,
    })
    const link = normalizeLink(result, { campaigns, folders, tags })
    await refreshLinks()
    return link
  }, [campaigns, folders, refreshLinks, resolveTagIds, tags])

  const updateLink = useCallback(async (id, changes) => {
    const payload = { ...changes }
    if (payload.status) payload.status = payload.status.toLowerCase() === 'active' ? 'active' : 'disabled'
    if (payload.expiry !== undefined && payload.expiresAt === undefined) {
      payload.expiresAt = payload.expiry || null
      delete payload.expiry
    }
    if (payload.maxClicks === '') payload.maxClicks = null
    else if (payload.maxClicks !== undefined && payload.maxClicks !== null) payload.maxClicks = Number(payload.maxClicks)
    if (payload.campaign && !payload.campaignId) {
      payload.campaignId = campaigns.find((item) => item.name === payload.campaign)?._id || null
      delete payload.campaign
    }
    if (payload.folder && !payload.folderId) {
      payload.folderId = folders.find((item) => item.name === payload.folder)?._id || null
      delete payload.folder
    }
    if (typeof payload.tags === 'string') {
      payload.tagIds = await resolveTagIds({ tags: payload.tags })
      delete payload.tags
    }
    delete payload.qr
    const result = await api.links.update(id, payload)
    await refreshLinks()
    return normalizeLink(result, { campaigns, folders, tags })
  }, [campaigns, folders, refreshLinks, resolveTagIds, tags])

  const deleteLink = useCallback(async (id) => {
    const result = await api.links.disable(id)
    await refreshLinks()
    return result
  }, [refreshLinks])

  const value = useMemo(() => ({
    links, loadingLinks, user, setUser, authLoading, loadingWorkspace,
    campaigns: campaigns.map((item) => formatCampaign(item, links, analytics)),
    rawCampaigns: campaigns, tags, folders, bioPage, analytics, adminAnalytics,
    toast, notify, dismissToast, refreshLinks, refreshWorkspace, refreshAnalytics, refreshAdminAnalytics,
    signIn, register, signOut,
    createLink, updateLink, deleteLink,
    setCampaigns, setTags, setFolders, setBioPage,
  }), [
    links, loadingLinks, user, authLoading, loadingWorkspace, campaigns, tags, folders, bioPage,
    analytics, adminAnalytics, toast, notify, dismissToast, refreshLinks, refreshWorkspace,
    refreshAnalytics, refreshAdminAnalytics, signIn, register, signOut, createLink, updateLink, deleteLink,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider.')
  return context
}
