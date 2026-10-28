import { useState } from 'react'
import { Alert, Avatar, Button, Card } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { api, errorText } from '../../lib/api.js'
import { percent } from '../../lib/format.js'
import { sleep, useCamera } from '../../lib/useCamera.js'

// Shrinks a data URL frame so uploads stay small.
export function grab(video, maxWidth = 640, quality = 0.85) {
  if (!video?.videoWidth) return null
  const scale = Math.min(1, maxWidth / video.videoWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

const PROMPTS = {
  ready: 'Look straight at the camera',
  look: 'Hold still…',
  turn: 'Now turn your head slowly to one side',
  back: 'And back to the camera',
  checking: 'Checking…',
}

export function Kiosk() {
  const camera = useCamera({ facingMode: 'user' })
  const [kind, setKind] = useState('in')
  const [phase, setPhase] = useState('ready')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const running = !['ready'].includes(phase)

  async function run() {
    setResult(null)
    setError('')
    const video = camera.videoRef.current
    const frames = []
    try {
      setPhase('look')
      await sleep(700)
      frames.push(grab(video))
      setPhase('turn')
      await sleep(350)
      for (let i = 0; i < 9; i += 1) {
        await sleep(230)
        frames.push(grab(video))
      }
      setPhase('back')
      await sleep(600)
      frames.push(grab(video))
      setPhase('checking')
      const res = await api('/attendance/check', { method: 'POST', body: { kind, frames: frames.filter(Boolean) } })
      setResult(res)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setPhase('ready')
    }
  }

  const on = camera.state === 'on'
  return (
    <div className="grid animate-page-in items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card bodyClassName="p-3 sm:p-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-900">
          <video ref={camera.videoRef} playsInline muted className={`h-full w-full -scale-x-100 object-cover ${on ? '' : 'opacity-0'}`} />
          {on && (
            <>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`aspect-[3/4] h-[72%] rounded-[50%] border-[3px] transition-colors duration-300 ${
                    phase === 'turn' ? 'border-saffron-300' : phase === 'checking' ? 'border-brand-300' : 'border-white/80'
                  } shadow-[0_0_0_9999px_rgba(23,28,52,0.45)]`}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/80 to-transparent px-5 pb-5 pt-10 text-center">
                <p key={phase} className="animate-fade-in text-lg font-semibold text-white">
                  {PROMPTS[phase]}
                </p>
                {phase === 'turn' && (
                  <p className="mt-1 flex items-center justify-center gap-2 text-sm text-white/75">
                    <Icon name="arrowLeft" className="h-4 w-4 animate-pulse" /> left or right
                  </p>
                )}
              </div>
            </>
          )}
          {!on && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
              <Icon name="camera" className="h-10 w-10 text-white/70" />
              <p className="max-w-xs text-sm text-white/80">Staff check in and out here by face. A quick head turn proves it is a real person, not a photo.</p>
              <Button onClick={camera.start} loading={camera.state === 'starting'} className="!bg-white !text-ink-900 hover:!bg-brand-50">
                Start camera
              </Button>
            </div>
          )}
        </div>
        {camera.error && (
          <div className="mt-3">
            <Alert tone="warning">{camera.error}</Alert>
          </div>
        )}
      </Card>

      <div className="space-y-5">
        <Card title="Mark attendance">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Check in or out">
            {[
              ['in', 'Check in'],
              ['out', 'Check out'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={kind === id}
                onClick={() => setKind(id)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 ring-inset transition-all ${
                  kind === id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-800 ring-ink-200 hover:ring-ink-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="lg" className="mt-4 w-full" onClick={run} disabled={!on || running} loading={running}>
            <Icon name="camera" className="h-5 w-5" />
            {running ? PROMPTS[phase] : kind === 'in' ? 'Check in by face' : 'Check out by face'}
          </Button>
          <div className="mt-3">
            <Alert key={error}>{error}</Alert>
          </div>
        </Card>

        {result && (
          <div
            className={`animate-pop-in rounded-panel p-5 ring-1 ring-inset ${
              result.ok ? 'bg-kashi-50 ring-kashi-200' : result.liveness_passed ? 'bg-saffron-50 ring-saffron-200' : 'bg-red-50 ring-red-200'
            }`}
            role="status"
          >
            <div className="flex items-center gap-3">
              {result.staff ? (
                <Avatar name={result.staff.full_name} size="lg" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-600">
                  <Icon name="alert" />
                </span>
              )}
              <div className="min-w-0">
                <p className={`text-lg font-semibold ${result.ok ? 'text-kashi-900' : 'text-ink-900'}`}>{result.ok ? (result.kind === 'in' ? 'Welcome!' : 'See you next time') : 'Not marked'}</p>
                <p className="text-sm text-ink-700">{result.message}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/70 px-3 py-2">
                <dt className="text-xs text-ink-500">Liveness (head turn)</dt>
                <dd className={`font-semibold ${result.liveness_passed ? 'text-kashi-700' : 'text-red-700'}`}>
                  {result.liveness_passed ? 'Passed' : 'Failed'} · {result.liveness_score.toFixed(2)}
                </dd>
              </div>
              <div className="rounded-xl bg-white/70 px-3 py-2">
                <dt className="text-xs text-ink-500">Face match</dt>
                <dd className="font-semibold text-ink-900">{result.match_score ? percent(result.match_score) : '—'}</dd>
              </div>
            </dl>
          </div>
        )}
        <p className="text-xs leading-relaxed text-ink-400">
          Only a numeric face signature is stored, never the photo, and only for staff who gave consent. The camera needs a secure (https) connection.
        </p>
      </div>
    </div>
  )
}
