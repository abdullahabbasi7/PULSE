import { useCallback, useEffect, useRef, useState } from 'react'

// Webcam access for QR scanning and face check-in.
// Browsers only allow the camera on https:// or http://localhost.
export function useCamera({ facingMode = 'user', width = 640, height = 480 } = {}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [state, setState] = useState('off') // off | starting | on | error
  const [error, setError] = useState('')

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setState('off')
  }, [])

  const start = useCallback(async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('error')
      setError(window.isSecureContext ? 'This browser cannot use a camera.' : 'The camera only works over https:// (or on localhost). Open PULSE through a secure address.')
      return
    }
    setState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: width }, height: { ideal: height } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setState('on')
    } catch (err) {
      setState('error')
      setError(err?.name === 'NotAllowedError' ? 'Camera permission was refused. Allow the camera in the browser bar and try again.' : 'Could not start the camera. Check that no other app is using it.')
    }
  }, [facingMode, width, height])

  useEffect(() => stop, [stop])

  // Current frame as a JPEG data URL (or ImageData for QR decoding).
  const capture = useCallback((quality = 0.85) => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', quality)
  }, [])

  return { videoRef, state, error, start, stop, capture }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
