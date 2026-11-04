'use client'
import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

function ChestModel({ depthRef }: { depthRef: React.MutableRefObject<number> }) {
  const chest = useRef<THREE.Group>(null!)
  const hands = useRef<THREE.Group>(null!)
  useFrame((_, d) => {
    const depth = depthRef.current
    if (chest.current) chest.current.scale.y = THREE.MathUtils.damp(chest.current.scale.y, 1 - depth * 0.28, 18, d)
    if (hands.current) hands.current.position.y = THREE.MathUtils.damp(hands.current.position.y, 1.05 - depth * 0.38, 18, d)
  })
  return (
    <group position={[0, -0.4, 0]}>
      <mesh position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#e7e0d3" /></mesh>
      <RoundedBox args={[3.4, 1.1, 4.2]} radius={0.45} position={[0, 0, 0]}><meshStandardMaterial color="#e8b08e" roughness={0.6} /></RoundedBox>
      <group ref={chest}><mesh position={[0, 0.58, 0.3]}><cylinderGeometry args={[0.5, 0.5, 0.1, 32]} /><meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.7} /></mesh></group>
      <mesh position={[0, 0.35, 2.6]}><sphereGeometry args={[0.55, 32, 32]} /><meshStandardMaterial color="#e8b08e" /></mesh>
      <group ref={hands} position={[0, 1.05, 0.3]}>
        <RoundedBox args={[0.9, 0.25, 1.1]} radius={0.1}><meshStandardMaterial color="#d99a6c" /></RoundedBox>
        <RoundedBox args={[0.85, 0.22, 1]} radius={0.1} position={[0, 0.22, 0]}><meshStandardMaterial color="#c98a5b" /></RoundedBox>
      </group>
      <mesh position={[-0.8, 1.4, 0.3]} rotation={[0, 0, 0.5]}><cylinderGeometry args={[0.16, 0.16, 1.6, 16]} /><meshStandardMaterial color="#2563eb" /></mesh>
      <mesh position={[0.8, 1.4, 0.3]} rotation={[0, 0, -0.5]}><cylinderGeometry args={[0.16, 0.16, 1.6, 16]} /><meshStandardMaterial color="#2563eb" /></mesh>
    </group>
  )
}

export default function CameraTrainer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const depthRef = useRef(0)
  const baseline = useRef<number | null>(null)
  const phase = useRef<'up' | 'down'>('up')
  const lastSpeak = useRef(0)
  const times = useRef<number[]>([])
  const started = useRef(false)

  const [status, setStatus] = useState('Camera off')
  const [count, setCount] = useState(0)
  const [bpm, setBpm] = useState(0)
  const [feedback, setFeedback] = useState('Enable camera. Put both hands in the circle and press up and down like CPR.')

  function say(text: string, force = false) {
    const now = Date.now()
    if (!force && now - lastSpeak.current < 4000) return
    lastSpeak.current = now
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; window.speechSynthesis.speak(u)
    }
  }

  async function start() {
    if (started.current) return
    started.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setStatus('● LIVE TRACKING')
      setFeedback('Hands detected mode on. Press down in the circle — watch the 3D chest move with you.')
      say('Camera on. Place your hands in the centre of the chest. Push hard and fast. Follow my voice.', true)

      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm')
      const pose = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', delegate: 'GPU' },
        runningMode: 'VIDEO', numPoses: 1
      })

      let last = -1
      const loop = () => {
        const v = videoRef.current; if (!v) return
        if (v.currentTime !== last) {
          last = v.currentTime
          const lm = pose.detectForVideo(v, performance.now()).landmarks?.[0]
          if (lm) {
            const y = (lm[15].y + lm[16].y) / 2
            const x = (lm[15].x + lm[16].x) / 2
            if (baseline.current === null) baseline.current = y
            const depth = Math.max(0, Math.min(1, (y - (baseline.current - 0.015)) / 0.07))
            depthRef.current = depth
            if (phase.current === 'up' && depth < 0.3) baseline.current = baseline.current * 0.95 + y * 0.05

            if (depth > 0.65 && phase.current === 'up') phase.current = 'down'
            if (depth < 0.2 && phase.current === 'down') {
              phase.current = 'up'
              setCount(c => c + 1)
              times.current = [...times.current.slice(-5), Date.now()]
              if (times.current.length > 1) {
                const diffs = times.current.slice(1).map((t, i) => t - times.current[i])
                const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
                const rate = Math.round(60000 / avg); setBpm(rate)
                if (rate < 100) { setFeedback(`Good compression. A bit faster — aim 100 to 120 per minute. Now ${rate}.`); say('A little faster') }
                else if (rate > 120) { setFeedback(`Good. Slow down slightly — now ${rate} per minute.`); say('Slow down slightly') }
                else { setFeedback(`Perfect rhythm — ${rate} per minute. Keep going, allow full recoil.`); say('Perfect rhythm. Keep going') }
              } else {
                setFeedback('Good first compression. Keep pressing hard and fast.'); say('Good. Keep going')
              }
            }
            if (x < 0.32 || x > 0.68) { setFeedback('Move your hands to the centre of the chest.'); say('Centre your hands') }
          } else {
            depthRef.current = 0
            setFeedback('Show your upper body and both hands to the camera.')
          }
        }
        requestAnimationFrame(loop)
      }
      loop()
    } catch {
      started.current = false
      setStatus('Camera blocked')
      setFeedback('Allow camera access in Chrome, or use the 3D Trainer to practise the rhythm.')
    }
  }

  return (
    <div>
      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#111', aspectRatio: '4/3' }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        <div style={{ position: 'absolute', top: 12, left: 12, background: '#dc2626', color: '#fff', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>{status}</div>
        <div style={{ position: 'absolute', bottom: 12, right: 12, background: '#fff', padding: '10px 14px', borderRadius: 14, fontWeight: 900 }}>{count} compressions {bpm > 0 && `• ${bpm} BPM`}</div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 160, height: 160, transform: 'translate(-50%,-50%)', border: '3px dashed rgba(255,255,255,.95)', borderRadius: '50%' }} />
      </div>

      <p style={{ fontWeight: 800, margin: '16px 0 8px' }}>👇 Your hands control this 3D chest live:</p>
      <div style={{ height: 320, background: '#f4f1ea', borderRadius: 20, overflow: 'hidden', border: '1px solid #ddd' }}>
        <Canvas camera={{ position: [3, 2.8, 5], fov: 45 }}>
          <ambientLight intensity={1.4} /><directionalLight position={[4, 6, 4]} intensity={1.6} />
          <ChestModel depthRef={depthRef} /><OrbitControls enableZoom={false} />
        </Canvas>
      </div>

      <button onClick={start} style={{ width: '100%', marginTop: 14, padding: 16, borderRadius: 14, background: '#2563eb', color: '#fff', fontWeight: 800, border: 0, cursor: 'pointer' }}>Enable Camera Scan + Live 3D + Voice Coach</button>
      <p style={{ fontWeight: 700 }}>{feedback}</p>
      <p style={{ color: '#666', fontSize: 13 }}>Privacy: video is processed on this device only. Nothing is uploaded.</p>
    </div>
  )
}