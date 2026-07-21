const $ = id => document.getElementById(id);
const el = t => document.createElement(t);

let state = {
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
};

const LOCAL_ANALYSIS_KEY = "cg_session_analysis";

function getSuggestions(type) {
  const trans = key => getTranslation(state.language || "English", key);
  const suggestionMap = {
    default: [
      trans("howMuchToSpray"),
      trans("spreadToOtherCrops"),
      trans("organicAlternative"),
      trans("bestTimeToApply")
    ],
    insect: [
      trans("naturalPredators"),
      trans("harvestSafe"),
      trans("preventionNextSeason"),
      trans("dosagePerAcre")
    ],
    fungus: [
      trans("rainWorsening"),
      trans("sellCrop"),
      trans("disposePlants"),
      trans("sprayTime")
    ],
    virus: [
      trans("removeInfected"),
      trans("spreadByTouch"),
      trans("protectHealthy"),
      trans("isThereCure")
    ]
  };
  return suggestionMap[type] || suggestionMap.default;
}

const SUGGESTIONS = {
  default: ["How much to spray per acre?", "Can it spread to other crops?", "Organic alternative?", "Best time to apply?"],
  insect: ["Natural predators available?", "Is harvest safe?", "Next season prevention?", "Dosage for 1 acre?"],
  fungus: ["Will rain make it worse?", "Can I still sell the crop?", "How to dispose affected plants?", "Best spray time?"],
  virus: ["Remove infected plants?", "Can it spread by touch?", "Protect healthy plants?", "Is there a cure?"],
};

document.addEventListener("DOMContentLoaded", async () => {
  if (!state.language) {
    showLangModal();
    showWelcome();
  } else {
    applyLang(state.language, false);
  }
  await Promise.all([loadCrops(), loadLocations(), loadSessions()]);
  bindEvents();
  syncPanelLayout();
});

function showLangModal() { $("langOverlay").style.display = "flex"; }
function hideLangModal() { $("langOverlay").style.display = "none"; }

function applyLang(lang, hide = true) {
  state.language = lang;
  localStorage.setItem("cg_lang", lang);
  const lbl = $("langLabel");
  if (lbl) lbl.textContent = lang;
  applyTranslations(lang);
  if (hide) hideLangModal();
  // Refresh welcome message if no session active
  if (!state.sessionId) {
    showWelcome();
  }
}

document.querySelectorAll(".lang-btn").forEach(button => {
  button.addEventListener("click", () => applyLang(button.dataset.lang));
});

$("changeLangBtn").addEventListener("click", showLangModal);

function showProductPopup(product) {
  const query = encodeURIComponent((product.brand || product.name) + " pesticide");
  $("productContent").innerHTML = `
    <div class="prod-header">
      <span class="prod-icon">PR</span>
      <div>
        <h3>${product.name}</h3>
        ${product.brand ? `<p class="prod-brand">${product.brand}</p>` : ""}
      </div>
    </div>
    <div class="prod-info">
      <div class="prod-row"><span>Dosage</span><strong>${product.dosage || "-"}</strong></div>
      <div class="prod-row"><span>Apply</span><strong>${product.application || "Foliar spray"}</strong></div>
      <div class="prod-row"><span>Safe after</span><strong>${product.safety_days || 14} days</strong></div>
    </div>
    <p class="prod-avail">Available at local AP agri shops and KVK centers</p>
    <div class="prod-links">
      <a href="https://www.amazon.in/s?k=${query}" target="_blank" class="prod-link">Amazon</a>
      <a href="https://www.flipkart.com/search?q=${query}" target="_blank" class="prod-link">Flipkart</a>
      <a href="https://agribegri.com/?s=${encodeURIComponent(product.brand || product.name)}" target="_blank" class="prod-link prod-agri">AgriShop</a>
      <a href="https://krishiseva.com/search?q=${encodeURIComponent(product.brand || product.name)}" target="_blank" class="prod-link prod-agri">KrishiSeva</a>
    </div>`;
  $("productOverlay").style.display = "flex";
}

