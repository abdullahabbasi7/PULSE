import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Alert, Badge, Button, Card, Field, SelectField, useToast } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { api, errorText } from '../../lib/api.js'
import { clockTime, formatNumber } from '../../lib/format.js'
import { useCamera } from '../../lib/useCamera.js'
import { useApi } from '../../lib/useApi.js'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { CATEGORY_LABEL, EventSelect } from './shared.jsx'

const DIRECTIONS = [
  { id: 'out', label: 'Send out', hint: 'Loading for the event', icon: 'arrowLeft' },
  { id: 'in', label: 'Return', hint: 'Back in the store', icon: 'download' },
  { id: 'lost', label: 'Lost', hint: 'Not coming back', icon: 'alert' },
]

function Scanner({ onCode }) {
  const camera = useCamera({ facingMode: 'environment' })
  const canvasRef = useRef(null)
  const last = useRef({ code: '', at: 0 })

  useEffect(() => {
    if (camera.state !== 'on') return undefined
    let raf
    let lastRun = 0
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      if (now - lastRun < 180) return
      lastRun = now
      const video = camera.videoRef.current
      const canvas = canvasRef.current
      if (!video?.videoWidth || !canvas) return
      const w = 480
      const h = Math.round((video.videoHeight / video.videoWidth) * w)
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(video, 0, 0, w, h)
      const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
      if (found?.data) {
        const t = Date.now()
        if (found.data !== last.current.code || t - last.current.at > 2500) {
          last.current = { code: found.data, at: t }
          navigator.vibrate?.(40)
          onCode(found.data)
        }
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [camera.state, camera.videoRef, onCode])

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-900">
        <video ref={camera.videoRef} playsInline muted className={`h-full w-full object-cover ${camera.state === 'on' ? '' : 'opacity-0'}`} />
        {camera.state === 'on' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/2 w-1/2 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(23,28,52,0.35)]" />
          </div>
        )}
        {camera.state !== 'on' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <Icon name="scan" className="h-10 w-10 text-white/70" />
            <p className="text-sm text-white/80">Point the camera at an item's QR label.</p>
            <Button onClick={camera.start} loading={camera.state === 'starting'} className="!bg-white !text-ink-900 hover:!bg-brand-50">
              <Icon name="camera" className="h-4 w-4" />
              Start camera
            </Button>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {camera.error && (
        <div className="mt-3">
          <Alert tone="warning">{camera.error}</Alert>
        </div>
      )}
      {camera.state === 'on' && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={camera.stop}>
          Stop camera
        </Button>
      )}
    </div>
  )
}

