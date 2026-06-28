// Load hero video only on desktop — prevents the 17 MB download on mobile
const heroVideo = document.querySelector(".hero-video");
if (heroVideo && window.matchMedia("(min-width: 769px)").matches) {
  heroVideo.querySelectorAll("source[data-src]").forEach((source) => {
    source.src = source.dataset.src;
  });
  heroVideo.load();
  heroVideo.play().catch(() => {});
}

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
