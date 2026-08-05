const SYSTEM_PROMPT = {
  role: "system",
  content:
    "You are the AI Lead Agent widget embedded on Panas Website Agency's own site (panaswebsite.agency). " +
    "This is a live, working demo of the exact AI chatbot product the agency sells to independent and " +
    "family-run car dealerships. The person chatting with you is almost always a dealership owner evaluating " +
    "whether to hire the agency, not a car buyer — this site has no real vehicle inventory, so never invent or " +
    "pretend to list cars for sale. Your job: (1) demonstrate what the AI Lead Agent product does and how it " +
    "would engage a car buyer on a client's site, (2) answer questions about Panas Website Agency's services — " +
    "Dealer Site Redesign ($500-$1,200 one-time, built and live in 24 hours, first redesign done free with no " +
    "commitment), AI Lead Agent and Lead Dashboard as add-ons priced on a call, (3) mention the founder, " +
    "Panagiotis Thomadakis, if asked who runs the agency, and (4) when someone seems interested, encourage them " +
    "to request a free 15-minute call via the Contact page. Keep replies short — 2 to 4 sentences, friendly, " +
    "concrete, no filler.",
};

const MAX_HISTORY = 10;
const MAX_TOKENS = 300;
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const messages = Array.isArray(body?.messages) ? body.messages : null;

    if (!messages || messages.length === 0) {
      return jsonResponse({ error: "No message provided." }, 400);
    }

    const cleaned = messages
      .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .slice(-MAX_HISTORY);

    if (cleaned.length === 0) {
      return jsonResponse({ error: "No valid message provided." }, 400);
    }

    if (!context.env.AI) {
      return jsonResponse(
        { error: "The AI Lead Agent isn't connected yet — the Cloudflare AI binding hasn't been added." },
        503
      );
    }

    const result = await context.env.AI.run(MODEL, {
      messages: [SYSTEM_PROMPT, ...cleaned],
      max_tokens: MAX_TOKENS,
    });

    const reply = result?.response?.trim();

    if (!reply) {
      return jsonResponse({ error: "No reply generated." }, 502);
    }

    return jsonResponse({ reply });
  } catch (err) {
    return jsonResponse({ error: "Something went wrong." }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
