(function () {
  const scriptTag = document.currentScript;
  const apiBase = scriptTag.getAttribute("data-api-base") || "";
  const title = scriptTag.getAttribute("data-title") || "Chat with us";
  const greeting =
    scriptTag.getAttribute("data-greeting") || "Hi! How can I help you today?";
  const accentColor = scriptTag.getAttribute("data-color") || "#4f46e5";
  const suggestions = (scriptTag.getAttribute("data-suggestions") || "Hours,Book an appointment,Do you take insurance?")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const history = [];

  // Wake a sleeping free-tier server as soon as the page loads, before the
  // visitor opens the chat, so the first real message doesn't hit a cold start.
  fetch(`${apiBase}/health`).catch(() => {});

  const style = document.createElement("style");
  style.textContent = `
    .aicw-bubble {
      position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px;
      border-radius: 50%; background: ${accentColor}; color: #fff; border: none;
      cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.25); font-size: 24px;
      z-index: 999999; display: flex; align-items: center; justify-content: center;
    }
    .aicw-panel {
      position: fixed; bottom: 90px; right: 20px;
      width: 320px; max-width: calc(100vw - 32px);
      max-height: 460px; height: min(460px, calc(100vh - 120px));
      background: #fff; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      display: none; flex-direction: column; overflow: hidden; z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    @media (max-width: 420px) {
      .aicw-panel { right: 16px; left: 16px; width: auto; bottom: 84px; }
      .aicw-bubble { bottom: 16px; right: 16px; }
    }
    .aicw-panel.aicw-open { display: flex; }
    .aicw-header {
      background: ${accentColor}; color: #fff; padding: 12px 16px; font-weight: 600;
    }
    .aicw-messages {
      flex: 1; padding: 12px; overflow-y: auto; font-size: 14px; background: #f8f9fb;
    }
    .aicw-msg { margin-bottom: 10px; line-height: 1.4; max-width: 85%; padding: 8px 12px; border-radius: 10px; }
    .aicw-msg.aicw-user { background: ${accentColor}; color: #fff; margin-left: auto; }
    .aicw-msg.aicw-assistant { background: #eceef2; color: #1a1a1a; }
    .aicw-msg p { margin: 0 0 8px; }
    .aicw-msg p:last-child { margin-bottom: 0; }
    .aicw-msg ul, .aicw-msg ol { margin: 0 0 8px; padding-left: 20px; }
    .aicw-msg ul:last-child, .aicw-msg ol:last-child { margin-bottom: 0; }
    .aicw-msg li { margin-bottom: 2px; }
    .aicw-msg strong { font-weight: 700; }
    .aicw-input-row { display: flex; border-top: 1px solid #e5e7eb; }
    .aicw-input {
      flex: 1; border: none; padding: 10px 12px; font-size: 14px; outline: none;
    }
    .aicw-send { border: none; background: ${accentColor}; color: #fff; padding: 0 16px; cursor: pointer; }
    .aicw-send:disabled { opacity: 0.5; cursor: default; }
    .aicw-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 10px; }
    .aicw-suggestion {
      border: 1px solid ${accentColor}; color: ${accentColor}; background: #fff;
      border-radius: 14px; padding: 5px 10px; font-size: 12px; cursor: pointer;
    }
    .aicw-suggestion:hover { background: ${accentColor}; color: #fff; }
    .aicw-typing { display: inline-flex; gap: 4px; align-items: center; padding: 4px 0; }
    .aicw-typing span {
      width: 6px; height: 6px; border-radius: 50%; background: #9aa0ab;
      animation: aicw-bounce 1.2s infinite ease-in-out;
    }
    .aicw-typing span:nth-child(2) { animation-delay: 0.15s; }
    .aicw-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes aicw-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-4px); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  const bubble = document.createElement("button");
  bubble.className = "aicw-bubble";
  bubble.textContent = "💬";
  bubble.setAttribute("aria-label", "Open chat");

  const panel = document.createElement("div");
  panel.className = "aicw-panel";
  panel.innerHTML = `
    <div class="aicw-header">${escapeHtml(title)}</div>
    <div class="aicw-messages" id="aicw-messages"></div>
    <div class="aicw-suggestions" id="aicw-suggestions"></div>
    <div class="aicw-input-row">
      <input class="aicw-input" id="aicw-input" type="text" placeholder="Type a message..." />
      <button class="aicw-send" id="aicw-send">Send</button>
    </div>
  `;

  document.body.appendChild(panel);
  document.body.appendChild(bubble);

  const messagesEl = panel.querySelector("#aicw-messages");
  const suggestionsEl = panel.querySelector("#aicw-suggestions");
  const inputEl = panel.querySelector("#aicw-input");
  const sendBtn = panel.querySelector("#aicw-send");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Minimal, safe subset of markdown: bold, bullet/numbered lists, paragraphs.
  // Input is escaped first so no raw HTML from the model or user is ever injected.
  function renderLiteMarkdown(text) {
    const escaped = escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    const blocks = escaped.split(/\n\s*\n/);
    return blocks
      .map((block) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (lines.length === 0) return "";

        if (lines.every((l) => /^[-*]\s+/.test(l.trim()))) {
          const items = lines.map((l) => `<li>${l.trim().replace(/^[-*]\s+/, "")}</li>`).join("");
          return `<ul>${items}</ul>`;
        }
        if (lines.every((l) => /^\d+[.)]\s+/.test(l.trim()))) {
          const items = lines.map((l) => `<li>${l.trim().replace(/^\d+[.)]\s+/, "")}</li>`).join("");
          return `<ol>${items}</ol>`;
        }
        return `<p>${lines.join("<br>")}</p>`;
      })
      .join("");
  }

  function appendMessage(role, text) {
    const div = document.createElement("div");
    div.className = `aicw-msg aicw-${role}`;
    if (role === "assistant") {
      div.innerHTML = renderLiteMarkdown(text);
    } else {
      div.textContent = text;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "aicw-msg aicw-assistant";
    div.id = "aicw-typing";
    div.innerHTML = '<span class="aicw-typing"><span></span><span></span><span></span></span>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const el = messagesEl.querySelector("#aicw-typing");
    if (el) el.remove();
  }

  function renderSuggestions() {
    suggestionsEl.innerHTML = "";
    suggestions.forEach((s) => {
      const chip = document.createElement("button");
      chip.className = "aicw-suggestion";
      chip.textContent = s;
      chip.addEventListener("click", () => sendMessage(s));
      suggestionsEl.appendChild(chip);
    });
  }

  let opened = false;
  bubble.addEventListener("click", () => {
    opened = !opened;
    panel.classList.toggle("aicw-open", opened);
    if (opened && messagesEl.childElementCount === 0) {
      appendMessage("assistant", greeting);
      renderSuggestions();
    }
  });

  async function sendMessage(overrideText) {
    const text = (overrideText ?? inputEl.value).trim();
    if (!text) return;

    appendMessage("user", text);
    inputEl.value = "";
    sendBtn.disabled = true;
    suggestionsEl.innerHTML = "";
    showTyping();

    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      hideTyping();

      if (!res.ok) {
        appendMessage("assistant", data.error || "Something went wrong.");
        return;
      }

      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: data.reply });
      appendMessage("assistant", data.reply);
    } catch (err) {
      hideTyping();
      appendMessage("assistant", "Network error. Please try again.");
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener("click", () => sendMessage());
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
