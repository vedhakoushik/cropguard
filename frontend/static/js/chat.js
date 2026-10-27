const $ = id => document.getElementById(id);

const state = {
  sessionId: null,
  cropId: null,
  cropName: "",
  selState: "",
  district: "",
  language: localStorage.getItem("cg_lang") || "",
  imageFile: null,
  lastAnalysis: null,
  locationData: {},
  allCrops: [],
  sending: false,
};

const LOCAL_ANALYSIS_KEY = "cg_session_analysis";
const MOBILE = window.matchMedia("(max-width: 860px)");
const t = key => getTranslation(state.language || "English", key);

const ICONS = {
  leaf: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
  camera: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
  spot: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
};

/* ---------- Safe rendering ---------- */

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

marked.setOptions({ gfm: true, breaks: true });
DOMPurify.addHook("afterSanitizeAttributes", node => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

function md(text) {
  return DOMPurify.sanitize(marked.parse(String(text ?? "")));
}

/* ---------- Boot ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  if (!state.language) {
    showLangModal();
    showWelcome();
  } else {
    applyLang(state.language, false);
  }
  bindEvents();
  await Promise.all([loadCrops(), loadLocations(), loadSessions()]);
  updateSendState();
});

function showLangModal() { $("langOverlay").style.display = "flex"; }
function hideLangModal() { $("langOverlay").style.display = "none"; }

function applyLang(lang, hide = true) {
  state.language = lang;
  localStorage.setItem("cg_lang", lang);
  applyTranslations(lang);
  $("langLabel").textContent = lang;
  if (hide) hideLangModal();
  if (!state.sessionId) showWelcome();
  updateTopbarCtx();
}

/* ---------- Events ---------- */

function bindEvents() {
  document.querySelectorAll("#langOverlay [data-lang]").forEach(button => {
    button.addEventListener("click", () => applyLang(button.dataset.lang));
  });
  $("changeLangBtn").addEventListener("click", showLangModal);

  $("closeProduct").addEventListener("click", closeProduct);
  $("productOverlay").addEventListener("click", event => {
    if (event.target === $("productOverlay")) closeProduct();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeProduct();
      closeDrawer();
    }
  });

  $("newChatBtn").addEventListener("click", handleNewChat);
  $("clearAllBtn").addEventListener("click", handleClearAll);
  $("composer").addEventListener("submit", event => {
    event.preventDefault();
    handleSend();
  });
  $("imgUpload").addEventListener("change", handleImgSelect);
  $("removeImg").addEventListener("click", clearImg);
  $("closePanel").addEventListener("click", () => setPanelVisible(false));
  $("panelOpenBtn").addEventListener("click", () => setPanelVisible(true));
  $("panelShareBtn").addEventListener("click", shareWhatsApp);

  $("sidebarToggle").addEventListener("click", () => {
    if (MOBILE.matches) closeDrawer();
    else $("appContainer").classList.add("cg-app--collapsed");
  });
  $("sidebarOpen").addEventListener("click", () => {
    if (MOBILE.matches) $("appContainer").classList.add("cg-app--drawer");
    else $("appContainer").classList.remove("cg-app--collapsed");
  });
  $("sidebarScrim").addEventListener("click", closeDrawer);

  const input = $("msgInput");
  input.addEventListener("input", () => {
    autosize();
    updateSendState();
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      handleSend();
    }
  });

  $("cropSelect").addEventListener("change", event => {
    const option = event.target.options[event.target.selectedIndex];
    state.cropId = event.target.value || null;
    state.cropName = state.cropId ? option.text : "";
    $("cropPill").classList.toggle("cg-select--set", !!state.cropId);
    updateTopbarCtx();
  });

  $("stateSelect").addEventListener("change", event => {
    state.selState = event.target.value;
    state.district = "";
    const districtSelect = $("districtSelect");
    districtSelect.replaceChildren(new Option(t("districtPlaceholder") || "District", ""));
    (state.locationData[state.selState] || []).forEach(d => districtSelect.add(new Option(d, d)));
    districtSelect.disabled = !state.locationData[state.selState];
    $("locationHint").style.display = "none";
    $("locationPill").classList.remove("cg-select--set");
    updateTopbarCtx();
  });

  $("districtSelect").addEventListener("change", async event => {
    state.district = event.target.value;
    $("locationPill").classList.toggle("cg-select--set", !!state.district);
    updateTopbarCtx();
    if (state.district) await showLocationHint();
  });

  // Delegated actions for rendered content (no inline handlers).
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action } = target.dataset;
    if (action === "fill") fillMsg(target.dataset.text);
    else if (action === "upload") $("imgUpload").click();
    else if (action === "product") showProductPopup(state.lastAnalysis?.pesticides?.[Number(target.dataset.index)]);
    else if (action === "dashboard") setPanelVisible(true);
    else if (action === "share") shareWhatsApp();
    else if (action === "open-session") openSession(target.dataset.id);
    else if (action === "delete-session") deleteSession(target.dataset.id);
  });

  MOBILE.addEventListener("change", closeDrawer);
}