$("closeProduct").addEventListener("click", () => $("productOverlay").style.display = "none");
$("productOverlay").addEventListener("click", event => {
  if (event.target === $("productOverlay")) $("productOverlay").style.display = "none";
});

window.showProductPopup = showProductPopup;

function bindEvents() {
  $("newChatBtn").addEventListener("click", handleNewChat);
  $("clearAllBtn").addEventListener("click", handleClearAll);
  $("sendBtn").addEventListener("click", handleSend);
  $("imgUpload").addEventListener("change", handleImgSelect);
  $("removeImg").addEventListener("click", clearImg);
  $("closePanel").addEventListener("click", () => {
    $("analysisPanel").style.display = "none";
    syncPanelLayout();
  });
  $("panelShareBtn").addEventListener("click", shareWhatsApp);

  $("sidebarToggle").addEventListener("click", () => {
    const sidebar = $("sidebar");
    const app = $("appContainer");
    const isCollapsed = sidebar.classList.contains("collapsed");
    if (isCollapsed) {
      sidebar.classList.remove("collapsed");
      app.classList.remove("app--sidebar-collapsed");
      $("sidebarToggle").textContent = "<";
      $("sidebarOpen").style.display = "none";
    } else {
      sidebar.classList.add("collapsed");
      app.classList.add("app--sidebar-collapsed");
      $("sidebarToggle").textContent = ">";
      $("sidebarOpen").style.display = "flex";
    }
    // Trigger resize recalculation
    setTimeout(() => syncPanelLayout(), 100);
    window.dispatchEvent(new Event('resize'));
  });

  $("sidebarOpen").addEventListener("click", () => {
    const sidebar = $("sidebar");
    const app = $("appContainer");
    sidebar.classList.remove("collapsed");
    app.classList.remove("app--sidebar-collapsed");
    $("sidebarToggle").textContent = "<";
    $("sidebarOpen").style.display = "none";
    // Trigger resize recalculation
    setTimeout(() => syncPanelLayout(), 100);
    window.dispatchEvent(new Event('resize'));
  });

  $("cropSelect").addEventListener("change", event => {
    const option = event.target.options[event.target.selectedIndex];
    state.cropId = event.target.value || null;
    state.cropName = state.cropId ? option.text : "";
    $("cropPill").classList.toggle("topbar-pill--set", !!state.cropId);
    updateTopbarCtx();
  });

  $("stateSelect").addEventListener("change", event => {
    state.selState = event.target.value;
    state.district = "";
    const districtSelect = $("districtSelect");
    districtSelect.innerHTML = '<option value="">District</option>';
    districtSelect.disabled = true;

    if (state.selState && state.locationData[state.selState]) {
      state.locationData[state.selState].forEach(district => {
        const option = el("option");
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
      });
      districtSelect.disabled = false;
    }

    $("locationHint").style.display = "none";
    $("locationPill").classList.remove("topbar-pill--set");
    updateTopbarCtx();
  });

  $("districtSelect").addEventListener("change", async event => {
    state.district = event.target.value;
    $("locationPill").classList.toggle("topbar-pill--set", !!state.district);
    updateTopbarCtx();
    if (state.district) await showLocationHint();
  });

  $("msgInput").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  });
}

function updateTopbarCtx() {
  const parts = [];
  if (state.cropName) parts.push(state.cropName);
  if (state.district) parts.push(`${state.district}, AP`);
  const ctx = $("topbarCtx");
  if (ctx) ctx.textContent = parts.join(" / ") || "Select crop and district";
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
    .slice(0, 4);
  const crops = top
    .map(([crop, stats]) => `<strong>${crop}</strong> ${Math.round(stats.total_area_hectare).toLocaleString()} ha`)
    .join(" / ");
  $("locationHintText").innerHTML = `${state.district}: ${crops}`;
  $("locationHint").style.display = "flex";
}

