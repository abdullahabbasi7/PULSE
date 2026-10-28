import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getTokens, setTokens } from '../lib/api.js'

const AuthContext = createContext(null)

const ANONYMOUS = { status: 'anonymous', user: null, company: null }

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, company: null })

  const loadMe = useCallback(async () => {
    if (!getTokens()) {
      setState(ANONYMOUS)
      return
    }
    try {
      const me = await api('/auth/me')
      setState({ status: 'authenticated', user: me.user, company: me.company })
    } catch {
      setTokens(null)
      setState(ANONYMOUS)
    }
  }, [])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  useEffect(() => {
    const onLogout = () => setState(ANONYMOUS)
    window.addEventListener('pulse:logout', onLogout)
    return () => window.removeEventListener('pulse:logout', onLogout)
  }, [])

  const login = useCallback(
    async (identifier, password) => {
      const tokens = await api('/auth/login', { method: 'POST', body: { identifier, password }, auth: false })
      setTokens(tokens)
      await loadMe()
    },
    [loadMe],
  )

  const signup = useCallback(
    async (payload) => {
      // A sign-up is a request: no tokens until the PULSE team approves the company.
      return api('/auth/signup', { method: 'POST', body: payload, auth: false })
    },
    [],
  )

  const logout = useCallback(() => {
    setTokens(null)
    setState(ANONYMOUS)
  }, [])

  const setCompany = useCallback((company) => setState((current) => ({ ...current, company })), [])

  // After a password change the server issues new tokens; older sessions stop working.
  const replaceTokens = useCallback((tokens) => setTokens(tokens), [])

  const value = useMemo(
    () => ({ ...state, login, signup, logout, reload: loadMe, setCompany, replaceTokens }),
    [state, login, signup, logout, loadMe, setCompany, replaceTokens],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