function closeDrawer() {
  $("appContainer").classList.remove("cg-app--drawer");
}

function autosize() {
  const input = $("msgInput");
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
}

function updateSendState() {
  const hasContent = $("msgInput").value.trim() || state.imageFile;
  $("sendBtn").disabled = state.sending || !hasContent;
}

function fillMsg(text) {
  const input = $("msgInput");
  input.value = text;
  autosize();
  updateSendState();
  input.focus();
}

function updateTopbarCtx() {
  const where = state.district ? `${state.district}, ${state.selState}` : "";
  const text = state.cropName && where ? `${state.cropName} in ${where}` : state.cropName || where;
  $("topbarCtx").textContent = text || t("selectCropAndDistrict") || "Select crop and district";
}

async function showLocationHint() {
  if (!state.selState || !state.district) return;
  const data = await api(`/api/analysis/location-crops?state=${encodeURIComponent(state.selState)}&district=${encodeURIComponent(state.district)}`);
  if (!data || !Object.keys(data).length) {
    $("locationHint").style.display = "none";
    return;
  }
  const top = Object.entries(data)
    .sort((a, b) => b[1].total_area_hectare - a[1].total_area_hectare)
    .slice(0, 4)
    .map(([crop, stats]) => `<strong>${esc(crop)}</strong> ${Math.round(stats.total_area_hectare).toLocaleString()} ha`)
    .join(", ");
  $("locationHintText").innerHTML = `Main crops in ${esc(state.district)}: ${top}`;
  $("locationHint").style.display = "flex";
}

/* ---------- Thread ---------- */

function scrollToBottom() {
  const scroller = $("messagesScroll");
  scroller.scrollTop = scroller.scrollHeight;
}

function showWelcome() {
  const starters = [
    { action: "upload", icon: ICONS.camera, label: t("uploadPhotoBtnText") },
    { action: "fill", icon: ICONS.leaf, label: t("yellowLeavesBtnText") },
    { action: "fill", icon: ICONS.spot, label: t("brownSpotsBtnText") },
    { action: "fill", icon: ICONS.spot, label: t("powderyGrowthBtnText") },
    { action: "fill", icon: ICONS.leaf, label: t("fruitDamageBtnText") },
  ];
  $("messages").innerHTML = `
    <section class="cg-welcome">
      <h1>${esc(t("welcomeTitle"))}</h1>
      <div class="cg-welcome__sub">${md(t("welcomeMsg"))}</div>
      <div class="cg-starters">
        ${starters.map(s => `
          <button type="button" class="cg-starter" data-action="${s.action}" data-text="${esc(s.label)}">
            ${s.icon}<span>${esc(s.label)}</span>
          </button>`).join("")}
      </div>
    </section>`;
}

function clearWelcome() {
  const welcome = $("messages").querySelector(".cg-welcome");
  if (welcome) welcome.remove();
}