function showWelcome() {
  $("messages").innerHTML = "";
  const trans = key => getTranslation(state.language || "English", key);
  addMsg("ai", `${trans("welcomeMsg")}
<div class="quick-actions">
  <button onclick="document.getElementById('imgUpload').click()" class="qa-btn">${trans("uploadPhotoBtnText")}</button>
  <button onclick="fillMsg('My crop leaves are turning yellow')" class="qa-btn">${trans("yellowLeavesBtnText")}</button>
  <button onclick="fillMsg('I see holes in the fruit')" class="qa-btn">${trans("fruitDamageBtnText")}</button>
  <button onclick="fillMsg('White powder on leaves')" class="qa-btn">${trans("powderyGrowthBtnText")}</button>
  <button onclick="fillMsg('Brown spots spreading on leaves')" class="qa-btn">${trans("brownSpotsBtnText")}</button>
</div>`);
}

async function handleNewChat() {
  state.sessionId = null;
  state.lastAnalysis = null;
  clearImg();
  $("messages").innerHTML = "";
  $("analysisPanel").style.display = "none";
  syncPanelLayout();
  $("suggestionsBar").style.display = "none";
  $("riskBadge").style.display = "none";
  showWelcome();
  await createSession();
  loadSessions();
}

async function deleteSession(id, event) {
  event.stopPropagation();
  const trans = key => getTranslation(state.language || "English", key);
  if (!confirm(trans("deleteConfirm"))) return;
  await api(`/api/chat/sessions/${id}`, { method: "DELETE" });
  if (state.sessionId === id) {
    state.sessionId = null;
    state.lastAnalysis = null;
    $("messages").innerHTML = "";
    $("analysisPanel").style.display = "none";
    syncPanelLayout();
    $("suggestionsBar").style.display = "none";
    $("riskBadge").style.display = "none";
    showWelcome();
  }
  loadSessions();
}

window.deleteSession = deleteSession;

async function handleClearAll() {
  const trans = key => getTranslation(state.language || "English", key);
  if (!confirm(trans("deleteAllConfirm"))) return;
  const sessions = await api("/api/chat/sessions");
  if (sessions?.length) {
    await Promise.all(sessions.map(session => api(`/api/chat/sessions/${session.id}`, { method: "DELETE" })));
  }
  state.sessionId = null;
  state.lastAnalysis = null;
  $("messages").innerHTML = "";
  $("analysisPanel").style.display = "none";
  syncPanelLayout();
  $("suggestionsBar").style.display = "none";
  $("riskBadge").style.display = "none";
  showWelcome();
  loadSessions();
}

async function handleSend() {
  const text = $("msgInput").value.trim();
  if (!text && !state.imageFile) return;
  $("msgInput").value = "";
  $("sendBtn").disabled = true;
  $("suggestionsBar").style.display = "none";
  if (!state.sessionId) await createSession();
  if (state.imageFile) await sendImage(text);
  else await sendText(text);
  $("sendBtn").disabled = false;
}

