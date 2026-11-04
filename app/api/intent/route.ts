import { NextResponse } from "next/server";

function keywordIntent(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("repeat")) return "REPEAT";
  if (t.includes("stop") || t.includes("end") || t.includes("reset")) return "STOP";
  if (t.includes("no") || t.includes("not") || t.includes("unresponsive") || t.includes("isn't") || t.includes("isnt")) return "NEGATIVE";
  if (t.includes("yes") || t.includes("safe") || t.includes("done") || t.includes("start") || t.includes("calling") || t.includes("breathing")) return "AFFIRMATIVE";
  return "UNKNOWN";
}

export async function POST(req: Request) {
  try {
    const { text, currentStep } = await req.json();
    const fallback = keywordIntent(text || "");

    const apiKey = process.env.META_API_KEY;
    const baseUrl = process.env.META_API_BASE_URL; // from your Meta dashboard
    const model = process.env.META_MODEL || "muse-spark";

    // If no Meta key set yet, use keyword fallback so app never breaks
    if (!apiKey || !baseUrl) {
      return NextResponse.json({ intent: fallback, source: "keyword-fallback" });
    }

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: `You are an intent classifier ONLY for a CPR training app. You do NOT give medical advice, diagnosis, or instructions. Current step: ${currentStep}. Classify the user's speech into exactly one: AFFIRMATIVE, NEGATIVE, REPEAT, STOP, UNKNOWN. Examples: "yeah he's not breathing" at breathing step = NEGATIVE. "I did that, calling now" = AFFIRMATIVE. Return ONLY JSON: {"intent":"AFFIRMATIVE"}`,
            },
            { role: "user", content: text },
          ],
          temperature: 0,
          max_tokens: 50,
        }),
      });

      if (!res.ok) throw new Error("Meta API failed");

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content);
      const intent = ["AFFIRMATIVE","NEGATIVE","REPEAT","STOP","UNKNOWN"].includes(parsed.intent) ? parsed.intent : fallback;

      return NextResponse.json({ intent, source: "muse-spark" });
    } catch (e) {
      return NextResponse.json({ intent: fallback, source: "keyword-fallback" });
    }
  } catch {
    return NextResponse.json({ intent: "UNKNOWN", source: "error" }, { status: 400 });
  }
}