function addUserMsg(text, imgUrl = null) {
  clearWelcome();
  const div = document.createElement("div");
  div.className = "cg-msg cg-msg--user";
  if (imgUrl) {
    const img = document.createElement("img");
    img.className = "cg-msg__img";
    img.src = imgUrl;
    img.alt = "Uploaded crop photo";
    div.appendChild(img);
  }
  if (text) {
    const bubble = document.createElement("div");
    bubble.className = "cg-bubble";
    bubble.textContent = text;
    div.appendChild(bubble);
  }
  $("messages").appendChild(div);
  scrollToBottom();
  return div;
}

function addAiMsg(html) {
  clearWelcome();
  const div = document.createElement("div");
  div.className = "cg-msg cg-msg--ai";
  div.innerHTML = `<div class="cg-msg__mark" aria-hidden="true">${ICONS.leaf}</div><div class="cg-msg__body">${html}</div>`;
  $("messages").appendChild(div);
  scrollToBottom();
  return div;
}

function addAiText(text) {
  return addAiMsg(`<div class="cg-md">${md(text)}</div>`);
}

function addTyping() {
  return addAiMsg('<div class="cg-typing" aria-label="CropGuard is thinking"><span></span><span></span><span></span></div>');
}

/* ---------- Sending ---------- */

async function handleSend() {
  const text = $("msgInput").value.trim();
  if (state.sending || (!text && !state.imageFile)) return;
  state.sending = true;
  $("msgInput").value = "";
  autosize();
  updateSendState();
  $("suggestionsBar").style.display = "none";
  try {
    if (!state.sessionId) await createSession();
    if (state.imageFile) await sendImage(text);
    else await sendText(text);
  } finally {
    state.sending = false;
    updateSendState();
    $("msgInput").focus();
  }
}

