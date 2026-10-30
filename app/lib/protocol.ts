export type Intent = "AFFIRMATIVE" | "NEGATIVE" | "REPEAT" | "DONE" | "STOP" | "UNKNOWN";

export interface Step {
  id: string;
  title: string;
  prompt: string; // exact words the app will speak
  instruction: string; // text shown on screen
}

export const PROTOCOL: Record<string, Step> = {
  welcome: {
    id: "welcome",
    title: "RESCUE Trainer",
    prompt: "Welcome to RESCUE Trainer. This is for training on a mannequin only. Say start when ready.",
    instruction: "Training prototype only. Not a medical device. Always call 911 in a real emergency."
  },
  scene: {
    id: "scene",
    title: "1. Scene Safety",
    prompt: "Step 1. Check the scene. Is it safe to approach? Say yes or no.",
    instruction: "Look for hazards. Do not approach if unsafe."
  },
  responsiveness: {
    id: "responsiveness",
    title: "2. Responsiveness",
    prompt: "Step 2. Tap the shoulders and shout, are you okay? Is the person responsive? Say yes or no.",
    instruction: "Tap shoulders firmly and shout."
  },
  call: {
    id: "call",
    title: "3. Call For Help",
    prompt: "Step 3. Call 911 on speaker phone now. Shout for someone to bring an AED. Say done when calling.",
    instruction: "Call 911 on speaker. Send someone for an AED. Dispatcher instructions override RESCUE."
  },
  breathing: {
    id: "breathing",
    title: "4. Breathing Check",
    prompt: "Step 4. Look for normal breathing for no more than 10 seconds. Is the person breathing normally? Say yes or no.",
    instruction: "YOU make this assessment. RESCUE does not assess breathing."
  },
  handPlacement: {
    id: "handPlacement",
    title: "5. Hand Placement",
    prompt: "Place the heel of one hand in the center of the chest, other hand on top. Get ready to push hard and fast. Say start compressions.",
    instruction: "Center of chest. Interlock hands. Arms straight."
  },
  compressions: {
    id: "compressions",
    title: "6. Compressions",
    prompt: "Begin compressions. Push hard and fast and follow the beat.",
    instruction: "Follow the 110 BPM metronome. Let the chest recoil fully."
  },
  monitor: {
    id: "monitor",
    title: "Monitor",
    prompt: "The person is breathing normally. Keep monitoring breathing and wait for emergency help. Say repeat check to check again, or stop to end.",
    instruction: "Stay with the person. Monitor until help arrives."
  },
  aed: {
    id: "aed",
    title: "AED Arrived",
    prompt: "An AED has arrived. Turn it on and follow the AED voice prompts. Its instructions override RESCUE. Say resume to continue compressions.",
    instruction: "Turn on AED, follow ITS voice prompts."
  }
};

export function getNextStep(currentId: string, intent: Intent): string {
  if (intent === "REPEAT") return currentId;

  switch (currentId) {
    case "welcome": return "scene";
    case "scene": return intent === "AFFIRMATIVE" ? "responsiveness" : "scene";
    case "responsiveness": return "call";
    case "call": return "breathing";
    case "breathing": return intent === "AFFIRMATIVE" ? "monitor" : "handPlacement";
    case "handPlacement": return "compressions";
    case "compressions": return "compressions"; // loops in 2-min cycles
    case "monitor": return "breathing";
    default: return currentId;
  }
}