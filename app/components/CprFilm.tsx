'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, useInView } from 'framer-motion'

const frames = [
  '/cpr/frame-1.png',
  '/cpr/frame-2.png',
  '/cpr/frame-3.png',
  '/cpr/frame-4.png',
]

// down, deeper, release, back up
const sequence = [0, 1, 2, 3, 2, 1]

export default function CprFilm() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.35 })

  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [bpm, setBpm] = useState(70) // slower teaching speed by default

  useEffect(() => {
    if (!inView || !playing) return

    // One full compression cycle is split into 6 film steps
    const intervalMs = 60000 / bpm / sequence.length

    const id = setInterval(() => {
      setStep((s) => (s + 1) % sequence.length)
    }, intervalMs)

    return () => clearInterval(id)
  }, [inView, playing, bpm])

  const currentFrame = sequence[step]

  return (
    <div ref={ref} style={styles.wrap}>
      <motion.div
        animate={inView && playing ? { scale: [1, 1.02, 1], x: [0, -4, 0] } : { scale: 1, x: 0 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={styles.film}
      >
        {frames.map((src, i) => (
          <img
            key={src}
            src={src}
            alt="CPR chest compression demonstration"
            style={{
              ...styles.image,
              opacity: currentFrame === i ? 1 : 0,
            }}
          />
        ))}
      </motion.div>

      <div style={styles.badge}>🎬 CPR in motion · {bpm} BPM</div>

      <div style={styles.controls}>
        <button type="button" onClick={() => setPlaying((p) => !p)} style={styles.mainButton}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>

        <button type="button" onClick={() => setBpm(60)} style={styles.smallButton}>
          Slow 60
        </button>

        <button type="button" onClick={() => setBpm(80)} style={styles.smallButton}>
          Medium 80
        </button>

        <button type="button" onClick={() => setBpm(110)} style={styles.smallButton}>
          CPR 110
        </button>

        <label style={styles.sliderLabel}>
          Speed: {bpm} BPM
          <input
            type="range"
            min="50"
            max="110"
            step="5"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            style={styles.slider}
          />
        </label>
      </div>

      <div style={styles.caption}>
        Push hard and fast in the centre of the chest. Training demo only — use Slow mode to study the movement.
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    position: 'relative',
    borderRadius: 30,
    overflow: 'hidden',
    background: '#EDEEF0',
    border: '1px solid #DFF0EA',
    boxShadow: '0 24px 60px rgba(7,51,47,0.14)',
  },
  film: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    transition: 'opacity 180ms ease-in-out',
  },
  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    background: 'rgba(7,51,47,0.88)',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 800,
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    padding: '14px',
    background: '#fff',
  },
  mainButton: {
    background: '#E63946',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    padding: '10px 16px',
    fontWeight: 900,
    cursor: 'pointer',
  },
  smallButton: {
    background: '#F4FAF8',
    color: '#07332F',
    border: '1px solid #D7E8E2',
    borderRadius: 999,
    padding: '9px 12px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  sliderLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
    fontWeight: 800,
    color: '#07332F',
    marginLeft: 'auto',
  },
  slider: {
    width: 150,
    accentColor: '#087F6E',
    cursor: 'pointer',
  },
  caption: {
    background: 'rgba(255,255,255,0.92)',
    padding: '0 14px 14px',
    fontSize: 13,
    fontWeight: 700,
    color: '#07332F',
  },
}