async function sendText(text) {
  addUserMsg(text);
  const typing = addTyping();
  const res = await api(`/api/chat/sessions/${encodeURIComponent(state.sessionId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ message: text, context: buildCtx() }),
  });
  typing.remove();
  addAiText(res?.ai_reply || t("somethingWrong"));
  showSuggestions(state.lastAnalysis?.pest_type);
}

async function sendImage(caption) {
  const file = state.imageFile;
  addUserMsg(caption, URL.createObjectURL(file));
  clearImg();
  const typing = addTyping();
  const form = new FormData();
  form.append("image", file);
  form.append("crop_name", state.cropName || "Unknown");
  form.append("session_id", state.sessionId || "");
  form.append("state", state.selState);
  form.append("district", state.district);
  form.append("language", state.language || "English");
  if (state.cropId) form.append("crop_id", state.cropId);

  const res = await api("/api/analysis/analyze", { method: "POST", body: form, isForm: true });
  typing.remove();
  if (res?.result) {
    state.lastAnalysis = res.result;
    persistSessionAnalysis(state.sessionId, res.result);
    renderAnalysisMsg(res.result);
    renderPanel(res.result);
    updateRiskBadge(res.result.severity);
    showSuggestions(res.result.pest_type);
  } else {
    addAiText(t("notAnalyzedMsg"));
  }
}

function buildCtx() {
  return {
    crop_name: state.cropName,
    pest_name: state.lastAnalysis?.pest_detected || "",
    location: state.selState,
    district: state.district,
    language: state.language,
  };
}

function getSuggestions(type) {
  const map = {
    default: ["howMuchToSpray", "spreadToOtherCrops", "organicAlternative", "bestTimeToApply"],
    insect: ["naturalPredators", "harvestSafe", "preventionNextSeason", "dosagePerAcre"],
    fungus: ["rainWorsening", "sellCrop", "disposePlants", "sprayTime"],
    virus: ["removeInfected", "spreadByTouch", "protectHealthy", "isThereCure"],
  };
  return (map[type] || map.default).map(t);
}

function showSuggestions(type) {
  $("suggestionChips").innerHTML = getSuggestions(type)
    .map(s => `<button type="button" class="cg-chip" data-action="fill" data-text="${esc(s)}">${esc(s)}</button>`)
    .join("");
  $("suggestionsBar").style.display = "block";
}

/* ---------- Analysis rendering ---------- */

const SEVERITIES = ["low", "moderate", "high", "critical"];
const sevOf = result => (SEVERITIES.includes(result?.severity?.toLowerCase()) ? result.severity.toLowerCase() : "low");

function doseList(result) {
  const items = (result.pesticides || []).map((p, i) => `
    <button type="button" class="cg-dose__item" data-action="product" data-index="${i}">
      <span><strong>${esc(p.brand || p.name)}</strong></span>
      <span>${esc(p.dosage || "")}</span>
    </button>`).join("");
  return items ? `<div class="cg-dose">${items}</div>` : `<span class="cg-muted">No pesticide needed</span>`;
}

function renderAnalysisMsg(result) {
  const sev = sevOf(result);
  const rows = [
    ["Cause", result.causes],
    ["Location", result.location_insight],
    ["Organic", result.organic_alternative],
    ["Urgency", result.urgency],
  ].filter(([, v]) => v)
    .map(([k, v]) => `<div class="cg-diag__row"><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
    .join("");

  addAiMsg(`
    <article class="cg-diag cg-diag--${sev}">
      <div class="cg-diag__strip"></div>
      <header class="cg-diag__head">
        <div>
          <h3 class="cg-diag__name">${esc(result.pest_detected || "Unknown")}</h3>
          ${result.scientific_name ? `<span class="cg-diag__sci">${esc(result.scientific_name)}</span>` : ""}
        </div>
        <div class="cg-diag__meta">
          <strong class="cg-sev--${sev}">${esc(sev[0].toUpperCase() + sev.slice(1))}</strong>
          ${result.confidence ? `${esc(result.confidence)}% match` : ""}
        </div>
      </header>
      <dl class="cg-diag__rows">
        ${rows}
        <div class="cg-diag__row"><dt>Treatment</dt><dd>${doseList(result)}</dd></div>
      </dl>
      <div class="cg-diag__actions">
        <button type="button" class="cg-btn cg-btn--primary" data-action="dashboard">Open dashboard</button>
        <button type="button" class="cg-btn" data-action="share">Share on WhatsApp</button>
      </div>
    </article>`);
}

function renderPanel(result) {
  const sev = sevOf(result);
  const rawTips = result.prevention_tips;
  const tips = (Array.isArray(rawTips) ? rawTips.map(String) : String(rawTips || "").split(/\n|•/))
    .map(s => s.replace(/^[-*\s]+/, "").trim())
    .filter(Boolean);
  const section = (title, body) => body ? `<section class="cg-panel__section"><h3>${title}</h3>${body}</section>` : "";
  const para = v => v ? `<p>${esc(v)}</p>` : "";

  $("panelContent").innerHTML = `
    <div class="cg-panel__hero">
      <div>
        <h3 class="cg-diag__name">${esc(result.pest_detected || "Unknown")}</h3>
        ${result.scientific_name ? `<span class="cg-diag__sci">${esc(result.scientific_name)}</span>` : ""}
      </div>
    </div>
    <dl class="cg-facts">
      <div><dt>Severity</dt><dd class="cg-sev--${sev}">${esc(sev[0].toUpperCase() + sev.slice(1))}</dd></div>
      ${result.confidence ? `<div><dt>Match</dt><dd>${esc(result.confidence)}%</dd></div>` : ""}
      <div><dt>Spread</dt><dd>${sev === "high" || sev === "critical" ? "Active" : "Contained"}</dd></div>
      ${result.pest_type ? `<div><dt>Type</dt><dd>${esc(result.pest_type)}</dd></div>` : ""}
    </dl>
    ${section("Cause", para(result.causes))}
    ${section("Location insight", para(result.location_insight))}
    ${section("Nearby risk", para(result.nearby_risk))}
    ${section("Treatment", doseList(result))}
    ${section("Organic option", para(result.organic_alternative))}
    ${section("Urgency", para(result.urgency))}
    ${section("Prevention", tips.length ? `<ul class="cg-tips">${tips.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "")}
    ${section("Government support", para(result.government_support))}`;

  setPanelVisible(true);
}

function setPanelVisible(visible) {
  $("analysisPanel").style.display = visible ? "flex" : "none";
  $("appContainer").classList.toggle("cg-app--panel", visible);
  $("panelOpenBtn").style.display = !visible && state.lastAnalysis ? "inline-grid" : "none";
}

function updateRiskBadge(severity) {
  const badge = $("riskBadge");
  if (!severity) {
    badge.style.display = "none";
    return;
  }
  const sev = sevOf({ severity });
  const labels = { low: "Low risk", moderate: "Moderate risk", high: "High risk", critical: "Critical risk" };
  badge.textContent = labels[sev];
  badge.className = `cg-risk cg-risk--${sev}`;
  badge.style.display = "inline-flex";
}

/* ---------- Product modal + share ---------- */

function showProductPopup(product) {
  if (!product) return;
  const name = product.brand || product.name || "";
  const q = encodeURIComponent(`${name} pesticide`);
  const shopQ = encodeURIComponent(name);
  const row = (k, v) => `<div class="cg-product__row"><dt>${k}</dt><dd>${esc(v)}</dd></div>`;
  $("productContent").innerHTML = `
    <div class="cg-product">
      <h3>${esc(product.name)}</h3>
      ${product.brand ? `<p class="cg-muted">${esc(product.brand)}</p>` : ""}
      <dl>
        ${row("Dosage", product.dosage || "–")}
        ${row("Apply", product.application || "Foliar spray")}
        ${row("Safe to harvest after", `${product.safety_days || 14} days`)}
      </dl>
      <p class="cg-muted">Available at local AP agri shops and KVK centres.</p>
      <div class="cg-product__links">
        <a class="cg-btn" target="_blank" rel="noopener noreferrer" href="https://www.amazon.in/s?k=${q}">Amazon</a>
        <a class="cg-btn" target="_blank" rel="noopener noreferrer" href="https://www.flipkart.com/search?q=${q}">Flipkart</a>
        <a class="cg-btn" target="_blank" rel="noopener noreferrer" href="https://agribegri.com/?s=${shopQ}">AgriBegri</a>
      </div>
    </div>`;
  $("productOverlay").style.display = "flex";
}

function closeProduct() {
  $("productOverlay").style.display = "none";
}

function shareWhatsApp() {
  const r = state.lastAnalysis;
  if (!r) return;
  const text = encodeURIComponent(
    `CropGuard AI\nPest: ${r.pest_detected}\nSeverity: ${(r.severity || "").toUpperCase()}\n` +
    `Location: ${r.district_used || state.district || "AP"}\nCause: ${r.causes || ""}\n` +
    `Treatment: ${r.pesticides?.[0]?.brand || ""} ${r.pesticides?.[0]?.dosage || ""}`
  );
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
}

/* ---------- Image attach ---------- */

function handleImgSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    alert("Photo is larger than 10 MB. Choose a smaller photo.");
    clearImg();
    return;
  }
  state.imageFile = file;
  $("previewImg").src = URL.createObjectURL(file);
  $("imgPreview").style.display = "block";
  updateSendState();
  $("msgInput").focus();
}

function clearImg() {
  state.imageFile = null;
  $("imgUpload").value = "";
  $("imgPreview").style.display = "none";
  $("previewImg").removeAttribute("src");
  updateSendState();
}

/* ---------- Sessions ---------- */

function resetConversation() {
  state.sessionId = null;
  state.lastAnalysis = null;
  clearImg();
  setPanelVisible(false);
  $("suggestionsBar").style.display = "none";
  updateRiskBadge(null);
  showWelcome();
}

async function handleNewChat() {
  resetConversation();
  closeDrawer();
  await loadSessions();
  $("msgInput").focus();
}

async function deleteSession(id) {
  if (!confirm(t("deleteConfirm"))) return;
  await api(`/api/chat/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (state.sessionId === id) resetConversation();
  loadSessions();
}

