const apiBase = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '')).replace(/\/+$/, '')
const publicShortBase = (import.meta.env.VITE_PUBLIC_SHORT_URL || apiBase).replace(/\/+$/, '')
let csrfToken
let csrfPromise

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details = null, requestId = null, cause } = {}) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }
}

async function readResponse(response) {
  if (response.status === 204) return null
  const type = response.headers.get('content-type') || ''
  if (!type.includes('application/json')) {
    if (!response.ok) {
      throw new ApiError('The server returned an unexpected response. Check the API URL and try again.', {
        status: response.status, code: 'HTTP_ERROR',
      })
    }
    return response.text()
  }
  const body = await response.json()
  if (!response.ok) {
    const payload = body?.error || {}
    throw new ApiError(payload.message || `Request failed (${response.status}).`, {
      status: response.status, code: payload.code || 'HTTP_ERROR',
      details: payload.details || null, requestId: payload.requestId || null,
    })
  }
  return body
}

async function fetchRequest(path, options = {}) {
  if (!apiBase && !import.meta.env.DEV) {
    throw new ApiError('The backend URL is not configured. Set VITE_API_URL and rebuild the frontend.', {
      code: 'CONFIG_ERROR',
    })
  }
  let response
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      credentials: 'include',
      headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
    })
  } catch (error) {
    throw new ApiError(`Cannot reach the LinkPulse API at ${apiBase}. Start the backend and check VITE_API_URL.`, { cause: error })
  }
  return readResponse(response)
}

async function ensureCsrf() {
  if (csrfToken) return csrfToken
  if (!csrfPromise) {
    csrfPromise = fetchRequest('/api/auth/csrf')
      .then(({ csrfToken: token }) => { csrfToken = token; return token })
      .finally(() => { csrfPromise = null })
  }
  return csrfPromise
}

async function refreshCsrf(failedToken) {
  if (csrfToken && csrfToken !== failedToken) return csrfToken
  csrfToken = null
  return ensureCsrf()
}

function dispatchUnauthorized(error) {
  if (error.status === 401) window.dispatchEvent(new CustomEvent('linkpulse:unauthorized'))
}

const csrfFailureCodes = new Set(['CSRF_TOKEN_MISSING', 'CSRF_TOKEN_INVALID', 'CSRF_TOKEN_EXPIRED'])

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const normalizedMethod = method.toUpperCase()
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod)
  let requestCsrf = null
  const send = (csrf) => fetchRequest(path, {
    method: normalizedMethod,
    ...(body instanceof FormData ? { body } : body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: { ...headers, ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
  })

  try {
    requestCsrf = mutating ? await ensureCsrf() : null
    return await send(requestCsrf)
  } catch (error) {
    if (mutating && error.status === 403 && csrfFailureCodes.has(error.code)) {
      const token = await refreshCsrf(requestCsrf)
      try {
        // CSRF middleware rejects before any route handler can perform a mutation.
        return await send(token)
      } catch (retryError) {
        dispatchUnauthorized(retryError)
        throw retryError
      }
    }
    dispatchUnauthorized(error)
    throw error
  }
}

const queryString = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const result = query.toString()
  return result ? `?${result}` : ''
}
const json = (method, body) => ({ method, body })

