const WHATSAPP_URL = "";
const targetDate = Date.now() + 15 * 86400000;

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
    form.reset();
    window.location.href = "gracias.html";
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

function getWhatsappUrl() {
  const url = WHATSAPP_URL.trim();
  return url && !url.includes("PEGAR") ? url : "";
}

function initThanksCountdown() {
  const countdown =
    document.querySelector("#whatsappCountdown") || document.querySelector("#confirmedCountdown");
  const whatsappButton =
    document.querySelector("#whatsappButton") || document.querySelector("#confirmedWhatsappButton");

  if (!countdown || !whatsappButton) {
    return;
  }

  const whatsappUrl = getWhatsappUrl();

  if (whatsappUrl) {
    whatsappButton.href = whatsappUrl;
    whatsappButton.target = "_blank";
  } else {
    whatsappButton.removeAttribute("target");
    whatsappButton.setAttribute("aria-disabled", "true");
    whatsappButton.addEventListener("click", (event) => {
      event.preventDefault();
    });
  }

  let seconds = 60;
  countdown.textContent = pad(seconds);

  const interval = setInterval(() => {
    seconds -= 1;
    countdown.textContent = pad(Math.max(seconds, 0));

    if (seconds <= 0) {
      clearInterval(interval);

      if (whatsappUrl) {
        window.location.href = whatsappUrl;
      }
    }
  }, 1000);
}

if (daysEl && hoursEl && minutesEl) {
  updateTimer();
  setInterval(updateTimer, 60000);
}

const heroForm = document.querySelector("#heroForm");
const footerForm = document.querySelector("#footerForm");

if (heroForm) {
  bindForm(heroForm, document.querySelector("#formMessage"));
}

if (footerForm) {
  bindForm(footerForm, document.querySelector("#footerMessage"));
}

initScrollReveal();
initThanksCountdown();
