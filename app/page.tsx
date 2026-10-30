"use client";

import { useState, useEffect, useRef } from "react";
import { PROTOCOL, getNextStep, Intent } from "./lib/protocol";
import { Metronome } from "./lib/metronome";

export default function Home() {
  const [currentId, setCurrentId] = useState("welcome");
  const [seconds, setSeconds] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const metronomeRef = useRef<Metronome | null>(null);

  const step = PROTOCOL[currentId];

  if (!metronomeRef.current) {
    metronomeRef.current = new Metronome();
  }

  // Speak the prompt + control metronome when step changes
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(step.prompt);
      speech.rate = 0.95;
      speech.pitch = 1;
      window.speechSynthesis.speak(speech);
    }

    if (currentId === "compressions") {
      metronomeRef.current?.start(110);
      setSeconds(0);
    } else {
      metronomeRef.current?.stop();
    }
  }, [currentId, step.prompt]);

  // Timer during compressions
  useEffect(() => {
    if (currentId !== "compressions") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [currentId]);

  // Cleanup on close
  useEffect(() => {
    return () => metronomeRef.current?.stop();
  }, []);

  function speakAgain() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(step.prompt);
      speech.rate = 0.95;
      window.speechSynthesis.speak(speech);
    }
  }

  function parseIntent(text: string): Intent {
    const t = text.toLowerCase();
    if (t.includes("repeat")) return "REPEAT";
    if (t.includes("stop") || t.includes("end") || t.includes("reset")) return "STOP";
    if (t.includes("no") || t.includes("not") || t.includes("unresponsive")) return "NEGATIVE";
    if (t.includes("yes") || t.includes("safe") || t.includes("done") || t.includes("start") || t.includes("calling")) return "AFFIRMATIVE";
    return "UNKNOWN";
  }

  function startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice not supported in this browser. Use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setLastHeard(transcript);
      const intent = parseIntent(transcript);
      if (intent !== "UNKNOWN") {
        handleIntent(intent);
      }
    };

    recognition.start();
  }

  function handleIntent(intent: Intent) {
    if (intent === "REPEAT") {
      speakAgain();
      return;
    }
    if (intent === "STOP") {
      metronomeRef.current?.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setCurrentId("welcome");
      return;
    }
    const nextId = getNextStep(currentId, intent);
    setCurrentId(nextId);
  }

  const compressionCount = Math.floor((seconds * 110) / 60);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-between p-6">
      <header className="w-full max-w-md text-center pt-4">
        <h1 className="text-3xl font-bold text-red-500">RESCUE Trainer</h1>
        <p className="text-xs text-zinc-400 mt-2">
          Training prototype for a mannequin only. Not a medical device.
          In a real emergency call 911 and follow dispatcher instructions.
        </p>
      </header>

      <section className="w-full max-w-md flex-1 flex flex-col items-center justify-center text-center gap-6">
        <h2 className="text-2xl font-semibold">{step.title}</h2>
        <p className="text-xl leading-relaxed">{step.instruction}</p>
        <p className="text-sm text-zinc-400 italic">"{step.prompt}"</p>

        {currentId === "compressions" && (
          <div className="bg-zinc-900 rounded-2xl p-6 w-full">
            <div className="text-5xl font-bold">{compressionCount}</div>
            <div className="text-zinc-400">approx. compressions</div>
            <div className="text-lg mt-2">{seconds}s • 110 BPM</div>
            <div className="mt-3 animate-pulse text-red-400 font-bold">● FOLLOW THE BEAT ●</div>
          </div>
        )}
      </section>

      <section className="w-full max-w-md flex flex-col gap-3 pb-6">
        {currentId === "welcome" && (
          <button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-red-600 py-4 rounded-xl text-lg font-bold">
            Start Training
          </button>
        )}

        {currentId === "scene" && (
          <>
            <button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-green-600 py-4 rounded-xl text-lg font-bold">Yes, It's Safe</button>
            <button onClick={() => handleIntent("NEGATIVE")} className="bg-zinc-700 py-4 rounded-xl text-lg">No, Not Safe</button>
          </>
        )}

        {currentId === "responsiveness" && (
          <>
            <button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-green-600 py-4 rounded-xl text-lg font-bold">Yes, Responsive</button>
            <button onClick={() => handleIntent("NEGATIVE")} className="bg-zinc-700 py-4 rounded-xl text-lg font-bold">No Response</button>
          </>
        )}

        {currentId === "call" && (
          <button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-red-600 py-4 rounded-xl text-lg font-bold">Done - Calling 911</button>
        )}

        {currentId === "breathing" && (
          <>
            <button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-green-600 py-4 rounded-xl text-lg font-bold">Yes, Breathing Normally</button>
            <button onClick={() => handleIntent("NEGATIVE")} className="bg-red-600 py-4 rounded-xl text-lg font-bold">No, Not Breathing Normally</button>
          </>
        )}

        {currentId === "handPlacement" && (
          <button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-red-600 py-4 rounded-xl text-lg font-bold">Start Compressions</button>
        )}

        {currentId === "compressions" && (
          <button onClick={() => handleIntent("STOP")} className="bg-zinc-700 py-4 rounded-xl text-lg font-bold">Stop Compressions</button>
        )}

        {currentId === "monitor" && (
          <button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-blue-600 py-4 rounded-xl text-lg font-bold">Repeat Breathing Check</button>
        )}

        <button
          onClick={startListening}
          className={`py-4 rounded-xl text-lg font-bold ${isListening ? "bg-yellow-500 text-black" : "bg-blue-600"}`}
        >
          {isListening ? "🎤 Listening... Say Yes / No / Repeat" : "🎤 Tap & Speak"}
        </button>

        {lastHeard && (
          <p className="text-center text-sm text-zinc-400">You said: &quot;{lastHeard}&quot;</p>
        )}

        <div className="flex gap-3">
          <button onClick={() => handleIntent("REPEAT")} className="flex-1 bg-zinc-800 py-3 rounded-xl">🔊 Repeat That</button>
          <button onClick={() => handleIntent("STOP")} className="flex-1 bg-zinc-800 py-3 rounded-xl">End / Reset</button>
        </div>
      </section>
    </main>
  );
}