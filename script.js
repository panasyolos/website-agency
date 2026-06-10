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
  const shouldPostToServer = window.location.protocol.startsWith("http");

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const submission = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      currentOffer: String(formData.get("current-offer") || ""),
      message: String(formData.get("message") || ""),
      submittedAt: new Date().toISOString(),
    };

    const storageKey = "panasContactSubmissions";
    const existing = localStorage.getItem(storageKey);
    const submissions = existing ? JSON.parse(existing) : [];
    submissions.push(submission);
    localStorage.setItem(storageKey, JSON.stringify(submissions));

    let feedback = "Thank you! Your message is saved locally.";

    if (shouldPostToServer) {
      try {
        const response = await fetch("/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submission),
        });

        if (response.ok) {
          feedback = "Thank you! Your message is saved to the local server file.";
        } else {
          feedback = "Thank you! Saved locally, but server storage is unavailable.";
        }
      } catch (error) {
        feedback = "Thank you! Saved locally, but server storage is unavailable.";
      }
    }

    if (messageEl) {
      messageEl.textContent = feedback;
      messageEl.classList.add("message-success");
    }

    contactForm.reset();
  });
}
