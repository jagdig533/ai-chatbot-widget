require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const OpenAI = require("openai");

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.MODEL || "openai/gpt-oss-20b";
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  "You are a helpful, friendly customer support assistant. Keep answers concise and on-topic.";
const MAX_HISTORY_MESSAGES = 20;

if (!GROQ_API_KEY) {
  console.error("Missing GROQ_API_KEY. Copy .env.example to .env and add your free Groq API key.");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.static("public"));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages, please slow down and try again shortly." },
});

app.post("/api/chat", chatLimiter, async (req, res) => {
  const { message, history } = req.body || {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
        .slice(-MAX_HISTORY_MESSAGES)
    : [];

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...safeHistory,
    { role: "user", content: message },
  ];

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 512,
    });

    const reply = completion.choices?.[0]?.message?.content ?? "";
    res.json({ reply });
  } catch (err) {
    console.error("Chat request failed:", err.message);
    res.status(502).json({ error: "The assistant is temporarily unavailable. Please try again." });
  }
});

app.listen(PORT, () => {
  console.log(`Chat widget server running on http://localhost:${PORT}`);
  console.log(`Try the demo at http://localhost:${PORT}/demo.html`);
});
