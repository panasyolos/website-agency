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

const ARROW_ICONS = {
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>',
};

// Controls are built here rather than in the markup so that without JS the
// slides simply stack (see the `scripting: none` block in styles.css).
document.querySelectorAll("[data-slideshow]").forEach((slideshow, showIndex) => {
  const viewport = slideshow.querySelector(".slideshow-viewport");
  const slides = Array.from(slideshow.querySelectorAll(".slideshow-slide"));

  if (!viewport || slides.length === 0) return;

  const label = slideshow.dataset.slideshow || "Concept mockup";
  const baseId = `slideshow-${showIndex + 1}`;
  let current = Math.max(
    0,
    slides.findIndex((slide) => slide.classList.contains("is-active"))
  );

  viewport.id = `${baseId}-viewport`;
  viewport.setAttribute("role", "region");
  viewport.setAttribute("aria-roledescription", "carousel");
  viewport.setAttribute("aria-label", `${label} — ${slides.length} screens`);

  slides.forEach((slide, index) => {
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${index + 1} of ${slides.length}`);
  });

  const makeNav = (direction) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `slideshow-nav slideshow-${direction}`;
    button.innerHTML = ARROW_ICONS[direction];
    button.setAttribute("aria-label", direction === "prev" ? "Previous screen" : "Next screen");
    button.setAttribute("aria-controls", viewport.id);
    button.addEventListener("click", () => goTo(current + (direction === "prev" ? -1 : 1)));
    return button;
  };

  const counter = document.createElement("p");
  counter.className = "slideshow-counter";
  counter.setAttribute("aria-live", "polite");

  viewport.append(makeNav("prev"), makeNav("next"), counter);

  const caption = document.createElement("p");
  caption.className = "slideshow-caption";

  const dots = document.createElement("div");
  dots.className = "slideshow-dots";
  dots.setAttribute("role", "group");
  dots.setAttribute("aria-label", `${label} screens`);

  const dotButtons = slides.map((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "slideshow-dot";
    dot.setAttribute("aria-controls", viewport.id);
    dot.setAttribute("aria-label", slide.dataset.title || `Screen ${index + 1}`);
    dot.addEventListener("click", () => goTo(index));
    return dot;
  });

  dots.append(...dotButtons);

  const controls = document.createElement("div");
  controls.className = "slideshow-controls";
  controls.append(caption, dots);
  slideshow.append(controls);

  // Slides are hidden, so the browser never gets round to their lazy images.
  // Promote the current slide and its neighbours to eager instead — the page
  // still starts with one image, but nothing ever lands on a blank frame.
  function preload(index) {
    const total = slides.length;
    [index - 1, index, index + 1].forEach((position) => {
      const img = slides[((position % total) + total) % total].querySelector("img");
      if (img && img.loading === "lazy") img.loading = "eager";
    });
  }

  // Sizes the viewport to the slide on screen. Lazy-loaded images have no
  // natural size yet, so retry once the image reports in.
  function applyRatio(slide) {
    const img = slide.querySelector("img");
    if (!img) return;

    if (!img.naturalWidth) {
      img.addEventListener(
        "load",
        () => {
          if (slide.classList.contains("is-active")) applyRatio(slide);
        },
        { once: true }
      );
      return;
    }

    const ratio = Math.min(Math.max(img.naturalWidth / img.naturalHeight, 1.5), 4.6);
    viewport.style.aspectRatio = String(ratio);
  }

  function goTo(index) {
    const total = slides.length;
    const next = ((index % total) + total) % total;

    slides[current].classList.remove("is-active");
    dotButtons[current].setAttribute("aria-current", "false");

    current = next;

    slides[current].classList.add("is-active");
    dotButtons[current].setAttribute("aria-current", "true");
    preload(current);
    applyRatio(slides[current]);

    const { title, caption: text } = slides[current].dataset;
    caption.innerHTML = "";
    if (title) {
      const strong = document.createElement("strong");
      strong.textContent = title;
      caption.append(strong);
    }
    if (text) caption.append(document.createTextNode(text));

    counter.textContent = `${current + 1} / ${total}`;
  }

  slideshow.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(current - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(current + 1);
    }
  });

  let swipeStartX = null;

  viewport.addEventListener("pointerdown", (event) => {
    swipeStartX = event.clientX;
  });

  viewport.addEventListener("pointerup", (event) => {
    if (swipeStartX === null) return;
    const distance = event.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(distance) > 45) goTo(current + (distance < 0 ? 1 : -1));
  });

  viewport.addEventListener("pointercancel", () => {
    swipeStartX = null;
  });

  goTo(current);
});

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
