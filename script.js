const targetDate = new Date("2026-05-28T19:00:00+04:00").getTime();

const daysEl = document.querySelector("#days");
const hoursEl = document.querySelector("#hours");
const minutesEl = document.querySelector("#minutes");

function pad(value) {
  return String(value).padStart(2, "0");
}

function updateTimer() {
  const remaining = Math.max(0, targetDate - Date.now());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);

  daysEl.textContent = pad(days);
  hoursEl.textContent = pad(hours);
  minutesEl.textContent = pad(minutes);
}

function bindForm(form, message) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const isValid = form.checkValidity();
    message.classList.remove("is-success");

    if (!isValid) {
      message.textContent = "Completa todos los campos para reservar tu plaza.";
      form.reportValidity();
      return;
    }

    message.textContent = "Plaza reservada. Revisa tu email para el acceso.";
    message.classList.add("is-success");
    form.reset();
  });
}

function initScrollReveal() {
  const revealItems = document.querySelectorAll(".reveal-on-scroll");

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

updateTimer();
setInterval(updateTimer, 60000);

bindForm(document.querySelector("#heroForm"), document.querySelector("#formMessage"));
bindForm(document.querySelector("#footerForm"), document.querySelector("#footerMessage"));
initScrollReveal();
