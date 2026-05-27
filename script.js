const WHATSAPP_URL = "";
const N8N_LEAD_WEBHOOK_URL = "https://automation.susanai.net/webhook/lead-created";
const N8N_EVENT_WEBHOOK_URL = "https://automation.susanai.net/webhook/funnel-events";
const LEAD_SESSION_KEY = "arleyaLeadSession";
const CALENDLY_URL = "https://calendly.com/arleya-info/30min";
const targetDate = Date.now() + 15 * 86400000;

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

window.scrollTo(0, 0);
window.addEventListener("load", () => window.scrollTo(0, 0));

const daysEl = document.querySelector("#days");
const hoursEl = document.querySelector("#hours");
const minutesEl = document.querySelector("#minutes");
const secondsEl = document.querySelector("#seconds");

function pad(value) {
  return String(value).padStart(2, "0");
}

function isWebhookConfigured(url) {
  return Boolean(url && !url.includes("PEGAR_AQUI"));
}

function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  const session = getLeadSession();

  return {
    utm_source: params.get("utm_source") || session?.utms?.utm_source || "",
    utm_medium: params.get("utm_medium") || session?.utms?.utm_medium || "",
    utm_campaign: params.get("utm_campaign") || session?.utms?.utm_campaign || "",
    utm_content: params.get("utm_content") || session?.utms?.utm_content || "",
    utm_term: params.get("utm_term") || session?.utms?.utm_term || "",
  };
}

function getLeadSession() {
  try {
    return JSON.parse(localStorage.getItem(LEAD_SESSION_KEY)) || null;
  } catch (error) {
    return null;
  }
}

function getAgendaUrlLeadData() {
  const params = new URLSearchParams(window.location.search);
  const leadData = {
    email: params.get("email")?.trim() || "",
    leadId: params.get("leadId")?.trim() || "",
    name: params.get("name")?.trim() || "",
  };

  return {
    ...leadData,
    hasUrlLeadData: Boolean(leadData.email || leadData.leadId || leadData.name),
  };
}

function getAgendaLeadSession() {
  const storedSession = getLeadSession() || {};
  const urlLeadData = getAgendaUrlLeadData();
  const session = {
    ...storedSession,
    email: urlLeadData.email || storedSession.email || "",
    leadId: urlLeadData.leadId || storedSession.leadId || "",
    name: urlLeadData.name || storedSession.name || "",
    utms: storedSession.utms || getUTMParams(),
  };

  if (urlLeadData.hasUrlLeadData) {
    return {
      session: saveLeadSession(session),
      hasLeadData: Boolean(session.email || session.leadId || session.name),
      hasUrlLeadData: true,
    };
  }

  return {
    session,
    hasLeadData: Boolean(session.email || session.leadId || session.name),
    hasUrlLeadData: false,
  };
}

