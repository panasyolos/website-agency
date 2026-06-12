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
  const recipientEmail = "outreachptagency@gmail.com";

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }

    const formData = new FormData(contactForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const currentOffer = String(formData.get("current-offer") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const subject = `Website inquiry from ${name || "a producer"}`;
    const body = [
      "Hi Panas Website Agency,",
      "",
      "I would like to book a call.",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Current offer: ${currentOffer || "Not provided"}`,
      "",
      "Message:",
      message || "Not provided",
    ].join("\n");

    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const mailLink = document.createElement("a");
    mailLink.href = mailtoUrl;
    mailLink.style.display = "none";
    document.body.appendChild(mailLink);

    if (messageEl) {
      messageEl.textContent =
        "Opening your default mail app. If nothing opens, use the email link below.";
      messageEl.classList.remove("message-warning", "message-error", "message-success");
      messageEl.classList.add("message-success");
    }

    mailLink.click();
    mailLink.remove();
  });
}
