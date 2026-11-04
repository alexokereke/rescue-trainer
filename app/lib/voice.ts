let cachedVoices: SpeechSynthesisVoice[] = []

function chooseSiriLikeVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (!voices.length) return null

  const priorities = [
    (voice: SpeechSynthesisVoice) =>
      voice.name.toLowerCase().includes('samantha'),

    (voice: SpeechSynthesisVoice) =>
      voice.name.toLowerCase().includes('siri'),

    (voice: SpeechSynthesisVoice) =>
      voice.name.toLowerCase().includes('google us english'),

    (voice: SpeechSynthesisVoice) =>
      voice.name.toLowerCase().includes('aria'),

    (voice: SpeechSynthesisVoice) =>
      voice.name.toLowerCase().includes('jenny'),

    (voice: SpeechSynthesisVoice) =>
      voice.lang === 'en-US' && voice.localService,

    (voice: SpeechSynthesisVoice) =>
      voice.lang === 'en-US',

    (voice: SpeechSynthesisVoice) =>
      voice.lang.startsWith('en'),
  ]

  for (const test of priorities) {
    const match = voices.find(test)
    if (match) return match
  }

  return voices[0]
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([])
  }

  const existing = window.speechSynthesis.getVoices()
  if (existing.length) {
    cachedVoices = existing
    return Promise.resolve(existing)
  }

  return new Promise((resolve) => {
    let finished = false

    const finish = () => {
      if (finished) return
      finished = true

      const voices = window.speechSynthesis.getVoices()
      cachedVoices = voices
      resolve(voices)
    }

    window.speechSynthesis.onvoiceschanged = finish

    // Fallback if voiceschanged does not fire
    window.setTimeout(finish, 1000)
  })
}

export async function speakCoach(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis is not supported in this browser.')
    return false
  }

  const synth = window.speechSynthesis
  const voices = cachedVoices.length ? cachedVoices : await loadVoices()
  const voice = chooseSiriLikeVoice(voices)

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice?.lang || 'en-US'

  // Calm, clear, Siri-like delivery
  utterance.rate = 1.0
  utterance.pitch = 1.02
  utterance.volume = 1

  utterance.onerror = (event) => {
    console.error('Speech error:', event.error)
  }

  // Stop any previous instruction before speaking the new one
  synth.cancel()
  synth.speak(utterance)

  return true
}

export function stopCoachVoice() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

export async function getCurrentVoiceName(): Promise<string> {
  const voices = cachedVoices.length ? cachedVoices : await loadVoices()
  return chooseSiriLikeVoice(voices)?.name || 'Default browser voice'
}