function getOrCreateLeadId() {
  const session = getLeadSession();

  if (session?.leadId) {
    return session.leadId;
  }

  if (window.crypto?.randomUUID) {
    return `lead_${window.crypto.randomUUID()}`;
  }

  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function createLeadId() {
  if (window.crypto?.randomUUID) {
    return `lead_${window.crypto.randomUUID()}`;
  }

  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function saveLeadSession(data) {
  const currentSession = getLeadSession() || {};
  const now = new Date().toISOString();
  const session = {
    leadId: data.leadId || currentSession.leadId || createLeadId(),
    email: data.email || currentSession.email || "",
    name: data.name || currentSession.name || "",
    utms: data.utms || currentSession.utms || getUTMParams(),
    createdAt: currentSession.createdAt || data.createdAt || now,
    updatedAt: data.updatedAt || now,
  };

  try {
    localStorage.setItem(LEAD_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("No se pudo guardar la sesión del lead.", error);
  }

  return session;
}

function getPageName() {
  const fileName = window.location.pathname.split("/").pop() || "index.html";
  return fileName.replace(".html", "") || "index";
}

function getTrackingBasePayload() {
  return {
    timestamp: new Date().toISOString(),
    page: getPageName(),
    currentUrl: window.location.href,
    utms: getUTMParams(),
    referrer: document.referrer || "",
  };
}

async function postToWebhook(url, payload) {
  if (!isWebhookConfigured(url)) {
    return null;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("No se pudo enviar tracking a n8n.", response.status, errorText);
      return null;
    }

    if (payload?.event === "calendly_booked") {
      console.log("Calendly booking sent to n8n");
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return await response.json();
    }

    return null;
  } catch (error) {
    console.warn("No se pudo enviar tracking a n8n.", error);
    return null;
  }
}

async function sendLeadToN8N(payload) {
  return postToWebhook(N8N_LEAD_WEBHOOK_URL, payload);
}

async function sendFunnelEvent(eventName, extraData = {}) {
  const session = getLeadSession();
  const payload = {
    event: eventName,
    email: session?.email || "",
    leadId: session?.leadId || "",
    ...getTrackingBasePayload(),
    ...extraData,
  };

  return postToWebhook(N8N_EVENT_WEBHOOK_URL, payload);
}

function waitForTracking(promises, timeout = 1200) {
  return Promise.race([
    Promise.allSettled(promises),
    new Promise((resolve) => {
      setTimeout(resolve, timeout);
    }),
  ]);
}

function trackPageViewByPage() {
  const page = getPageName();
  const eventsByPage = {
    gracias: "visited_thanks",
    confirmado: "registration_completed",
    agenda: "visited_agenda",
  };
  const eventName = eventsByPage[page];

  if (eventName) {
    sendFunnelEvent(eventName);
  }
}

function updateTimer() {
  const remaining = Math.max(0, targetDate - Date.now());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  daysEl.textContent = pad(days);
  hoursEl.textContent = pad(hours);
  minutesEl.textContent = pad(minutes);
  secondsEl.textContent = pad(seconds);
}

function initMentorStatsCounter() {
  const statsContainer = document.querySelector(".mentor-stats");
  const statValues = statsContainer?.querySelectorAll("strong") || [];
  let hasAnimated = false;

  if (!statValues.length) {
    return;
  }

  const numberFormatter = new Intl.NumberFormat("es-ES");

  function getStatParts(value) {
    const text = value.trim();
    const prefix = text.startsWith("+") ? "+" : "";
    const suffix = text.endsWith("%") ? "%" : "";
    const target = Number(text.replace(/[^\d]/g, ""));

    return { prefix, suffix, target };
  }

  function formatStatValue(value, { prefix, suffix, target }) {
    const formattedNumber = target >= 1000 ? numberFormatter.format(value) : String(value);
    return `${prefix}${formattedNumber}${suffix}`;
  }

  function animateValue(element) {
    if (element.dataset.counted === "true") {
      return;
    }

    const statParts = getStatParts(element.textContent);

    if (!statParts.target) {
      return;
    }

    element.dataset.counted = "true";
    const duration = 1400;
    const startTime = performance.now();

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(statParts.target * easedProgress);
      element.textContent = formatStatValue(currentValue, statParts);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        element.textContent = formatStatValue(statParts.target, statParts);
      }
    }

    element.textContent = formatStatValue(0, statParts);
    requestAnimationFrame(tick);
  }

  if (!("IntersectionObserver" in window)) {
    statValues.forEach(animateValue);
    return;
  }

  function runCountersOnce() {
    if (hasAnimated) {
      return;
    }

    hasAnimated = true;
    statValues.forEach(animateValue);
  }

  function isStatsInViewport() {
    const rect = statsContainer.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.top < viewportHeight * 0.9 && rect.bottom > viewportHeight * 0.08;
  }

  function checkStatsVisibility() {
    if (isStatsInViewport()) {
      runCountersOnce();
      window.removeEventListener("scroll", checkStatsVisibility);
      window.removeEventListener("resize", checkStatsVisibility);
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        runCountersOnce();
        observer.disconnect();
        window.removeEventListener("scroll", checkStatsVisibility);
        window.removeEventListener("resize", checkStatsVisibility);
      });
    },
    {
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.1,
    }
  );

  observer.observe(statsContainer);
  window.addEventListener("scroll", checkStatsVisibility, { passive: true });
  window.addEventListener("resize", checkStatsVisibility);
  checkStatsVisibility();
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

  form.addEventListener("submit", async (event) => {
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

    const now = new Date().toISOString();
    const utms = getUTMParams();
    const leadSession = saveLeadSession({
      leadId: getOrCreateLeadId(),
      email: emailValue,
      name: fields.name.value.trim(),
      utms,
      updatedAt: now,
    });
    const leadPayload = {
      leadId: leadSession.leadId,
      name: leadSession.name,
      email: leadSession.email,
      privacyAccepted: true,
      privacyAcceptedAt: now,
      sourcePage: getPageName(),
      funnelStage: "registered",
      createdAt: leadSession.createdAt,
      updatedAt: now,
      ...utms,
      referrer: document.referrer || "",
      landingUrl: window.location.origin + window.location.pathname,
      currentUrl: window.location.href,
      userAgent: navigator.userAgent,
    };

    await waitForTracking([
      sendLeadToN8N(leadPayload),
      sendFunnelEvent("lead_created", {
        funnelStage: "registered",
      }),
    ]);

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

function handleWhatsappClick() {
  const whatsappEntryButton = document.querySelector(".whatsapp-cta[href='confirmado.html']");

  if (!whatsappEntryButton) {
    return;
  }

  whatsappEntryButton.addEventListener("click", (event) => {
    event.preventDefault();
    sendFunnelEvent("clicked_whatsapp");
    window.location.href = whatsappEntryButton.href;
  });
}

function initCalendlyWidget(session) {
  if (getPageName() !== "agenda") {
    return;
  }

  const parentElement = document.getElementById("calendlyEmbed");

  if (!parentElement) {
    return;
  }

  function initWhenReady(attempt = 0) {
    if (parentElement.dataset.calendlyInitialized === "true") {
      return;
    }

    if (!window.Calendly?.initInlineWidget) {
      if (attempt >= 50) {
        console.warn("No se pudo inicializar el embed de Calendly.");
        return;
      }

      setTimeout(() => initWhenReady(attempt + 1), 100);
      return;
    }

    parentElement.dataset.calendlyInitialized = "true";
    window.Calendly.initInlineWidget({
      url: CALENDLY_URL,
      parentElement,
      prefill: {
        name: session?.name || "",
        email: session?.email || "",
      },
      utm: {
        utmSource: session?.utms?.utm_source || "",
        utmMedium: session?.utms?.utm_medium || "",
        utmCampaign: session?.utms?.utm_campaign || "",
        utmContent: session?.leadId || "",
      },
    });
  }

  initWhenReady();
}

function initCalendlyEmbed() {
  if (getPageName() !== "agenda") {
    return;
  }

  const { session } = getAgendaLeadSession();
  initCalendlyWidget(session);
}

function handleCalendlyBookingEvent() {
  if (getPageName() !== "agenda") {
    return;
  }

  window.addEventListener("message", (event) => {
    const isCalendlyEvent = event.origin === "https://calendly.com" && event.data?.event;

    if (!isCalendlyEvent || event.data.event !== "calendly.event_scheduled") {
      return;
    }

    const session = getAgendaLeadSession().session;
    const calendlyPayload = event.data.payload || {};
    const payload = {
      event: "calendly_booked",
      event_name: "calendly_booked",
      email: session?.email || "",
      leadId: session?.leadId || "",
      name: session?.name || "",
      timestamp: new Date().toISOString(),
      page: "agenda",
      currentUrl: window.location.href,
      source: "post_masterclass",
      funnelStage: "calendly_booked",
      funnel_stage: "calendly_booked",
      calendlyPayload,
      calendlyEventUri: calendlyPayload?.event?.uri || "",
      calendlyInviteeUri: calendlyPayload?.invitee?.uri || "",
    };

    if (!payload.email && !payload.leadId) {
      payload.trackingWarning = "missing_local_lead_session";
    }

    console.log("Calendly scheduled event detected", payload);
    postToWebhook(N8N_EVENT_WEBHOOK_URL, payload);
  });
}

if (daysEl && hoursEl && minutesEl && secondsEl) {
  updateTimer();
  setInterval(updateTimer, 1000);
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
initMentorStatsCounter();
initThanksCountdown();
handleWhatsappClick();
initCalendlyEmbed();
trackPageViewByPage();
handleCalendlyBookingEvent();