export const api = {
  baseUrl: apiBase,
  shortBaseUrl: publicShortBase,
  request,
  auth: {
    me: async () => (await request('/api/auth/me')).user,
    login: async (body) => (await request('/api/auth/login', json('POST', body))).user,
    register: async (body) => (await request('/api/auth/register', json('POST', body))).user,
    logout: () => request('/api/auth/logout', { method: 'POST' }),
    forgotPassword: (email) => request('/api/auth/password/forgot', json('POST', { email })),
    resetPassword: (body) => request('/api/auth/password/reset', json('POST', body)),
  },
  links: {
    list: (params = {}) => request(`/api/links${queryString(params)}`),
    get: async (id) => (await request(`/api/links/${encodeURIComponent(id)}`)).link,
    create: async (body) => (await request('/api/links', json('POST', body))).link,
    update: async (id, body) => (await request(`/api/links/${encodeURIComponent(id)}`, json('PATCH', body))).link,
    disable: async (id) => (await request(`/api/links/${encodeURIComponent(id)}`, { method: 'DELETE' })).link,
    aliasAvailability: (alias) => request(`/api/links/alias/${encodeURIComponent(alias)}/availability`),
    analytics: (id, params = {}) => request(`/api/links/${encodeURIComponent(id)}/analytics${queryString(params)}`),
    qr: (id) => request(`/api/links/${encodeURIComponent(id)}/qr`),
    unlock: (code, password) => request(`/api/links/public/${encodeURIComponent(code)}/unlock`, json('POST', { password })),
    importCsv: async (file) => {
      const form = new FormData()
      form.append('file', file)
      return request('/api/links/import', { method: 'POST', body: form })
    },
  },
  campaigns: {
    list: async () => (await request('/api/campaigns')).items,
    create: async (body) => (await request('/api/campaigns', json('POST', body))).campaign,
    update: async (id, body) => (await request(`/api/campaigns/${encodeURIComponent(id)}`, json('PATCH', body))).campaign,
    archive: (id) => request(`/api/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  tags: {
    list: async () => (await request('/api/tags')).items,
    create: async (body) => (await request('/api/tags', json('POST', body))).tag,
    update: async (id, body) => (await request(`/api/tags/${encodeURIComponent(id)}`, json('PATCH', body))).tag,
    remove: (id) => request(`/api/tags/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  folders: {
    list: async () => (await request('/api/folders')).items,
    create: async (body) => (await request('/api/folders', json('POST', body))).folder,
    update: async (id, body) => (await request(`/api/folders/${encodeURIComponent(id)}`, json('PATCH', body))).folder,
    remove: (id) => request(`/api/folders/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  bio: {
    get: async () => (await request('/api/bio')).bioPage,
    save: async (body) => (await request('/api/bio', json('PUT', body))).bioPage,
    public: async (slug) => (await request(`/api/bio/${encodeURIComponent(slug)}`)).bioPage,
  },
  analytics: {
    get: (params = {}) => request(`/api/analytics${queryString(params)}`),
    campaign: (id, params = {}) => request(`/api/analytics/campaigns/${encodeURIComponent(id)}${queryString(params)}`),
  },
  account: {
    profile: async () => (await request('/api/account/profile')).profile,
    updateProfile: async (body) => (await request('/api/account/profile', json('PATCH', body))).profile,
    preferences: async () => (await request('/api/account/preferences')).preferences,
    updatePreferences: async (body) => (await request('/api/account/preferences', json('PATCH', body))).preferences,
  },
  admin: {
    analytics: (params = {}) => request(`/api/admin/analytics${queryString(params)}`),
    links: (params = {}) => request(`/api/admin/links${queryString(params)}`),
    moderateLink: (id, reason, restore = false) => request(`/api/admin/links/${encodeURIComponent(id)}/${restore ? 'restore' : 'takedown'}`, json('PATCH', { reason })),
    users: (params = {}) => request(`/api/admin/users${queryString(params)}`),
    setUserStatus: (id, status) => request(`/api/admin/users/${encodeURIComponent(id)}/status`, json('PATCH', { status })),
    reports: (params = {}) => request(`/api/admin/abuse-reports${queryString(params)}`),
    reviewReport: (id, status, resolution = '') => request(`/api/admin/abuse-reports/${encodeURIComponent(id)}`, json('PATCH', { status, resolution })),
    domains: (params = {}) => request(`/api/admin/blocked-domains${queryString(params)}`),
    addDomain: (body) => request('/api/admin/blocked-domains', json('POST', body)),
    removeDomain: (id) => request(`/api/admin/blocked-domains/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    settings: async () => (await request('/api/admin/settings')).settings,
    updateSettings: async (body) => (await request('/api/admin/settings', json('PATCH', body))).settings,
    auditLogs: (params = {}) => request(`/api/admin/audit-logs${queryString(params)}`),
  },
}

export function normalizeLink(link, relations = {}) {
  const campaign = typeof link.campaignId === 'object' && link.campaignId ? link.campaignId.name : relations.campaigns?.find((item) => item._id === link.campaignId)?.name
  const folder = typeof link.folderId === 'object' && link.folderId ? link.folderId.name : relations.folders?.find((item) => item._id === link.folderId)?.name
  const tags = (link.tagIds || []).map((tag) => typeof tag === 'object' ? tag.name : relations.tags?.find((item) => item._id === tag)?.name).filter(Boolean)
  const shortUrl = link.shortUrl || new URL(`/${link.code}`, publicShortBase || window.location.origin).toString()
  const expiryDate = link.expiresAt ? new Date(link.expiresAt) : null
  const isExpiringSoon = link.status === 'active' && expiryDate && expiryDate > new Date() && expiryDate <= new Date(Date.now() + 7 * 86400000)
  return {
    ...link,
    id: link.id || link._id,
    alias: link.alias || link.code,
    shortUrl,
    clicks: link.clicks ?? link.clickCount ?? 0,
    status: (link.status || 'active') === 'active'
      ? expiryDate && expiryDate <= new Date() ? 'Expired' : isExpiringSoon ? 'Expiring soon' : 'Active'
      : 'Disabled',
    created: link.created || (link.createdAt ? new Date(link.createdAt).toLocaleDateString('en', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'),
    campaign: campaign || 'Unassigned',
    campaignId: typeof link.campaignId === 'object' ? link.campaignId?._id : link.campaignId,
    folder: folder || 'Unfiled',
    folderId: typeof link.folderId === 'object' ? link.folderId?._id : link.folderId,
    tags: tags.join(', '),
    tagIds: (link.tagIds || []).map((tag) => typeof tag === 'object' ? tag._id : tag),
    expiry: link.expiresAt ? new Date(link.expiresAt).toLocaleString() : '',
    password: Boolean(link.passwordProtected || link.hasPassword || link.passwordHash),
    qr: link.qrEnabled ?? true,
  }
}