async function handleClearAll() {
  if (!confirm(t("deleteAllConfirm"))) return;
  const sessions = await api("/api/chat/sessions");
  if (sessions?.length) {
    await Promise.all(sessions.map(s => api(`/api/chat/sessions/${encodeURIComponent(s.id)}`, { method: "DELETE" })));
  }
  resetConversation();
  loadSessions();
}

async function createSession() {
  const parts = [state.cropName, state.district].filter(Boolean);
  const res = await api("/api/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ title: parts.join(" / ") || "New analysis", crop_id: state.cropId || null }),
  });
  if (res?.id) {
    state.sessionId = res.id;
    loadSessions();
  }
}

async function loadSessions() {
  const sessions = await api("/api/chat/sessions");
  const list = $("sessionsList");
  if (!sessions?.length) {
    list.innerHTML = `<div class="cg-sessions__empty">${esc(t("emptyMsg") || "No analyses yet")}</div>`;
    return;
  }
  list.innerHTML = sessions.slice(0, 30).map(s => `
    <div class="cg-session ${s.id === state.sessionId ? "cg-session--active" : ""}">
      <button type="button" class="cg-session__open" data-action="open-session" data-id="${esc(s.id)}">${esc(s.session_title || "Chat")}</button>
      <button type="button" class="cg-icon-btn cg-session__del" data-action="delete-session" data-id="${esc(s.id)}" aria-label="Delete analysis">${ICONS.trash}</button>
    </div>`).join("");
}

