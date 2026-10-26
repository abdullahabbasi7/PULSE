// Small fetch wrapper for the PULSE API.
// - Adds the access token to every request.
// - On a 401 it refreshes the tokens once and retries.
// - If refreshing fails, it clears the tokens and fires a 'pulse:logout' event.

const BASE = '/api/v1'
const STORAGE_KEY = 'pulse.tokens'

export function getTokens() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function setTokens(tokens) {
  try {
    if (tokens) localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); the app still works for this tab.
  }
}

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

function messageFrom(data) {
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : ''
        const text = (item.msg || '').replace(/^Value error, /, '')
        return field && field !== 'body' ? `${field}: ${text}` : text
      })
      .join(' ')
  }
  return 'Something went wrong. Please try again.'
}

// Text to show the user for any error thrown by api() (or a network failure).
export function errorText(err) {
  if (err instanceof ApiError) return err.message
  return 'Could not reach the PULSE server. Check your connection and try again.'
}

let refreshInFlight = null

async function refreshTokens() {
  const tokens = getTokens()
  if (!tokens?.refresh_token) return false
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    })
      .then(async (response) => {
        if (!response.ok) return false
        setTokens(await response.json())
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

export async function api(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const tokens = getTokens()
  if (auth && tokens?.access_token) headers.Authorization = `Bearer ${tokens.access_token}`

  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the PULSE server. Check that the backend is running.')
  }

  if (response.status === 401 && auth) {
    if (retry && (await refreshTokens())) {
      return api(path, { method, body, auth, retry: false })
    }
    setTokens(null)
    window.dispatchEvent(new Event('pulse:logout'))
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, messageFrom(data), data)
  return data
}
