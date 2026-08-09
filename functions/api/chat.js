// Cloudflare Pages Function backing the AI Lead Agent widget.
//
// Same request/response contract as the old Node handler in server.js, so
// script.js needs no changes: POST { messages: [...] } -> { reply } | { error }.
//
// The system prompt is duplicated from server.js for now. server.js is still
// serving production on Render; delete it (and this note) once the cutover to
// Pages is done, so there is only one copy.

const CHAT_SYSTEM_PROMPT =
  "You are the AI Lead Agent widget embedded on Panas Website Agency's own site (panaswebsite.agency). " +
  "This is a live, working demo of the exact AI chatbot product the agency sells to independent and " +
  "family-run car dealerships. The person chatting with you is almost always a dealership owner evaluating " +
  "whether to hire the agency, not a car buyer — this site has no real vehicle inventory, so never invent or " +
  "pretend to list cars for sale.\n\n" +
  "WHO THE AGENCY IS:\n" +
  "Panas Website Agency is led by Panagiotis Thomadakis, who oversees every project personally. Speak in " +
  "normal agency voice — 'we', 'our process', 'our team' — not as a single freelancer. If someone asks " +
  "specifically how many people work there or how long the agency has been around, answer honestly: " +
  "Panagiotis Thomadakis leads and personally oversees every project. Never invent a specific headcount, " +
  "years-in-business figure, or client count you don't actually know.\n\n" +
  "WHAT THE AGENCY OFFERS:\n" +
  "- Dealer Site Redesign: the redesign itself is built and shown to the dealer for free — no payment, no " +
  "contract, they only pay if they want to go live with it. Going live costs a one-time build fee (never " +
  "state a specific number or range yourself — every dealership is a different size job, and it gets nailed " +
  "down on the call) plus a $249/mo plan covering hosting, ongoing inventory updates, and maintenance so the " +
  "site never goes stale. Built and live in 24 hours once they say go.\n" +
  "- AI Lead Agent (this chat widget itself) and a private Lead Dashboard, both monthly add-ons sold once " +
  "the redesign is live, priced on a call.\n\n" +
  "YOUR JOB: (1) demonstrate what the AI Lead Agent product does and how it would engage a car buyer on a " +
  "dealer's own site, (2) answer questions about the services above accurately, and (3) when someone seems " +
  "interested, encourage them to request a free 15-minute call via the Contact page.\n\n" +
  "If you are genuinely unsure about a detail, say so and point them to the free call rather than guessing. " +
  "Keep replies short — 2 to 4 sentences, friendly, concrete, no filler.";

const CLOUDFLARE_MODEL = "@cf/meta/llama-3.1-8b-instruct";
// Flash-Lite carries the largest free daily request cap of the Gemini tiers,
// which matters because it is the backstop when Cloudflare's allowance runs out.
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const CHAT_MAX_HISTORY = 10;
const CHAT_MAX_TOKENS = 300;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function cleanHistory(messages) {
  return messages
    .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
    .slice(-CHAT_MAX_HISTORY);
}

// Native binding — no account id or API token to manage, unlike the REST call
// server.js had to make from Render.
async function callWorkersAi(ai, cleaned) {
  const result = await ai.run(CLOUDFLARE_MODEL, {
    messages: [{ role: "system", content: CHAT_SYSTEM_PROMPT }, ...cleaned],
    max_tokens: CHAT_MAX_TOKENS,
  });

  return typeof result?.response === "string" ? result.response.trim() : "";
}

async function callGemini(apiKey, cleaned) {
  const contents = cleaned.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
      generationConfig: { maxOutputTokens: CHAT_MAX_TOKENS },
    }),
  });

  if (!res.ok) {
    console.error("Gemini API error:", res.status, await res.text().catch(() => ""));
    return "";
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

export async function onRequestPost({ request, env }) {
  let parsed;

  try {
    parsed = await request.json();
  } catch {
    return json({ error: "No message provided." }, 400);
  }

  const messages = Array.isArray(parsed?.messages) ? parsed.messages : null;

  if (!messages || messages.length === 0) {
    return json({ error: "No message provided." }, 400);
  }

  const cleaned = cleanHistory(messages);

  if (cleaned.length === 0) {
    return json({ error: "No valid message provided." }, 400);
  }

  if (!env.AI && !env.GEMINI_API_KEY) {
    return json({ error: "The AI Lead Agent isn't connected yet." }, 503);
  }

  let reply = "";

  if (env.AI) {
    try {
      reply = await callWorkersAi(env.AI, cleaned);
    } catch (error) {
      // Most likely the daily Neuron allowance; fall through to Gemini.
      console.error("Workers AI error:", error);
    }
  }

  if (!reply && env.GEMINI_API_KEY) {
    try {
      reply = await callGemini(env.GEMINI_API_KEY, cleaned);
    } catch (error) {
      console.error("Gemini error:", error);
    }
  }

  if (!reply) {
    return json({ error: "AI request failed." }, 502);
  }

  return json({ reply });
}

// The widget only ever POSTs, but a bare GET should not fall through to the
// static asset handler and 404 — that reads as a broken endpoint.
export function onRequestGet() {
  return json({ error: "Send a POST request with a messages array." }, 405);
}
