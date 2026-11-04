"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { PROTOCOL, getNextStep, Intent } from "./lib/protocol";
import { Metronome } from "./lib/metronome";

const Chest3D = dynamic(() => import("./components/Chest3D"), { ssr: false });
const CameraTrainer = dynamic(() => import("./components/CameraTrainer"), { ssr: false });

const STEPS = ["welcome", "scene", "responsiveness", "call", "breathing", "handPlacement", "compressions", "monitor"];

export default function Home() {
  const [tab, setTab] = useState<"coach" | "3d" | "camera">("coach");
  const [currentId, setCurrentId] = useState("welcome");
  const [seconds, setSeconds] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const [aiSource, setAiSource] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const metronomeRef = useRef<Metronome | null>(null);

  const step = PROTOCOL[currentId];
  const stepIndex = Math.max(0, STEPS.indexOf(currentId));
  if (!metronomeRef.current) metronomeRef.current = new Metronome();

  useEffect(() => {
    if (tab !== "coach") {
      metronomeRef.current?.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(step.prompt);
      speech.rate = 0.95;
      window.speechSynthesis.speak(speech);
    }
    if (currentId === "compressions") {
      metronomeRef.current?.start(110);
      setSeconds(0);
    } else {
      metronomeRef.current?.stop();
    }
  }, [currentId, step.prompt, tab]);

  useEffect(() => {
    if (currentId !== "compressions" || tab !== "coach") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [currentId, tab]);

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

  async function getIntentFromAI(transcript: string): Promise<Intent> {
    const local = parseIntent(transcript);
    try {
      setIsThinking(true);
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript, currentStep: currentId }),
      });
      const data = await res.json();
      setAiSource(data.source || "keyword-fallback");
      return (data.intent as Intent) || local;
    } catch {
      setAiSource("keyword-fallback");
      return local;
    } finally {
      setIsThinking(false);
    }
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
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setLastHeard(transcript);
      const intent = await getIntentFromAI(transcript);
      if (intent !== "UNKNOWN") handleIntent(intent);
    };
    recognition.start();
  }

  function handleIntent(intent: Intent) {
    if (intent === "REPEAT") { speakAgain(); return; }
    if (intent === "STOP") {
      metronomeRef.current?.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setCurrentId("welcome");
      return;
    }
    setCurrentId(getNextStep(currentId, intent));
  }

  const compressionCount = Math.floor((seconds * 110) / 60);
  const tabBtn = (active: boolean) =>
    `flex-1 py-3 px-2 rounded-lg text-sm font-bold border ${active ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-700 border-neutral-300"}`;

  return (
    <main className="min-h-screen bg-stone-100 text-neutral-900 flex flex-col items-center p-4 sm:p-6">
      <div className="w-full max-w-xl">
        {/* Header */}
        <header className="flex items-start justify-between border-b-2 border-neutral-900 pb-4 pt-2">
          <div className="flex gap-3">
            <div className="w-11 h-11 bg-red-600 text-white grid place-items-center rounded-md text-2xl font-black leading-none">+</div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">RESCUE Trainer</h1>
              <p className="text-[11px] uppercase tracking-widest text-neutral-500 mt-1">CPR Coaching System • Training Build</p>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-white border border-neutral-300 rounded-full px-2.5 py-1">110 BPM</span>
        </header>

        <div className="bg-red-50 border border-red-200 text-red-900 text-xs rounded-lg p-3 mt-4 leading-relaxed">
          <strong>Training prototype for a mannequin only. Not a medical device.</strong> In a real emergency call 911 and follow dispatcher instructions.
          <div className="text-blue-700 mt-1">Powered by Muse Spark for voice intent • Fixed protocol, no AI medical advice</div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-2 mt-4">
          <button onClick={() => setTab("coach")} className={tabBtn(tab === "coach")}>🎙️ Coach</button>
          <button onClick={() => setTab("3d")} className={tabBtn(tab === "3d")}>🧍 3D Trainer</button>
          <button onClick={() => setTab("camera")} className={tabBtn(tab === "camera")}>📷 Camera Scan</button>
        </nav>

        {/* 3D + Camera */}
        {tab === "3d" && (
          <section className="mt-5">
            <h2 className="text-xl font-black">See the compression</h2>
            <p className="text-sm text-neutral-600 mb-3">Rotate the model. Learn where to press, how deep, and the rhythm before you touch a mannequin.</p>
            <Chest3D />
          </section>
        )}

        {tab === "camera" && (
  <section className="mt-5">
    <h2 className="text-xl font-black">Live Hands Trainer</h2>
    <p className="text-sm text-neutral-600 mb-3">Move your hands — the 3D chest moves with you while the coach talks you through it.</p>
    <CameraTrainer />
  </section>
)}
{tab === "camera" && (
  <section className="mt-5">
    <h2 className="text-xl font-black">Live Hands Trainer</h2>
    <p className="text-sm text-neutral-600 mb-3">Move your hands — the 3D chest moves with you while the coach talks you through it.</p>
    <CameraTrainer />
  </section>
)}

        {/* Coach - your original trainer */}
        {tab === "coach" && (
          <>
            <div className="flex gap-1.5 mt-5" aria-label="Progress">
              {STEPS.map((id, i) => (
                <div key={id} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-red-600" : "bg-neutral-300"}`} />
              ))}
            </div>
            <p className="text-[11px] uppercase tracking-widest text-neutral-500 mt-2">Step {stepIndex + 1} of {STEPS.length} — {currentId}</p>

            <section className="bg-white border border-neutral-200 rounded-2xl p-6 mt-3 text-center shadow-sm">
              <h2 className="text-2xl font-black tracking-tight">{step.title}</h2>
              <p className="text-lg leading-relaxed mt-3">{step.instruction}</p>
              <p className="text-sm text-neutral-500 italic mt-3">&quot;{step.prompt}&quot;</p>

              {currentId === "compressions" && (
                <div className="bg-neutral-900 text-white rounded-2xl p-6 w-full mt-5">
                  <div className="text-6xl font-black">{compressionCount}</div>
                  <div className="text-neutral-400 text-sm">approx. compressions</div>
                  <div className="text-lg mt-2 font-bold">{seconds}s • 110 BPM</div>
                  <div className="mt-3 animate-pulse text-red-400 font-bold">● FOLLOW THE BEAT ●</div>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3 mt-4 pb-4">
              {currentId === "welcome" && <button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-red-600 text-white py-4 rounded-xl text-lg font-bold">Start Training</button>}
              {currentId === "scene" && (<><button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-green-600 text-white py-4 rounded-xl text-lg font-bold">Yes, It&apos;s Safe</button><button onClick={() => handleIntent("NEGATIVE")} className="bg-neutral-700 text-white py-4 rounded-xl text-lg">No, Not Safe</button></>)}
              {currentId === "responsiveness" && (<><button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-green-600 text-white py-4 rounded-xl text-lg font-bold">Yes, Responsive</button><button onClick={() => handleIntent("NEGATIVE")} className="bg-neutral-700 text-white py-4 rounded-xl text-lg font-bold">No Response</button></>)}
              {currentId === "call" && <button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-red-600 text-white py-4 rounded-xl text-lg font-bold">Done - Calling 911</button>}
              {currentId === "breathing" && (<><button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-green-600 text-white py-4 rounded-xl text-lg font-bold">Yes, Breathing Normally</button><button onClick={() => handleIntent("NEGATIVE")} className="bg-red-600 text-white py-4 rounded-xl text-lg font-bold">No, Not Breathing Normally</button></>)}
              {currentId === "handPlacement" && <button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-red-600 text-white py-4 rounded-xl text-lg font-bold">Start Compressions</button>}
              {currentId === "compressions" && <button onClick={() => handleIntent("STOP")} className="bg-neutral-700 text-white py-4 rounded-xl text-lg font-bold">Stop Compressions</button>}
              {currentId === "monitor" && <button onClick={() => handleIntent("AFFIRMATIVE")} className="bg-blue-600 text-white py-4 rounded-xl text-lg font-bold">Repeat Breathing Check</button>}

              <button onClick={startListening} className={`py-4 rounded-xl text-lg font-bold text-white ${isListening ? "bg-yellow-500 text-black" : "bg-blue-600"}`}>
                {isListening ? "🎤 Listening..." : isThinking ? "🧠 Muse Spark thinking..." : "🎤 Tap & Speak"}
              </button>

              {lastHeard && <p className="text-center text-sm text-neutral-500">You said: &quot;{lastHeard}&quot; {aiSource && <span className="text-blue-600">• via {aiSource}</span>}</p>}

              <div className="flex gap-3">
                <button onClick={() => handleIntent("REPEAT")} className="flex-1 bg-white border border-neutral-300 py-3 rounded-xl font-semibold">🔊 Repeat That</button>
                <button onClick={() => handleIntent("STOP")} className="flex-1 bg-white border border-neutral-300 py-3 rounded-xl font-semibold">End / Reset</button>
              </div>
            </section>
          </>
        )}

        <footer className="text-center text-[11px] text-neutral-400 py-5 border-t border-neutral-200 mt-2">
          01 Check response • 02 Call 911 • 03 Push hard &amp; fast in the centre of the chest<br />
          RESCUE Trainer — Built for the Meta Global AI Developer Hackathon
        </footer>
      </div>
    </main>
  );
}