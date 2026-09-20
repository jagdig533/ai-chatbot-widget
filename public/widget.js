(function () {
  const scriptTag = document.currentScript;
  const apiBase = scriptTag.getAttribute("data-api-base") || "";
  const title = scriptTag.getAttribute("data-title") || "Chat with us";
  const greeting =
    scriptTag.getAttribute("data-greeting") || "Hi! How can I help you today?";
  const accentColor = scriptTag.getAttribute("data-color") || "#4f46e5";

  const history = [];

  const style = document.createElement("style");
  style.textContent = `
    .aicw-bubble {
      position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px;
      border-radius: 50%; background: ${accentColor}; color: #fff; border: none;
      cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.25); font-size: 24px;
      z-index: 999999; display: flex; align-items: center; justify-content: center;
    }
    .aicw-panel {
      position: fixed; bottom: 90px; right: 20px; width: 320px; max-height: 460px;
      background: #fff; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      display: none; flex-direction: column; overflow: hidden; z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
    .aicw-input-row { display: flex; border-top: 1px solid #e5e7eb; }
    .aicw-input {
      flex: 1; border: none; padding: 10px 12px; font-size: 14px; outline: none;
    }
    .aicw-send { border: none; background: ${accentColor}; color: #fff; padding: 0 16px; cursor: pointer; }
    .aicw-send:disabled { opacity: 0.5; cursor: default; }
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
    <div class="aicw-input-row">
      <input class="aicw-input" id="aicw-input" type="text" placeholder="Type a message..." />
      <button class="aicw-send" id="aicw-send">Send</button>
    </div>
  `;

  document.body.appendChild(panel);
  document.body.appendChild(bubble);

  const messagesEl = panel.querySelector("#aicw-messages");
  const inputEl = panel.querySelector("#aicw-input");
  const sendBtn = panel.querySelector("#aicw-send");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function appendMessage(role, text) {
    const div = document.createElement("div");
    div.className = `aicw-msg aicw-${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  let opened = false;
  bubble.addEventListener("click", () => {
    opened = !opened;
    panel.classList.toggle("aicw-open", opened);
    if (opened && messagesEl.childElementCount === 0) {
      appendMessage("assistant", greeting);
    }
  });

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    appendMessage("user", text);
    inputEl.value = "";
    sendBtn.disabled = true;

    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();

      if (!res.ok) {
        appendMessage("assistant", data.error || "Something went wrong.");
        return;
      }

      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: data.reply });
      appendMessage("assistant", data.reply);
    } catch (err) {
      appendMessage("assistant", "Network error. Please try again.");
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
