import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorText } from './api.js'

// Loads `path` and reloads when it changes. Pass null to skip.
// `refreshMs` polls in the background (used by the live board).
export function useApi(path, { refreshMs } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(path))
  const current = useRef(path)

  const reload = useCallback(async () => {
    if (!path) return
    current.current = path
    try {
      const result = await api(path)
      if (current.current === path) {
        setData(result)
        setError('')
      }
    } catch (err) {
      if (current.current === path) setError(errorText(err))
    } finally {
      if (current.current === path) setLoading(false)
    }
  }, [path])

  useEffect(() => {
    setLoading(Boolean(path))
    reload()
    if (!refreshMs || !path) return undefined
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') reload()
    }, refreshMs)
    return () => clearInterval(timer)
  }, [path, reload, refreshMs])

  return { data, setData, error, loading, reload }
}

export function query(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}
