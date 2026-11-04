'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

type Pt = { x: number; y: number; z?: number; visibility?: number }

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

// Pose landmark indexes
const L_SHOULDER = 11
const R_SHOULDER = 12
const L_ELBOW = 13
const R_ELBOW = 14
const L_WRIST = 15
const R_WRIST = 16

const ARM_LINES: Array<[number, number]> = [
  [L_SHOULDER, L_ELBOW],
  [L_ELBOW, L_WRIST],
  [R_SHOULDER, R_ELBOW],
  [R_ELBOW, R_WRIST],
  [L_SHOULDER, R_SHOULDER],
]

function distance(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function angle(a: Pt, b: Pt, c: Pt) {
  // angle at b, in degrees
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y)
  if (!mag) return 180
  return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function CameraTrainer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const lastVideoTimeRef = useRef(-1)
  const runningRef = useRef(false)

  // Smoothed camera crop, in source-video pixels
  const cropRef = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const handRef = useRef<Pt | null>(null)
  const metricRef = useRef<number | null>(null)
  const trailRef = useRef<Pt[]>([])

  const releaseRef = useRef<number | null>(null)
  const pressedRef = useRef<number | null>(null)
  const targetRef = useRef<Pt | null>(null)

  const phaseRef = useRef<'released' | 'pressed'>('released')
  const maxProgressRef = useRef(0)
  const lastPressAtRef = useRef(0)
  const intervalsRef = useRef<number[]>([])
  const lastUiUpdateRef = useRef(0)

  const [status, setStatus] = useState('Camera off')
  const [feedback, setFeedback] = useState('Start the camera, then calibrate Release and Pressed.')
  const [count, setCount] = useState(0)
  const countRef = useRef(0)
  const [bpm, setBpm] = useState(0)
  const [depthLabel, setDepthLabel] = useState('Not calibrated')
  const [elbowLabel, setElbowLabel] = useState('—')
  const [driftLabel, setDriftLabel] = useState('—')
  const [hasRelease, setHasRelease] = useState(false)
  const [hasPressed, setHasPressed] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)

  async function startCamera() {
    try {
      setStatus('Loading body tracker…')
      setFeedback('Loading the pose model. Keep the rescuer fully in view.')

      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL)
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })

      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()

      runningRef.current = true
      setCameraOn(true)
      setStatus('Camera on — tracking rescuer')
      setFeedback('Stand side-on to the camera. Calibrate Release first.')
      rafRef.current = requestAnimationFrame(loop)
    } catch (error) {
      console.error(error)
      setStatus('Camera could not start')
      setFeedback('Allow camera permission and use Chrome on localhost or your HTTPS Vercel site.')
    }
  }

  function stopCamera() {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
    setStatus('Camera off')
    setFeedback('Camera stopped.')
  }

  useEffect(() => {
    return () => {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      landmarkerRef.current?.close()
    }
  }, [])

  function captureRelease() {
    if (metricRef.current === null || !handRef.current) {
      setFeedback('No body tracked yet. Make sure your shoulders and hands are visible.')
      return
    }
    releaseRef.current = metricRef.current
    setHasRelease(true)
    phaseRef.current = 'released'
    maxProgressRef.current = 0
    setDepthLabel('Release saved — now calibrate Pressed')
    setFeedback('Release position saved. Now press fully down, hold still, and tap “Calibrate pressed”.')
  }

  function capturePressed() {
    if (metricRef.current === null || !handRef.current) {
      setFeedback('No body tracked yet. Make sure your shoulders and hands are visible.')
      return
    }
    if (releaseRef.current === null) {
      setFeedback('Calibrate the Release position first.')
      return
    }

    pressedRef.current = metricRef.current
    targetRef.current = handRef.current // exact hand position at bottom of the press
    setHasPressed(true)

    const travel = Math.abs(pressedRef.current - releaseRef.current)
    if (travel < 0.08) {
      setFeedback('That movement was too small to read. Use a side-on camera and make the press clearer.')
      setDepthLabel('Movement too small — recalibrate')
      return
    }

    phaseRef.current = 'released'
    maxProgressRef.current = 0
    setDepthLabel('Calibrated — ready')
    setFeedback('Calibration complete. Start compressions — I will count full down-and-up cycles only.')
  }

  function resetSession() {
    countRef.current = 0
    intervalsRef.current = []
    lastPressAtRef.current = 0
    trailRef.current = []
    phaseRef.current = 'released'
    maxProgressRef.current = 0
    setCount(0)
    setBpm(0)
    setFeedback('Session reset. Keep your hands on the red target point.')
  }

  function loop() {
    if (!runningRef.current) return
    rafRef.current = requestAnimationFrame(loop)

    const video = videoRef.current
    const canvas = canvasRef.current
    const landmarker = landmarkerRef.current
    if (!video || !canvas || !landmarker || video.readyState < 2) return
    if (video.currentTime === lastVideoTimeRef.current) return
    lastVideoTimeRef.current = video.currentTime

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return

    if (!cropRef.current.w) cropRef.current = { x: 0, y: 0, w: vw, h: vh }

    let result: any = null
    try {
      result = landmarker.detectForVideo(video, performance.now())
    } catch {
      return
    }

    const landmarks: Pt[] | undefined = result?.landmarks?.[0]

    // ---- CAMERA FOLLOW: choose the crop around shoulders + arms + hands ----
    let desired = { x: 0, y: 0, w: vw, h: vh }

    if (landmarks?.length) {
      const tracked = [L_SHOULDER, R_SHOULDER, L_ELBOW, R_ELBOW, L_WRIST, R_WRIST]
        .map((i) => landmarks[i])
        .filter(Boolean)

      if (tracked.length >= 4) {
        const cx = tracked.reduce((sum, p) => sum + p.x, 0) / tracked.length
        const cy = tracked.reduce((sum, p) => sum + p.y, 0) / tracked.length
        const shoulderWidth = Math.max(distance(landmarks[L_SHOULDER], landmarks[R_SHOULDER]), 0.05)

        const cropWNorm = clamp(shoulderWidth * 4.6, 0.48, 0.95)
        const cropWPx = cropWNorm * vw
        const cropHPx = (cropWPx * canvas.height) / canvas.width

        desired = {
          w: cropWPx,
          h: cropHPx,
          x: clamp(cx * vw - cropWPx / 2, 0, vw - cropWPx),
          y: clamp(cy * vh - cropHPx / 2, 0, vh - cropHPx),
        }
      }
    }

    // Smoothly follow instead of jumping
    const c = cropRef.current
    const follow = 0.07
    c.x += (desired.x - c.x) * follow
    c.y += (desired.y - c.y) * follow
    c.w += (desired.w - c.w) * follow
    c.h += (desired.h - c.h) * follow

    const toCanvas = (p: Pt) => ({
      x: ((p.x * vw - c.x) / c.w) * canvas.width,
      y: ((p.y * vh - c.y) / c.h) * canvas.height,
    })

    // ---- Draw followed camera view ----
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(video, c.x, c.y, c.w, c.h, 0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(3, 35, 32, 0.10)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (!landmarks?.length) {
      metricRef.current = null
      handRef.current = null
      if (performance.now() - lastUiUpdateRef.current > 250) {
        lastUiUpdateRef.current = performance.now()
        setFeedback('No rescuer found. Move back so your head, shoulders, arms and hands are visible.')
      }
      return
    }

    // ---- Read the movement ----
    const shoulderMid = midpoint(landmarks[L_SHOULDER], landmarks[R_SHOULDER])
    const wristMid = midpoint(landmarks[L_WRIST], landmarks[R_WRIST])
    const shoulderWidthPx = Math.max(
      Math.hypot(
        (landmarks[L_SHOULDER].x - landmarks[R_SHOULDER].x) * vw,
        (landmarks[L_SHOULDER].y - landmarks[R_SHOULDER].y) * vh,
      ),
      1,
    )

    // Smooth the hand point so the reading does not shake
    if (!handRef.current) {
      handRef.current = wristMid
    } else {
      handRef.current = {
        x: handRef.current.x + (wristMid.x - handRef.current.x) * 0.35,
        y: handRef.current.y + (wristMid.y - handRef.current.y) * 0.35,
      }
    }

    const hand = handRef.current

    // Main compression signal: hand height compared with the shoulders,
    // normalised by shoulder width so distance from camera matters less.
    const metric = (hand.y - shoulderMid.y) / (shoulderWidthPx / vw)
    metricRef.current = metric

    trailRef.current.push({ ...hand })
    if (trailRef.current.length > 45) trailRef.current.shift()

    const elbowAngle = Math.round(
      (angle(landmarks[L_SHOULDER], landmarks[L_ELBOW], landmarks[L_WRIST]) +
        angle(landmarks[R_SHOULDER], landmarks[R_ELBOW], landmarks[R_WRIST])) /
        2,
    )

    // Distance from hands to the calibrated exact target point
    let driftRatio: number | null = null
    if (targetRef.current) {
      const driftPx = Math.hypot((hand.x - targetRef.current.x) * vw, (hand.y - targetRef.current.y) * vh)
      driftRatio = driftPx / shoulderWidthPx
    }

    // ---- Count only a complete press-and-release cycle ----
    let progress: number | null = null
    let currentFeedback = ''

    if (releaseRef.current !== null && pressedRef.current !== null) {
      const range = pressedRef.current - releaseRef.current

      if (Math.abs(range) >= 0.08) {
        progress = clamp((metric - releaseRef.current) / range, -0.25, 1.3)
        maxProgressRef.current = Math.max(maxProgressRef.current, progress)

        if (phaseRef.current === 'released' && progress >= 0.75) {
          phaseRef.current = 'pressed'
        }

        if (phaseRef.current === 'pressed' && progress <= 0.25) {
          phaseRef.current = 'released'
          countRef.current += 1

          const now = performance.now()
          if (lastPressAtRef.current) {
            intervalsRef.current.push(now - lastPressAtRef.current)
            if (intervalsRef.current.length > 6) intervalsRef.current.shift()
            const average =
              intervalsRef.current.reduce((sum, value) => sum + value, 0) / intervalsRef.current.length
            setBpm(Math.round(60000 / average))
          }
          lastPressAtRef.current = now
          setCount(countRef.current)

          const depthRatio = maxProgressRef.current
          if (depthRatio < 0.8) setDepthLabel('Too shallow — press further')
          else if (depthRatio > 1.18) setDepthLabel('Deeper than calibration — ease off slightly')
          else setDepthLabel('Good depth range')
          maxProgressRef.current = 0
        }
      }
    }

    if (elbowAngle < 150) currentFeedback = 'Straighten your arms — lock your elbows and use your body weight.'
    else if (driftRatio !== null && driftRatio > 0.45)
      currentFeedback = 'Your hands are drifting — keep them on the centre target point.'
    else if (progress !== null && phaseRef.current === 'pressed' && progress < 0.75)
      currentFeedback = 'Press further down.'
    else if (progress !== null && phaseRef.current === 'pressed')
      currentFeedback = 'Good press — now release fully so the chest can recoil.'
    else if (releaseRef.current !== null && pressedRef.current !== null)
      currentFeedback = 'Good release. Keep the rhythm steady.'

    // ---- Draw target, trail, skeleton and hand point ----
    if (targetRef.current) {
      const target = toCanvas(targetRef.current)
      ctx.strokeStyle = '#E63946'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(target.x, target.y, 28, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(target.x - 38, target.y)
      ctx.lineTo(target.x + 38, target.y)
      ctx.moveTo(target.x, target.y - 38)
      ctx.lineTo(target.x, target.y + 38)
      ctx.stroke()
      ctx.fillStyle = '#E63946'
      ctx.font = 'bold 15px Arial'
      ctx.fillText('TARGET', target.x + 34, target.y - 12)
    }

    if (trailRef.current.length > 1) {
      ctx.strokeStyle = 'rgba(8,127,110,0.75)'
      ctx.lineWidth = 3
      ctx.beginPath()
      trailRef.current.forEach((point, index) => {
        const p = toCanvas(point)
        if (index === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      })
      ctx.stroke()
    }

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ARM_LINES.forEach(([a, b]) => {
      const p1 = toCanvas(landmarks[a])
      const p2 = toCanvas(landmarks[b])
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    })

    const handCanvas = toCanvas(hand)
    ctx.fillStyle = elbowAngle >= 150 ? '#087F6E' : '#E63946'
    ctx.beginPath()
    ctx.arc(handCanvas.x, handCanvas.y, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.stroke()

    // Update the side panel about 10 times per second
    if (performance.now() - lastUiUpdateRef.current > 100) {
      lastUiUpdateRef.current = performance.now()
      setElbowLabel(`${elbowAngle}° ${elbowAngle >= 150 ? '· straight' : '· bent'}`)
      setDriftLabel(
        driftRatio === null ? 'Calibrate Pressed first' : driftRatio <= 0.45 ? 'Centred' : 'Drifting',
      )
      if (currentFeedback) setFeedback(currentFeedback)
      if (releaseRef.current !== null && pressedRef.current === null) {
        setDepthLabel('Release saved — calibrate Pressed next')
      }
    }
  }

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h3 style={styles.title}>📷 Camera CPR Coach</h3>
          <p style={styles.text}>
            Place the phone side-on. The rescuer’s shoulders, straight arms and hands must stay visible.
            The camera will zoom and follow them automatically.
          </p>
        </div>
        <span style={cameraOn ? styles.statusOn : styles.statusOff}>{status}</span>
      </div>

      <div style={styles.layout}>
        <div style={styles.stage}>
          <video ref={videoRef} autoPlay playsInline muted style={styles.hiddenVideo} />
          <canvas ref={canvasRef} width={960} height={540} style={styles.canvas} />
          {!cameraOn && (
            <div style={styles.overlay}>
              <strong>Camera is off</strong>
              <span>Start the camera and stand side-on so your arms and hands can be tracked.</span>
            </div>
          )}
        </div>

        <div style={styles.panel}>
          <div style={styles.metricGrid}>
            <div style={styles.metric}>
              <strong>{count}</strong>
              <span>Compressions</span>
            </div>
            <div style={styles.metric}>
              <strong>{bpm || '—'}</strong>
              <span>BPM</span>
            </div>
          </div>

          <div style={styles.reading}>
            <span>Depth</span>
            <strong>{depthLabel}</strong>
          </div>
          <div style={styles.reading}>
            <span>Elbows</span>
            <strong>{elbowLabel}</strong>
          </div>
          <div style={styles.reading}>
            <span>Hand position</span>
            <strong>{driftLabel}</strong>
          </div>

          <div style={styles.feedback}>{feedback}</div>

          {!cameraOn ? (
            <button type="button" onClick={startCamera} style={styles.primaryButton}>
              Start camera tracking
            </button>
          ) : (
            <button type="button" onClick={stopCamera} style={styles.secondaryButton}>
              Stop camera
            </button>
          )}

          <button type="button" onClick={captureRelease} style={styles.secondaryButton} disabled={!cameraOn}>
            1 · Calibrate release position
          </button>
          <button type="button" onClick={capturePressed} style={styles.secondaryButton} disabled={!cameraOn || !hasRelease}>
            2 · Calibrate pressed position
          </button>
          <button type="button" onClick={resetSession} style={styles.secondaryButton} disabled={!cameraOn}>
            Reset count
          </button>

          <p style={styles.small}>
            Calibration: hold your hands at the top/released position and tap 1. Then press fully down,
            hold still, and tap 2. That bottom hand position becomes the red target.
            {hasRelease ? ' Release saved. ' : ''}
            {hasPressed ? 'Pressed position saved.' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  title: { margin: '4px 0 8px', fontSize: 22 },
  text: { margin: 0, color: '#668079', lineHeight: 1.7, maxWidth: 720 },
  statusOn: {
    background: '#087F6E',
    color: '#fff',
    padding: '9px 12px',
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 13,
  },
  statusOff: {
    background: '#E63946',
    color: '#fff',
    padding: '9px 12px',
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 13,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 18,
    alignItems: 'start',
  },
  stage: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    background: '#07332F',
    minHeight: 260,
  },
  hiddenVideo: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: 'none',
  },
  canvas: { width: '100%', display: 'block', aspectRatio: '16 / 9' },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeContent: 'center',
    gap: 8,
    textAlign: 'center',
    color: '#fff',
    padding: 24,
    background: 'rgba(7,51,47,0.72)',
  },
  panel: { display: 'grid', gap: 10 },
  metricGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  metric: {
    background: '#F4FAF8',
    border: '1px solid #DFF0EA',
    borderRadius: 18,
    padding: 16,
    display: 'grid',
    gap: 4,
    fontSize: 13,
    color: '#668079',
  },
  reading: {
    background: '#fff',
    border: '1px solid #DFF0EA',
    borderRadius: 16,
    padding: '12px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    fontSize: 14,
  },
  feedback: {
    background: '#FFF4D6',
    border: '1px solid #F2D98C',
    color: '#6B5200',
    borderRadius: 16,
    padding: 14,
    lineHeight: 1.6,
    fontWeight: 700,
  },
  primaryButton: {
    background: '#E63946',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    padding: '13px 18px',
    fontWeight: 900,
    cursor: 'pointer',
  },
  secondaryButton: {
    background: '#F4FAF8',
    color: '#07332F',
    border: '1px solid #D7E8E2',
    borderRadius: 999,
    padding: '11px 16px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  small: { margin: 0, color: '#7A8F8A', fontSize: 13, lineHeight: 1.6 },
}