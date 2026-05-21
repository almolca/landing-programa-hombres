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
  const fields = {
    name: form.querySelector('[name="name"]'),
    email: form.querySelector('[name="email"]'),
    privacy: form.querySelector('[name="privacy"]'),
  };
  const privacyLabel = fields.privacy.closest(".check");

  function setFieldError(field, hasError) {
    field.classList.toggle("is-error", hasError);
    field.setAttribute("aria-invalid", String(hasError));
  }

  function setPrivacyError(hasError) {
    privacyLabel.classList.toggle("is-error", hasError);
    fields.privacy.setAttribute("aria-invalid", String(hasError));
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  function clearMessage() {
    message.textContent = "";
    message.classList.remove("is-success");
  }

  fields.name.addEventListener("input", () => {
    setFieldError(fields.name, !fields.name.value.trim());
    clearMessage();
  });

  fields.email.addEventListener("input", () => {
    const emailValue = fields.email.value.trim();
    setFieldError(fields.email, Boolean(emailValue) && !isValidEmail(emailValue));
    clearMessage();
  });

  fields.privacy.addEventListener("change", () => {
    setPrivacyError(!fields.privacy.checked);
    clearMessage();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const nameIsMissing = !fields.name.value.trim();
    const emailValue = fields.email.value.trim();
    const emailIsMissing = !emailValue;
    const emailIsInvalid = Boolean(emailValue) && !isValidEmail(emailValue);
    const privacyIsMissing = !fields.privacy.checked;
    const isValid = !nameIsMissing && !emailIsMissing && !emailIsInvalid && !privacyIsMissing;

    message.classList.remove("is-success");

    if (!isValid) {
      setFieldError(fields.name, nameIsMissing);
      setFieldError(fields.email, emailIsMissing || emailIsInvalid);
      setPrivacyError(privacyIsMissing);
      message.textContent = emailIsInvalid
        ? "Revisa el formato del email antes de continuar."
        : "Completa nombre, email y acepta la política de privacidad.";
      return;
    }

    setFieldError(fields.name, false);
    setFieldError(fields.email, false);
    setPrivacyError(false);
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
