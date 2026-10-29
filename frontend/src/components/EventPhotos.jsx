// Real event photography (free Unsplash licence: https://unsplash.com/license).
// Images load from Unsplash's image service in the viewer's browser, sized for the slot.
// If a photo cannot load (offline, blocked), it simply stays hidden and the light
// gradient underneath shows instead.
import { useEffect, useState } from 'react'
import { useReducedMotion } from '../lib/motion.js'

export const PHOTOS = {
  ceremonyDay: { id: 'photo-1769812344081-92b3e2ac39c0', alt: 'Outdoor wedding ceremony with flowers and chairs', time: 'day', page: 'https://unsplash.com/photos/ckNjKI5cH_E' },
  archwayDay: { id: 'photo-1670529776180-60e4132ab90c', alt: 'White floral archway over a path with gold chairs', time: 'day', page: 'https://unsplash.com/photos/aRQrz0fclB8' },
  gazeboDay: { id: 'photo-1523438885200-e635ba2c371e', alt: 'Garden gazebo beside a green tree', time: 'day', page: 'https://unsplash.com/photos/K8KiCHh4WU4' },
  tableDay: { id: 'photo-1511795409834-ef04bbd61622', alt: 'Elegant table setting with a floral centrepiece', time: 'day', page: 'https://unsplash.com/photos/aEnH4hJ_Mrs' },
  aisleNight: { id: 'photo-1607861884586-c7cfaed16290', alt: 'Outdoor wedding aisle lit at night between rows of chairs', time: 'night', page: 'https://unsplash.com/photos/xMDo8y776uE' },
  gazeboNight: { id: 'photo-1526092817387-8f07b2904e48', alt: 'String lights inside a gazebo at night', time: 'night', page: 'https://unsplash.com/photos/GcW93Uuljgo' },
  chandelierNight: { id: 'photo-1592318072094-2694c98adb73', alt: 'Glass chandelier lit at night', time: 'night', page: 'https://unsplash.com/photos/nroMmxBLQK4' },
  buntingNight: { id: 'photo-1464047736614-af63643285bf', alt: 'Bunting above warm glowing lights', time: 'night', page: 'https://unsplash.com/photos/gG6yehL64fo' },
  hallNight: { id: 'photo-1763429338698-439aa108e7fb', alt: 'Event hall with tables set for a banquet', time: 'night', page: 'https://unsplash.com/photos/m_CaYs0abOE' },
  glassesTable: { id: 'photo-1519225421980-715cb0215aed', alt: 'Glasses set out on a reception table', time: 'day', page: 'https://unsplash.com/photos/O38Id_cyV4M' },
  hallTables: { id: 'photo-1723832348105-2e69f948135a', alt: 'A large hall filled with set tables and chairs', time: 'day', page: 'https://unsplash.com/photos/Rkj0ms67lio' },
}

export const DAY_SET = [PHOTOS.ceremonyDay, PHOTOS.archwayDay, PHOTOS.tableDay, PHOTOS.gazeboDay]
export const NIGHT_SET = [PHOTOS.aisleNight, PHOTOS.gazeboNight, PHOTOS.chandelierNight, PHOTOS.buntingNight, PHOTOS.hallNight]
export const MIXED_SET = [PHOTOS.archwayDay, PHOTOS.aisleNight, PHOTOS.ceremonyDay, PHOTOS.gazeboNight, PHOTOS.tableDay, PHOTOS.chandelierNight]

export function photoUrl(photo, width = 1600) {
  return `https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=${width}&q=72`
}

// Day photos from 6 am to 5 pm in the company's time zone, night photos otherwise.
export function photosForNow(timeZone) {
  let hour = new Date().getHours()
  try {
    hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(new Date()))
  } catch {
    // keep the browser's hour
  }
  return hour >= 6 && hour < 17 ? DAY_SET : NIGHT_SET
}

// Photos crossfade one into the next, each slowly zooming (a "Ken Burns" move).
export function PhotoSlideshow({ photos, interval = 7000, width = 1600, className = '', imgClassName = '' }) {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState({})

  useEffect(() => {
    if (photos.length < 2) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % photos.length), interval)
    return () => clearInterval(timer)
  }, [photos.length, interval])

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {photos.map((photo, i) => {
        const active = i === index && !failed[photo.id]
        return (
          <img
            key={photo.id}
            src={photoUrl(photo, width)}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            onError={() => setFailed((f) => ({ ...f, [photo.id]: true }))}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1800ms] ease-in-out ${
              active ? 'opacity-100' : 'opacity-0'
            } ${active && !reduced ? 'ken-burns' : ''} ${imgClassName}`}
          />
        )
      })}
    </div>
  )
}

export function PhotoCredit({ className = '' }) {
  return (
    <a
      href="https://unsplash.com/license"
      target="_blank"
      rel="noreferrer"
      className={`text-[10px] font-medium text-ink-400 underline-offset-2 hover:text-ink-600 hover:underline ${className}`}
    >
      Photos: Unsplash
    </a>
  )
}
