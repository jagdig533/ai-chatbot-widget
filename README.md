# AI Chat Widget

An embeddable AI chatbot you can drop onto any website with one `<script>` tag.
Backend runs on Node/Express and calls a free LLM API (Groq) — no paid API key needed.

## 1. Get a free API key

1. Go to https://console.groq.com and sign up (free, no card required).
2. Create an API key from the dashboard.

## 2. Run it locally

```bash
npm install
cp .env.example .env
# paste your key into .env as GROQ_API_KEY=...
npm start
```

Open http://localhost:3000/demo.html to see the widget on a sample page.

## 3. Customize per client

Two places to configure the assistant for a specific business:

- `.env` -> `SYSTEM_PROMPT` — the assistant's personality/knowledge/rules for that business.
- The `<script>` tag attributes in the embed snippet below — title, greeting, and accent color shown in the widget UI.

## 4. Embed on a client's website

Live deployment: https://ai-chatbot-widget-wg71.onrender.com

Give the client this snippet to paste before `</body>`:

```html
<script
  src="https://ai-chatbot-widget-wg71.onrender.com/widget.js"
  data-api-base="https://ai-chatbot-widget-wg71.onrender.com"
  data-title="Their Business Name"
  data-greeting="Hi! How can I help you today?"
  data-color="#4f46e5"
></script>
```

## 5. Deploy for free

Any Node-friendly free host works, e.g. **Render** (render.com):

1. Push this project to a GitHub repo.
2. On Render: New -> Web Service -> connect the repo.
3. Build command: `npm install`, Start command: `npm start`.
4. Add environment variables (`GROQ_API_KEY`, `MODEL`, `SYSTEM_PROMPT`) in Render's dashboard.
5. Deploy — Render gives you a public URL to use as `YOUR-DEPLOYED-URL` above.

Railway.app and Fly.io work the same way if you prefer.

Note: on Render's free tier, the service spins down after ~15 minutes idle — the first
request after idling takes 30-60s to wake up. Fine for demos; upgrade to a paid instance
once you have a real client relying on it.

## Notes on the free tier

Groq's free tier has request-per-minute and token-per-day limits. The server already
rate-limits each visitor to 20 messages/minute to help stay within those limits. If you
outgrow it, you can later swap `baseURL`/`apiKey`/`model` in `server.js` for the real
Claude API without changing the widget at all — the chat endpoint contract stays the same.