async function openSession(id) {
  closeDrawer();
  state.sessionId = id;
  state.lastAnalysis = null;
  $("messages").innerHTML = "";
  $("suggestionsBar").style.display = "none";
  setPanelVisible(false);
  const messages = await api(`/api/chat/sessions/${encodeURIComponent(id)}/messages`);
  (messages || []).forEach(m => (m.role === "user" ? addUserMsg(m.content) : addAiText(m.content)));
  if (!messages?.length) showWelcome();
  const latest = await loadLatestAnalysis(id);
  if (latest) {
    state.lastAnalysis = latest;
    renderPanel(latest);
    updateRiskBadge(latest.severity);
    showSuggestions(latest.pest_type);
  } else {
    updateRiskBadge(null);
  }
  loadSessions();
}

/* ---------- Data ---------- */

async function loadCrops() {
  const crops = await api("/api/chat/crops");
  if (!crops) return;
  state.allCrops = crops;
  const select = $("cropSelect");
  crops.forEach(c => select.add(new Option(c.name, c.id)));
}

async function loadLocations() {
  const data = await api("/api/analysis/locations");
  if (!data) return;
  state.locationData = data;
  const select = $("stateSelect");
  Object.keys(data).sort().forEach(name => select.add(new Option(name, name)));
}

async function api(url, opts = {}) {
  const { isForm, ...rest } = opts;
  try {
    const res = await fetch(url, {
      ...rest,
      headers: isForm ? {} : { "Content-Type": "application/json", ...(rest.headers || {}) },
    });
    if (res.status === 204) return {};
    const data = await res.json();
    return res.ok ? data : null;
  } catch (error) {
    return null;
  }
}

async function loadLatestAnalysis(sessionId) {
  const backend = await api(`/api/chat/sessions/${encodeURIComponent(sessionId)}/analysis`);
  if (backend && Object.keys(backend).length) {
    persistSessionAnalysis(sessionId, backend);
    return backend;
  }
  return getPersistedSessionAnalysis(sessionId);
}

function persistSessionAnalysis(sessionId, result) {
  if (!sessionId || !result) return;
  try {
    const all = readPersistedAnalyses();
    all[sessionId] = result;
    localStorage.setItem(LOCAL_ANALYSIS_KEY, JSON.stringify(all));
  } catch (error) {
    // Storage full or blocked: the backend copy is the source of truth.
  }
}

function getPersistedSessionAnalysis(sessionId) {
  return readPersistedAnalyses()[sessionId] || null;
}

function readPersistedAnalyses() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ANALYSIS_KEY) || "{}");
  } catch (error) {
    return {};
  }
}
