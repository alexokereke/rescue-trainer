'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

const DEFAULT_BPM = 110

const PREFERRED_VOICES = [
  'samantha',
  'siri',
  'serena',
  'kate',
  'google us english',
  'microsoft aria',
  'microsoft jenny',
  'daniel',
  'alex',
]

const COACHING_CUES = [
  'Thirty compressions. Keep your shoulders directly over your hands.',
  'Sixty compressions. Keep your elbows straight and use your body weight.',
  'Ninety compressions. Push hard, then allow the chest to fully recoil.',
  'One hundred and twenty compressions. Stay centred and keep following the beat.',
  'Good rhythm. Press to about five centimetres, then release completely.',
  'Keep going. Straight arms, centred hands, steady rhythm.',
]

function choosePreferredVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  for (const preferredName of PREFERRED_VOICES) {
    const match = voices.find((voice) =>
      voice.name.toLowerCase().includes(preferredName),
    )

    if (match) return match
  }

  return (
    voices.find((voice) => voice.lang === 'en-GB') ||
    voices.find((voice) => voice.lang === 'en-US') ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ||
    voices[0]
  )
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function LiveTrainer() {
  const [running, setRunning] = useState(false)
  const [bpm, setBpm] = useState(DEFAULT_BPM)
  const [count, setCount] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [beatOn, setBeatOn] = useState(false)

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('')
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [voiceStatus, setVoiceStatus] = useState(
    'Press Test Voice or Start Trainer to activate the coach voice.',
  )

  const countRef = useRef(0)
  const elapsedRef = useRef(0)
  const startedAtRef = useRef<number | null>(null)

  const voiceEnabledRef = useRef(true)
  const soundEnabledRef = useRef(true)
  const selectedVoiceURIRef = useRef('')

  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled
  }, [voiceEnabled])

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  useEffect(() => {
    selectedVoiceURIRef.current = selectedVoiceURI
  }, [selectedVoiceURI])

  function getSpeechSynthesis() {
    if (typeof window === 'undefined') return null
    if (!('speechSynthesis' in window)) return null

    return window.speechSynthesis
  }

  function speak(text: string, interrupt = false) {
    const synth = getSpeechSynthesis()

    if (!synth) {
      setVoiceStatus('Speech synthesis is not supported in this browser.')
      return false
    }

    if (!voiceEnabledRef.current) {
      setVoiceStatus('Voice coaching is switched off.')
      return false
    }

    if (interrupt) {
      synth.cancel()
    } else if (synth.speaking || synth.pending) {
      // Do not stack coaching messages on top of each other.
      return false
    }

    const availableVoices = synth.getVoices()
    const selectedVoice =
      availableVoices.find(
        (voice) => voice.voiceURI === selectedVoiceURIRef.current,
      ) || choosePreferredVoice(availableVoices)

    const utterance = new SpeechSynthesisUtterance(text)

    if (selectedVoice) {
      utterance.voice = selectedVoice
      utterance.lang = selectedVoice.lang
    } else {
      utterance.lang = 'en-GB'
    }

    // Calm, clear, Siri-like delivery.
    utterance.rate = 1.0
    utterance.pitch = 1.02
    utterance.volume = 1

    utterance.onstart = () => {
      setVoiceStatus(
        `Speaking with ${selectedVoice?.name || 'the default browser voice'}.`,
      )
    }

    utterance.onend = () => {
      setVoiceStatus('Voice coach ready.')
    }

    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') {
        setVoiceStatus('Voice stopped.')
        return
      }

      setVoiceStatus(`Voice error: ${event.error}`)
      console.error('Speech synthesis error:', event.error)
    }

    // Chrome can occasionally become stuck in a paused state.
    synth.resume()
    synth.speak(utterance)

    return true
  }

  function stopVoice() {
    const synth = getSpeechSynthesis()
    if (!synth) return

    synth.cancel()
    setVoiceStatus('Voice stopped.')
  }

  function initialiseAudio() {
    if (typeof window === 'undefined') return null

    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext?: typeof AudioContext
          }
        ).webkitAudioContext

      if (!AudioContextClass) return null

      audioContextRef.current = new AudioContextClass()
    }

    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume()
    }

    return audioContextRef.current
  }

  function playBeat() {
    if (!soundEnabledRef.current) return

    const audioContext = initialiseAudio()
    if (!audioContext) return

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880

    const now = audioContext.currentTime

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)

    oscillator.start(now)
    oscillator.stop(now + 0.12)
  }

  // Load the voices installed on this device.
  useEffect(() => {
    const synth = getSpeechSynthesis()

    if (!synth) {
      setVoiceStatus('Speech synthesis is not supported in this browser.')
      return
    }

    let cancelled = false

    const updateVoices = () => {
      const loadedVoices = synth.getVoices()
      if (cancelled || loadedVoices.length === 0) return

      const sortedVoices = [...loadedVoices].sort((a, b) => {
        const aEnglish = a.lang.toLowerCase().startsWith('en') ? 0 : 1
        const bEnglish = b.lang.toLowerCase().startsWith('en') ? 0 : 1

        if (aEnglish !== bEnglish) return aEnglish - bEnglish
        return a.name.localeCompare(b.name)
      })

      setVoices(sortedVoices)

      setSelectedVoiceURI((currentVoiceURI) => {
        if (
          currentVoiceURI &&
          sortedVoices.some((voice) => voice.voiceURI === currentVoiceURI)
        ) {
          return currentVoiceURI
        }

        const savedVoiceURI =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('rescue-trainer-voice')
            : null

        const savedVoice = sortedVoices.find(
          (voice) => voice.voiceURI === savedVoiceURI,
        )

        return (
          savedVoice?.voiceURI ||
          choosePreferredVoice(sortedVoices)?.voiceURI ||
          ''
        )
      })
    }

    updateVoices()
    synth.addEventListener('voiceschanged', updateVoices)

    // Some browsers load voices slightly later.
    const retryTimer = window.setTimeout(updateVoices, 1000)

    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
      synth.removeEventListener('voiceschanged', updateVoices)
    }
  }, [])

  // Metronome and compression counter.
  useEffect(() => {
    if (!running) return

    const intervalMs = 60000 / bpm

    const timer = window.setInterval(() => {
      countRef.current += 1

      const newCount = countRef.current
      setCount(newCount)
      setBeatOn((current) => !current)
      playBeat()

      if (newCount % 30 === 0) {
        const cueIndex = Math.floor(newCount / 30 - 1) % COACHING_CUES.length
        speak(COACHING_CUES[cueIndex])
      }
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [running, bpm])

  // Session timer.
  useEffect(() => {
    if (!running) return

    startedAtRef.current = Date.now() - elapsedRef.current * 1000

    const timer = window.setInterval(() => {
      if (!startedAtRef.current) return

      const currentElapsed = Math.floor(
        (Date.now() - startedAtRef.current) / 1000,
      )

      elapsedRef.current = currentElapsed
      setElapsed(currentElapsed)
    }, 250)

    return () => window.clearInterval(timer)
  }, [running])

  // Stop speech and audio when leaving the page.
  useEffect(() => {
    return () => {
      const synth = getSpeechSynthesis()
      synth?.cancel()

      if (audioContextRef.current) {
        void audioContextRef.current.close()
      }
    }
  }, [])

  function startTrainer() {
    // Initialise audio and speech directly inside the click handler.
    initialiseAudio()

    setRunning(true)

    speak(
      'Starting live CPR trainer. Push hard and fast in the centre of the chest. Follow the beat, and allow full recoil after every compression.',
      true,
    )
  }

  function pauseTrainer() {
    setRunning(false)
    stopVoice()
    setVoiceStatus('Trainer paused. Voice stopped.')
  }

  function resetTrainer() {
    setRunning(false)
    stopVoice()

    countRef.current = 0
    elapsedRef.current = 0
    startedAtRef.current = null

    setCount(0)
    setElapsed(0)
    setBeatOn(false)
    setVoiceStatus('Trainer reset. Press Start Trainer when you are ready.')
  }

  function testVoice() {
    initialiseAudio()

    speak(
      'Hello. I am your Rescue Trainer coach. Push hard and fast in the centre of the chest, and follow the beat.',
      true,
    )
  }

  function changeVoice(voiceURI: string) {
    setSelectedVoiceURI(voiceURI)
    selectedVoiceURIRef.current = voiceURI

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('rescue-trainer-voice', voiceURI)
    }
  }

  const selectedVoice = voices.find(
    (voice) => voice.voiceURI === selectedVoiceURI,
  )

  const cycle = Math.floor(count / 30) + 1
  const cycleCount = count % 30

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>🎙️ Live CPR Trainer</h3>
          <p style={styles.description}>
            Follow the audible beat and Siri-like voice coach. Practise only on
            a mannequin or suitable training surface.
          </p>
        </div>

        <span style={running ? styles.statusRunning : styles.statusStopped}>
          {running ? 'Training live' : 'Stopped'}
        </span>
      </div>

      <div style={styles.layout}>
        <div style={styles.practicePanel}>
          <div
            style={{
              ...styles.pulseCircle,
              transform: beatOn ? 'scale(1.08)' : 'scale(1)',
              background: beatOn ? '#E63946' : '#087F6E',
            }}
          >
            <strong style={styles.pulseBpm}>{bpm}</strong>
            <span>BPM</span>
          </div>

          <div style={styles.statsGrid}>
            <div style={styles.stat}>
              <strong>{count}</strong>
              <span>Compressions</span>
            </div>

            <div style={styles.stat}>
              <strong>{formatTime(elapsed)}</strong>
              <span>Session time</span>
            </div>

            <div style={styles.stat}>
              <strong>{cycle}</strong>
              <span>Cycle</span>
            </div>

            <div style={styles.stat}>
              <strong>{cycleCount}/30</strong>
              <span>Cycle progress</span>
            </div>
          </div>

          <div style={styles.mainControls}>
            {!running ? (
              <button
                type="button"
                onClick={startTrainer}
                style={styles.startButton}
              >
                ▶ Start Trainer
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseTrainer}
                style={styles.pauseButton}
              >
                ⏸ Pause Trainer
              </button>
            )}

            <button
              type="button"
              onClick={resetTrainer}
              style={styles.secondaryButton}
            >
              Reset
            </button>
          </div>

          <div style={styles.bpmPanel}>
            <div style={styles.bpmHeader}>
              <strong>Compression speed</strong>
              <span>{bpm} BPM</span>
            </div>

            <input
              type="range"
              min="100"
              max="120"
              step="1"
              value={bpm}
              onChange={(event) => setBpm(Number(event.target.value))}
              style={styles.slider}
              aria-label="Compression speed in beats per minute"
            />

            <div style={styles.presetRow}>
              <button
                type="button"
                onClick={() => setBpm(100)}
                style={styles.presetButton}
              >
                100
              </button>

              <button
                type="button"
                onClick={() => setBpm(110)}
                style={styles.presetButton}
              >
                110
              </button>

              <button
                type="button"
                onClick={() => setBpm(120)}
                style={styles.presetButton}
              >
                120
              </button>
            </div>
          </div>
        </div>

        <div style={styles.voicePanel}>
          <h4 style={styles.panelTitle}>Siri-like voice coach</h4>

          <p style={styles.voiceStatus}>{voiceStatus}</p>

          <label style={styles.label}>
            Device voice
            <select
              value={selectedVoiceURI}
              onChange={(event) => changeVoice(event.target.value)}
              style={styles.select}
            >
              {voices.length === 0 ? (
                <option value="">Loading device voices…</option>
              ) : (
                voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} · {voice.lang}
                  </option>
                ))
              )}
            </select>
          </label>

          <p style={styles.smallText}>
            Selected:{' '}
            <strong>{selectedVoice?.name || 'Default browser voice'}</strong>
          </p>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(event) => {
                setVoiceEnabled(event.target.checked)
                voiceEnabledRef.current = event.target.checked

                if (!event.target.checked) stopVoice()
              }}
            />
            Enable voice coaching
          </label>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => {
                setSoundEnabled(event.target.checked)
                soundEnabledRef.current = event.target.checked
              }}
            />
            Enable metronome click
          </label>

          <div style={styles.voiceControls}>
            <button
              type="button"
              onClick={testVoice}
              style={styles.testButton}
            >
              🔊 Test Voice
            </button>

            <button
              type="button"
              onClick={stopVoice}
              style={styles.secondaryButton}
            >
              Stop Voice
            </button>
          </div>

          <div style={styles.instructions}>
            <strong>How to practise</strong>
            <ol style={styles.list}>
              <li>Place the heel of one hand in the centre of the chest.</li>
              <li>Put your other hand on top and straighten your elbows.</li>
              <li>Keep your shoulders directly above your hands.</li>
              <li>Press hard and fast, following the beat.</li>
              <li>Allow the chest to fully recoil after every press.</li>
            </ol>
          </div>

          <p style={styles.warning}>
            Training only. This web app is not a medical device. In a real
            emergency, call your local emergency number immediately.
          </p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  title: {
    margin: '4px 0 8px',
    fontSize: 24,
  },
  description: {
    margin: 0,
    color: '#668079',
    lineHeight: 1.7,
    maxWidth: 720,
  },
  statusRunning: {
    background: '#087F6E',
    color: '#fff',
    padding: '9px 13px',
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 13,
  },
  statusStopped: {
    background: '#E63946',
    color: '#fff',
    padding: '9px 13px',
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 13,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 18,
    alignItems: 'start',
  },
  practicePanel: {
    background: '#F4FAF8',
    border: '1px solid #DFF0EA',
    borderRadius: 26,
    padding: 22,
  },
  pulseCircle: {
    width: 150,
    height: 150,
    margin: '4px auto 20px',
    borderRadius: '50%',
    color: '#fff',
    display: 'grid',
    placeContent: 'center',
    textAlign: 'center',
    transition: 'transform 120ms ease, background 120ms ease',
    boxShadow: '0 18px 40px rgba(7,51,47,0.18)',
  },
  pulseBpm: {
    fontSize: 42,
    lineHeight: 1,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
    marginBottom: 18,
  },
  stat: {
    background: '#fff',
    border: '1px solid #DFF0EA',
    borderRadius: 18,
    padding: 15,
    display: 'grid',
    gap: 4,
    fontSize: 13,
    color: '#668079',
  },
  mainControls: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  startButton: {
    background: '#E63946',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    padding: '14px 20px',
    fontWeight: 900,
    cursor: 'pointer',
    flex: '1 1 180px',
  },
  pauseButton: {
    background: '#07332F',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    padding: '14px 20px',
    fontWeight: 900,
    cursor: 'pointer',
    flex: '1 1 180px',
  },
  secondaryButton: {
    background: '#fff',
    color: '#07332F',
    border: '1px solid #D7E8E2',
    borderRadius: 999,
    padding: '12px 16px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  bpmPanel: {
    background: '#fff',
    border: '1px solid #DFF0EA',
    borderRadius: 20,
    padding: 16,
  },
  bpmHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    accentColor: '#087F6E',
    cursor: 'pointer',
  },
  presetRow: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  presetButton: {
    background: '#F4FAF8',
    color: '#07332F',
    border: '1px solid #D7E8E2',
    borderRadius: 999,
    padding: '8px 13px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  voicePanel: {
    background: '#fff',
    border: '1px solid #DFF0EA',
    borderRadius: 26,
    padding: 22,
  },
  panelTitle: {
    margin: '0 0 12px',
    fontSize: 19,
  },
  voiceStatus: {
    background: '#FFF4D6',
    border: '1px solid #F2D98C',
    color: '#6B5200',
    borderRadius: 16,
    padding: 13,
    lineHeight: 1.6,
    fontWeight: 700,
    fontSize: 14,
  },
  label: {
    display: 'grid',
    gap: 8,
    fontWeight: 800,
    marginTop: 16,
    marginBottom: 10,
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px',
    borderRadius: 14,
    border: '1px solid #D7E8E2',
    background: '#F4FAF8',
    color: '#07332F',
    fontWeight: 700,
  },
  smallText: {
    color: '#668079',
    fontSize: 13,
    lineHeight: 1.6,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    fontWeight: 700,
    marginTop: 12,
    cursor: 'pointer',
  },
  voiceControls: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 16,
  },
  testButton: {
    background: '#087F6E',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    padding: '12px 16px',
    fontWeight: 900,
    cursor: 'pointer',
  },
  instructions: {
    marginTop: 20,
    background: '#F4FAF8',
    border: '1px solid #DFF0EA',
    borderRadius: 18,
    padding: 16,
  },
  list: {
    margin: '10px 0 0',
    paddingLeft: 20,
    color: '#47635E',
    lineHeight: 1.7,
  },
  warning: {
    margin: '16px 0 0',
    color: '#8A5A00',
    background: '#FFF8E6',
    border: '1px solid #F2D98C',
    borderRadius: 16,
    padding: 13,
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 700,
  },
}