async function sendText(text) {
  addMsg("user", text);
  const trans = key => getTranslation(state.language || "English", key);
  const typing = addTyping();
  const res = await api(`/api/chat/sessions/${state.sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message: text, context: buildCtx() }),
  });
  typing.remove();
  addMsg("ai", res?.ai_reply || trans("somethingWrong"));
  if (state.lastAnalysis) {
    renderPanel(state.lastAnalysis);
  }
  showSuggestions();
}

async function sendImage(caption) {
  const file = state.imageFile;
  const trans = key => getTranslation(state.language || "English", key);
  addMsg("user", caption || trans("analyzeImageBtnText"), URL.createObjectURL(file));
  clearImg();
  const typing = addTyping();
  const form = new FormData();
  form.append("image", file);
  form.append("crop_name", state.cropName || "Unknown");
  form.append("session_id", state.sessionId);
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
    addMsg("ai", trans("notAnalyzedMsg"));
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

function showSuggestions(type) {
  const list = getSuggestions(type);
  $("suggestionChips").innerHTML = list
    .map(suggestion => `<button class="sug-chip" onclick="fillMsg('${suggestion}')">${suggestion}</button>`)
    .join("");
  $("suggestionsBar").style.display = "flex";
}

function fillMsg(text) {
  $("msgInput").value = text;
  $("msgInput").focus();
}

window.fillMsg = fillMsg;

function addMsg(role, text, imgUrl = null) {
  const wrap = $("messages");
  const div = el("div");
  div.className = `msg msg--${role === "user" ? "user" : "ai"}`;

  const av = el("div");
  av.className = "msg__av";
  av.innerHTML = role === "user"
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
    : "AI";

  const body = el("div");
  body.className = "msg__body";

  if (imgUrl) {
    const img = el("img");
    img.className = "msg__img";
    img.src = imgUrl;
    body.appendChild(img);
  }

  const content = el("div");
  content.innerHTML = fmt(text);
  body.appendChild(content);

  div.appendChild(av);
  div.appendChild(body);
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

function addTyping() {
  const wrap = $("messages");
  const div = el("div");
  div.className = "msg msg--ai";
  div.innerHTML = `<div class="msg__av">AI</div><div class="msg__body typing-dots"><span></span><span></span><span></span></div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

function renderAnalysisMsg(result) {
  const pests = (result.pesticides || []).slice(0, 3).map(product =>
    `<button class="pesticide-pill" onclick='showProductPopup(${JSON.stringify(product).replace(/'/g, "&#39;")})'>
      <strong>${product.brand || product.name}</strong> - ${product.dosage}
    </button>`
  ).join("") || `<span class="no-pest">No pesticide needed</span>`;

  addMsg("ai", `
    <div class="result-stream">
      <div class="result-stream__header">
        <span class="result-stream__kicker">Analysis summary</span>
        <span class="conf-pill">${result.confidence || "?"}% match</span>
      </div>
      <div class="result-stream__title">
        <span class="pest-icon">${getPestIcon(result.pest_type)}</span>
        <div>
          <strong>${result.pest_detected || "Unknown"}</strong>
          <small>${result.scientific_name || ""}</small>
        </div>
      </div>
      <div class="result-line">
        <span class="result-line__label">Cause</span>
        <span class="result-line__value">${result.causes || "-"}</span>
      </div>
      ${result.location_insight ? `
      <div class="result-line">
        <span class="result-line__label">Location</span>
        <span class="result-line__value">${result.location_insight}</span>
      </div>` : ""}
      <div class="result-line">
        <span class="result-line__label">Treatment</span>
        <div class="result-line__stack">${pests}</div>
      </div>
      ${result.organic_alternative ? `
      <div class="result-line">
        <span class="result-line__label">Organic</span>
        <span class="result-line__value">${result.organic_alternative}</span>
      </div>` : ""}
      ${result.urgency ? `
      <div class="result-line">
        <span class="result-line__label">Urgency</span>
        <span class="result-line__value">${result.urgency}</span>
      </div>` : ""}
      <div class="result-stream__actions">
        <button class="r-detail-btn" onclick="document.getElementById('analysisPanel').style.display='flex'">Open dashboard</button>
        <button class="r-share-btn" onclick="shareWhatsApp()">Share</button>
      </div>
    </div>`);
}

function getPestIcon(type) {
  return {
    insect: "IN",
    fungus: "FG",
    bacteria: "BC",
    virus: "VR",
    nematode: "NM",
    none: "OK",
  }[type] || "AI";
}

function renderPanel(result) {
  const sevClass = result.severity?.toLowerCase() || "low";
  const pests = (result.pesticides || []).map(product => `
    <button class="panel-pest" onclick='showProductPopup(${JSON.stringify(product).replace(/'/g, "&#39;")})'>
      <span class="panel-pest__name">${product.brand || product.name}</span>
      <span class="panel-pest__meta">${product.dosage} / Wait ${product.safety_days || 14} days</span>
    </button>`).join("") || "<p class='panel-inline-note'>No pesticide needed</p>";

  const prevention = (result.prevention_tips || "")
    .split(/\n|•/)
    .filter(Boolean)
    .map(text => `<li>${text.trim()}</li>`)
    .join("") || "<li>General crop hygiene</li>";

  $("panelContent").innerHTML = `
    <div class="panel-sheet">
      <div class="panel-sheet__hero">
        <div>
          <div class="panel-sheet__kicker">Analysis dashboard</div>
          <div class="panel-sheet__title">${result.pest_detected || "Unknown"} ${result.scientific_name ? `<em>${result.scientific_name}</em>` : ""}</div>
        </div>
        <div class="panel-sheet__score">${result.confidence || "?"}%</div>
      </div>

      <div class="panel-divider"></div>

      <div class="panel-line">
        <span class="panel-line__label">Severity</span>
        <span class="panel-line__value sev-${sevClass}">${(result.severity || "").toUpperCase()}</span>
      </div>
      <div class="panel-line">
        <span class="panel-line__label">Spread</span>
        <span class="panel-line__value">${result.severity === "critical" || result.severity === "high" ? "Active" : "Contained"}</span>
      </div>
      <div class="panel-line">
        <span class="panel-line__label">Cause</span>
        <span class="panel-line__value">${result.causes || "-"}</span>
      </div>
      ${result.location_insight ? `
      <div class="panel-line">
        <span class="panel-line__label">Location insight</span>
        <span class="panel-line__value">${result.location_insight}</span>
      </div>` : ""}
      ${result.nearby_risk ? `
      <div class="panel-line">
        <span class="panel-line__label">Nearby risk</span>
        <span class="panel-line__value">${result.nearby_risk}</span>
      </div>` : ""}

      <div class="panel-divider"></div>

      <div class="panel-inline-group">
        <div class="panel-inline-group__label">Treatment protocol</div>
        <div class="panel-inline-group__content">${pests}</div>
      </div>
      ${result.organic_alternative ? `
      <div class="panel-line">
        <span class="panel-line__label">Organic option</span>
        <span class="panel-line__value">${result.organic_alternative}</span>
      </div>` : ""}
      ${result.urgency ? `
      <div class="panel-line">
        <span class="panel-line__label">Urgency</span>
        <span class="panel-line__value">${result.urgency}</span>
      </div>` : ""}

      <div class="panel-divider"></div>

      <div class="panel-inline-group">
        <div class="panel-inline-group__label">Prevention</div>
        <ul class="prev-list">${prevention}</ul>
      </div>

      ${result.government_support ? `
      <div class="panel-divider"></div>
      <div class="panel-line">
        <span class="panel-line__label">Govt support</span>
        <span class="panel-line__value">${result.government_support}</span>
      </div>` : ""}

      <div class="panel-divider"></div>

      <div class="panel-sheet__actions">
        <button class="find-dealers-btn" onclick="shareWhatsApp()">Share analysis</button>
      </div>
    </div>`;

  $("analysisPanel").style.display = "flex";
  syncPanelLayout();
  // Scroll panel into view smoothly
  setTimeout(() => {
    $("analysisPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 50);
}

function updateRiskBadge(severity) {
  const badge = $("riskBadge");
  if (!severity) {
    badge.style.display = "none";
    return;
  }
  const labels = { low: "LOW RISK", moderate: "MODERATE", high: "HIGH RISK", critical: "RISK ALERT" };
  badge.textContent = labels[severity] || severity.toUpperCase();
  badge.className = `risk-badge risk-${severity}`;
  badge.style.display = "inline-flex";
}

function shareWhatsApp() {
  if (!state.lastAnalysis) return;
  const result = state.lastAnalysis;
  const text = encodeURIComponent(
    `CropGuard AI\nPest: ${result.pest_detected}\nSeverity: ${(result.severity || "").toUpperCase()}\n` +
    `Location: ${result.district_used || "AP"}\nCause: ${result.causes || ""}\n` +
    `Treatment: ${result.pesticides?.[0]?.brand || ""} ${result.pesticides?.[0]?.dosage || ""}`
  );
  window.open(`https://wa.me/?text=${text}`, "_blank");
}

window.shareWhatsApp = shareWhatsApp;

function handleImgSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    alert("Max 10MB");
    return;
  }
  state.imageFile = file;
  const reader = new FileReader();
  reader.onload = loadEvent => {
    $("previewImg").src = loadEvent.target.result;
    $("imgPreview").style.display = "block";
  };
  reader.readAsDataURL(file);
}

function clearImg() {
  state.imageFile = null;
  $("imgUpload").value = "";
  $("imgPreview").style.display = "none";
  $("previewImg").src = "";
}

async function createSession() {
  const parts = [state.cropName, state.district].filter(Boolean);
  const res = await api("/api/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ title: parts.join(" / ") || "New Chat", crop_id: state.cropId || null }),
  });
  if (res) {
    state.sessionId = res.id;
    loadSessions();
  }
}

async function loadSessions() {
  const sessions = await api("/api/chat/sessions");
  const list = $("sessionsList");
  if (!sessions?.length) {
    list.innerHTML = '<div class="empty-msg">No analyses yet</div>';
    return;
  }
  list.innerHTML = sessions.slice(0, 15).map(session => `
    <div class="sess-item ${session.id === state.sessionId ? "active" : ""}" onclick="openSession('${session.id}')">
      <div class="sess-icon">S</div>
      <span class="sess-title">${esc(session.session_title || "Chat")}</span>
      <button class="sess-del" onclick="deleteSession('${session.id}',event)">X</button>
    </div>`).join("");
}

async function openSession(id) {
  state.sessionId = id;
  state.lastAnalysis = null;
  $("messages").innerHTML = "";
  $("suggestionsBar").style.display = "none";
  $("analysisPanel").style.display = "none";
  syncPanelLayout();
  const messages = await api(`/api/chat/sessions/${id}/messages`);
  if (messages) messages.forEach(message => addMsg(message.role === "user" ? "user" : "ai", message.content));
  const latestAnalysis = await loadLatestAnalysis(id);
  if (latestAnalysis) {
    state.lastAnalysis = latestAnalysis;
    renderPanel(latestAnalysis);
    updateRiskBadge(latestAnalysis.severity);
    showSuggestions(latestAnalysis.pest_type);
  } else {
    updateRiskBadge(null);
  }
  loadSessions();
}

window.openSession = openSession;

async function loadCrops() {
  const crops = await api("/api/chat/crops");
  if (!crops) return;
  state.allCrops = crops;
  const select = $("cropSelect");
  crops.forEach(crop => {
    const option = el("option");
    option.value = crop.id;
    option.textContent = crop.name;
    select.appendChild(option);
  });
}

async function loadLocations() {
  const data = await api("/api/analysis/locations");
  if (!data) return;
  state.locationData = data;
  const select = $("stateSelect");
  Object.keys(data).sort().forEach(stateName => {
    const option = el("option");
    option.value = stateName;
    option.textContent = stateName;
    select.appendChild(option);
  });
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

function syncPanelLayout() {
  const app = $("appContainer");
  const visible = $("analysisPanel").style.display !== "none";
  app.classList.toggle("app--with-panel", visible);
}

async function loadLatestAnalysis(sessionId) {
  const backend = await api(`/api/chat/sessions/${sessionId}/analysis`);
  if (backend && Object.keys(backend).length) {
    persistSessionAnalysis(sessionId, backend);
    return backend;
  }
  return getPersistedSessionAnalysis(sessionId);
}

function persistSessionAnalysis(sessionId, result) {
  if (!sessionId || !result) return;
  const all = readPersistedAnalyses();
  all[sessionId] = result;
  localStorage.setItem(LOCAL_ANALYSIS_KEY, JSON.stringify(all));
}

function getPersistedSessionAnalysis(sessionId) {
  const all = readPersistedAnalyses();
  return all[sessionId] || null;
}

function readPersistedAnalyses() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ANALYSIS_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function fmt(text) {
  return String(text)
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

function esc(text) {
  return String(text).replace(/[&<>"']/g, match => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[match]);
}
