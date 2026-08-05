const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

const contactForm = document.querySelector(".contact-form");

if (contactForm) {
  const messageEl = contactForm.querySelector(".contact-message");
  const submitBtn = contactForm.querySelector('[type="submit"]');

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData(contactForm);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      "current-offer": String(formData.get("current-offer") || "").trim(),
      "current-site": String(formData.get("current-site") || "").trim(),
      interest: String(formData.get("interest") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    try {
      const res = await fetch("https://formspree.io/f/xeebgwyv", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (messageEl) {
          messageEl.textContent = "Message sent — we'll be in touch soon.";
          messageEl.className = "contact-message message-success";
        }
        contactForm.reset();
      } else {
        throw new Error("Server error");
      }
    } catch {
      if (messageEl) {
        messageEl.textContent =
          "Something went wrong. Email us directly at outreachptagency@gmail.com";
        messageEl.className = "contact-message";
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

const chatWidget = document.querySelector(".chat-widget");

if (chatWidget) {
  const chatToggle = chatWidget.querySelector(".chat-toggle");
  const chatMessages = chatWidget.querySelector(".chat-messages");
  const chatForm = chatWidget.querySelector(".chat-form");
  const chatInput = chatWidget.querySelector(".chat-input");
  const chatSend = chatWidget.querySelector(".chat-send");

  const MAX_MESSAGES = 12;
  const SESSION_KEY = "panasChatCount";
  const conversation = [];

  chatToggle.addEventListener("click", () => {
    const isOpen = chatWidget.classList.toggle("open");
    chatToggle.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) chatInput.focus();
  });

  function addMessage(role, text, { isHtml = false } = {}) {
    const bubble = document.createElement("div");
    bubble.className = `chat-message chat-message-${role}`;
    if (isHtml) {
      bubble.innerHTML = text;
    } else {
      bubble.textContent = text;
    }
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return bubble;
  }

  function lockChat(message) {
    addMessage(
      "system",
      `${message} <a href="contact.html">Request a free 15-minute call</a>.`,
      { isHtml: true }
    );
    chatInput.disabled = true;
    chatSend.disabled = true;
  }

  function getSentCount() {
    return Number(sessionStorage.getItem(SESSION_KEY) || 0);
  }

  if (getSentCount() >= MAX_MESSAGES) {
    lockChat("That's the demo limit for this session — want this AI agent on your own site?");
  }

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = chatInput.value.trim();
    if (!text) return;

    const sentCount = getSentCount();
    if (sentCount >= MAX_MESSAGES) return;

    addMessage("user", text);
    conversation.push({ role: "user", content: text });
    chatInput.value = "";
    sessionStorage.setItem(SESSION_KEY, String(sentCount + 1));

    chatInput.disabled = true;
    chatSend.disabled = true;
    const typing = addMessage("assistant", "Typing…");
    typing.classList.add("chat-typing");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation }),
      });

      const data = await res.json().catch(() => ({}));
      typing.remove();

      if (res.ok && data.reply) {
        addMessage("assistant", data.reply);
        conversation.push({ role: "assistant", content: data.reply });
      } else {
        addMessage(
          "system",
          data.error || "Something went wrong reaching the AI agent — try again in a moment."
        );
      }
    } catch {
      typing.remove();
      addMessage("system", "Something went wrong reaching the AI agent — try again in a moment.");
    } finally {
      if (getSentCount() >= MAX_MESSAGES) {
        lockChat("That's the demo limit for this session — want this AI agent on your own site?");
      } else {
        chatInput.disabled = false;
        chatSend.disabled = false;
        chatInput.focus();
      }
    }
  });
}
