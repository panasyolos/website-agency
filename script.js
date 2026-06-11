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
  const shouldPostToServer = /^https?:$/.test(window.location.protocol);
  const endpoint = contactForm.action || "/submit";

  if (!shouldPostToServer && messageEl) {
    messageEl.textContent =
      "This form only works when the site is hosted from a web server. Open it over http:// or https://.";
    messageEl.classList.add("message-warning");
  }

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
    let statusClass = "message-success";

    if (shouldPostToServer) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submission),
        });

        const responseJson = response.headers
          .get("content-type")
          ?.includes("application/json")
          ? await response.json()
          : null;

        if (response.ok && responseJson?.success) {
          feedback = "Thanks! We received your message and will email you to book a call.";
        } else {
          const error = responseJson?.error || `${response.status} ${response.statusText}`;
          console.error("Server submission failed", error);
          feedback = "Thank you! Saved locally, but the server could not send the email.";
          statusClass = "message-error";
        }
      } catch (error) {
        console.error("Server submission error", error);
        feedback = "Thank you! Saved locally, but the server could not send the email.";
        statusClass = "message-error";
      }
    }

    if (messageEl) {
      messageEl.textContent = feedback;
      messageEl.classList.remove("message-warning", "message-error", "message-success");
      messageEl.classList.add(statusClass);
    }

    contactForm.reset();
  });
}
