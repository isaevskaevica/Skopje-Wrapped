// Vercel serverless функција: го крие Groq клучот на серверот.
// Во Vercel → Settings → Environment Variables додадете GROQ_API_KEY.
const ALLOWED_MODELS = [
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "openai/gpt-oss-120b",
  "qwen/qwen3-32b",
];

module.exports = async (req, res) => {
  const key = process.env.GROQ_API_KEY;
  if (req.method === "GET") return res.status(200).json({ ok: !!key });
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (!key) return res.status(503).json({ error: "no key configured" });

  const b = req.body || {};
  if (!Array.isArray(b.messages) || b.messages.length > 30) return res.status(400).json({ error: "bad request" });
  const body = {
    model: ALLOWED_MODELS.includes(b.model) ? b.model : ALLOWED_MODELS[0],
    messages: b.messages,
    temperature: Math.min(Math.max(Number(b.temperature) || 0.7, 0), 1.2),
    max_tokens: Math.min(Number(b.max_tokens) || 400, 600),
  };
  if (b.response_format && b.response_format.type === "json_object") body.response_format = { type: "json_object" };

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: "upstream" });
  }
};