export function ScanTab({ items, events, onRecorded, bookingId, setBookingId }) {
  const { company } = useAuth()
  const toast = useToast()
  const [direction, setDirection] = useState('out')
  const [item, setItem] = useState(null)
  const [qty, setQty] = useState('')
  const [damaged, setDamaged] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const movements = useApi(bookingId ? `/inventory/movements?booking_id=${bookingId}&limit=30` : null)

  async function onCode(code) {
    setError('')
    try {
      const found = await api(`/inventory/items/by-qr/${encodeURIComponent(code)}`)
      setItem(found)
      setQty('')
      setDamaged('')
    } catch (err) {
      setError(err.status === 404 ? 'That QR code is not one of your items.' : errorText(err))
    }
  }

  async function record() {
    setError('')
    if (!bookingId) {
      setError('Choose the event first.')
      return
    }
    setBusy(true)
    try {
      const m = await api('/inventory/movements', {
        method: 'POST',
        body: { booking_id: bookingId, item_id: item.id, direction, quantity: Number(qty || 0), damaged: direction === 'in' ? Number(damaged || 0) : 0 },
      })
      toast(`${formatNumber(m.quantity + m.damaged)} × ${m.item_name} recorded as ${direction === 'out' ? 'sent out' : direction === 'in' ? 'returned' : 'lost'}`)
      setItem(null)
      movements.reload()
      onRecorded?.()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const itemOptions = [{ value: '', label: 'Or pick an item by hand' }, ...(items || []).map((i) => ({ value: i.id, label: `${i.name} (${i.available} available)` }))]

  return (
    <div className="grid animate-page-in items-start gap-5 lg:grid-cols-2">
      <Card title="1. Event and direction">
        <div className="space-y-4">
          <EventSelect id="scan_event" value={bookingId} onChange={setBookingId} events={events} />
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Direction">
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={direction === d.id}
                onClick={() => setDirection(d.id)}
                className={`rounded-xl px-3 py-2.5 text-left ring-1 ring-inset transition-all ${
                  direction === d.id ? 'bg-brand-600 text-white ring-brand-600 shadow-sm' : 'bg-white text-ink-800 ring-ink-200 hover:ring-ink-300'
                }`}
              >
                <span className="block text-sm font-semibold">{d.label}</span>
                <span className={`block text-xs ${direction === d.id ? 'text-white/75' : 'text-ink-500'}`}>{d.hint}</span>
              </button>
            ))}
          </div>
          <div className="pt-1">
            <p className="mb-2 text-sm font-medium text-ink-700">2. Scan the label</p>
            <Scanner onCode={onCode} />
          </div>
          <SelectField id="manual_item" label="No label to hand?" options={itemOptions} value="" onChange={(e) => setItem(items.find((i) => i.id === e.target.value) || null)} />
        </div>
      </Card>

      <div className="space-y-5">
        <Card title="3. Quantity">
          {!item && <p className="py-6 text-center text-sm text-ink-500">Scan a label or pick an item to record it.</p>}
          {item && (
            <div className="animate-fade-in space-y-4">
              <div className="flex items-start justify-between gap-3 rounded-xl bg-ink-50 p-4">
                <div>
                  <p className="font-semibold text-ink-900">{item.name}</p>
                  <p className="text-sm text-ink-500">{CATEGORY_LABEL[item.category]}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="tabular font-semibold text-ink-900">{formatNumber(item.available)} available</p>
                  <p className="tabular text-ink-500">{formatNumber(item.out_now)} out</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="qty" label={direction === 'in' ? 'Good pieces back' : direction === 'lost' ? 'Pieces lost' : 'Pieces sent'} type="number" min="0" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
                {direction === 'in' && <Field id="damaged" label="Broken pieces back" type="number" min="0" inputMode="numeric" value={damaged} onChange={(e) => setDamaged(e.target.value)} hint="Broken pieces are written off stock." />}
              </div>
              <div className="flex gap-2">
                <Button onClick={record} loading={busy} disabled={!qty && !damaged}>
                  Record
                </Button>
                <Button variant="ghost" onClick={() => setItem(null)}>
                  Clear
                </Button>
              </div>
            </div>
          )}
          <div className="mt-3">
            <Alert key={error}>{error}</Alert>
          </div>
        </Card>

        {bookingId && (
          <Card title="Recorded for this event" bodyClassName="px-0 pb-2 pt-3">
            {movements.data?.length === 0 && <p className="px-6 py-4 text-sm text-ink-500">Nothing recorded yet.</p>}
            <ul className="divide-y divide-ink-100">
              {(movements.data || []).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-6 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium text-ink-900">{m.item_name}</span>
                    <span className="block text-xs text-ink-400">
                      {clockTime(m.created_at, company.timezone)}
                      {m.recorded_by_name && ` · ${m.recorded_by_name}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular font-semibold">{formatNumber(m.quantity)}</span>
                    <Badge tone={m.direction === 'out' ? 'brand' : m.direction === 'in' ? 'success' : 'danger'}>
                      {m.direction === 'out' ? 'Out' : m.direction === 'in' ? (m.damaged ? `In · +${m.damaged} broken` : 'In') : 'Lost'}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}

