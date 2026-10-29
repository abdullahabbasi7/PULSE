import { useEffect, useState } from 'react'

// True when the person has asked their system for less motion.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  useEffect(() => {
    let media
    try {
      media = window.matchMedia('(prefers-reduced-motion: reduce)')
    } catch {
      return undefined
    }
    const onChange = () => setReduced(media.matches)
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])
  return reduced
}

// Becomes true once the element has scrolled into view (and stays true).
export function useInView(ref, { rootMargin = '0px 0px -8% 0px' } = {}) {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, seen, rootMargin])
  return seen
}
