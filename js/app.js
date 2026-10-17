// =====================================================================
//  СКОПЈЕ WRAPPED — апликацијата
//  Едноставен JS без build чекор: отвори index.html и работи.
// =====================================================================

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const placeById = id => PLACES.find(p => p.id === id);
const DEMO_HOME = { lat: 41.9925, lng: 21.4165 }; // Base42, ако нема GPS
const TYPE_ICON = { "Музеј": "🏛️", "Галерија": "🖼️", "Споменик": "🌉", "Тврдина": "🏰", "Театар": "🎭", "Чаршија": "🧿", "Пазар": "🧺", "Маало": "🏘️", "Концертна сала": "🎸", "Парк": "🌳", "Хакерспејс": "🛠️" };
const TYPE_COLOR = { "Музеј": "#7B61FF", "Галерија": "#FF8FB1", "Споменик": "#36C5F0", "Тврдина": "#36C5F0", "Театар": "#FF5A36", "Чаршија": "#FFB020", "Пазар": "#FFB020", "Маало": "#3DDC97", "Концертна сала": "#FF5A36", "Парк": "#3DDC97", "Хакерспејс": "#3DDC97" };
const STATE_V = 2;

// ---------------------------------------------------------------------
//  Состојба (се чува во прелистувачот)
// ---------------------------------------------------------------------
const fresh = () => ({ v: STATE_V, user: null, visits: [], joined: [], kudos: [], groups: 0, chat: [], following: PEOPLE.filter(p => p.following).map(p => p.id), invited: [] });
let state = (() => { try { const s = JSON.parse(localStorage.getItem("sw_state") || "null"); return s && s.v === STATE_V ? s : fresh(); } catch { return fresh(); } })();
const save = () => { try { localStorage.setItem("sw_state", JSON.stringify(state)); } catch { toast("⚠️ storage"); } };
let pending = null;
const allPeople = () => [...PEOPLE, ...state.invited];
const personById = id => allPeople().find(p => p.id === id);

// ---------------------------------------------------------------------
//  Настани (датуми релативни на денес)
// ---------------------------------------------------------------------
function getEvents() {
  const now = new Date();
  return EVENT_TEMPLATES.map((e, i) => {
    const d = new Date(now); d.setDate(d.getDate() + e.day);
    const p = placeById(e.place);
    return {
      ...e, id: "ev" + i, date: d, title: LX(e.title), titleMk: e.title.mk,
      dateLabel: e.day === 0 ? t("today") : e.day === 1 ? t("tomorrow") : t("days")[d.getDay()],
      placeName: p.name, hood: p.hood, type: p.type, lat: p.lat, lng: p.lng,
    };
  });
}

// ---------------------------------------------------------------------
//  Статистика
// ---------------------------------------------------------------------
function stats() {
  const hoods = new Set(), typeCount = {}, tagCount = {}, placeCount = {}, hoodCount = {};
  let night = 0;
  for (const x of state.visits) {
    const p = placeById(x.place); if (!p) continue;
    hoods.add(p.hood); hoodCount[p.hood] = (hoodCount[p.hood] || 0) + 1;
    typeCount[p.type] = (typeCount[p.type] || 0) + 1;
    for (const tg of p.tags) tagCount[tg] = (tagCount[tg] || 0) + 1;
    placeCount[p.id] = (placeCount[p.id] || 0) + 1;
    if (new Date(x.ts).getHours() >= 20) night++;
  }
  const top = Object.entries(placeCount).sort((a, b) => b[1] - a[1])[0];
  return {
    visits: state.visits.length, hoods: hoods.size, totalHoods: HOODS.length, hoodNames: [...hoods], hoodCount,
    places: Object.keys(placeCount).length, typeCount, tagCount, placeCount, night, groups: state.groups,
    topPlace: top ? placeById(top[0]).name : null, topPlaceId: top?.[0],
  };
}

function seedDemo() {
  const day = 864e5, now = Date.now();
  const mk = (place, daysAgo, hour, mood) => {
    const d = new Date(now - daysAgo * day); d.setHours(hour, 10 + Math.floor(Math.random() * 40));
    return { id: "d" + Math.random().toString(36).slice(2, 8), place, ts: d.getTime(), mood, demo: true };
  };
  state.visits = [
    mk("kamen-most", 19, 17, "🙂"), mk("kale", 16, 18, "😍"), mk("daut-pasin-amam", 12, 12, "😍"),
    mk("univerzalna-sala", 9, 21, "🔥"), mk("debar-maalo", 5, 22, "🙂"), mk("opera", 3, 20, "😍"), mk("kurshumli-an", 1, 13, "🙂"),
  ];
}

// ---------------------------------------------------------------------
//  Помошни
// ---------------------------------------------------------------------
function toast(msg, ms = 2600) {
  const el = $("#toast"); el.textContent = msg; el.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (el.hidden = true), ms);
}
function confetti() {
  const box = document.createElement("div"); box.className = "confetti";
  const cols = ["#FFD23F", "#FF5A36", "#7B61FF", "#3DDC97", "#36C5F0", "#FF8FB1"];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement("i");
    c.style.left = Math.random() * 100 + "%"; c.style.background = cols[i % cols.length];
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s"; c.style.animationDelay = Math.random() * .4 + "s";
    box.appendChild(c);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3600);
}
function ago(ts) {
  const m = Math.round((Date.now() - ts) / 6e4);
  if (m < 1) return t("ago.now");
  if (m < 60) return t("ago.min", { n: m });
  const h = Math.round(m / 60); if (h < 24) return t("ago.h", { n: h });
  const d = Math.round(h / 24); return d === 1 ? t("ago.yday") : t("ago.d", { n: d });
}
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const monthName = () => t("months")[new Date().getMonth()];
function avatar(p, size = 40) {
  const st = `width:${size}px;height:${size}px;font-size:${Math.round(size * .42)}px;background:${p.color || "#F6F2EA"}`;
  return p.photo ? `<img class="avatar" style="${st};object-fit:cover" src="${p.photo}" alt="">` : `<div class="avatar" style="${st}">${esc(N(p.name)[0] || "?")}</div>`;
}
const me = () => ({ ...state.user, color: "#F6F2EA" });
function dist(a, b) { const dx = (a.lng - b.lng) * 82000, dy = (a.lat - b.lat) * 111000; return Math.sqrt(dx * dx + dy * dy); }
function getPos(timeout = 6000) {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { timeout, maximumAge: 60000 });
  });
}
const priceLabel = p => (p ? `${p} ${t("now.den")}` : t("now.free"));
function openSheet(html) { const sh = $("#sheet"); $(".sheet-card", sh).innerHTML = html; sh.hidden = false; $(".sheet-card", sh).scrollTop = 0; return $(".sheet-card", sh); }
function hideSheet() { $("#sheet").hidden = true; stopScanner(); }
function closeSheet() { hideSheet(); render(); }
$("#sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });
const appBase = () => location.href.split(/[?#]/)[0].replace(/index\.html$/, "");
function downscale(file, max, q) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", q)); URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}
function langSwitch() {
  return `<div class="seg" role="group" aria-label="${esc(t("me.lang"))}">${["mk", "en"].map(l => `<button data-lang="${l}" class="${LANG === l ? "on" : ""}">${l.toUpperCase()}</button>`).join("")}</div>`;
}
function bindLang(root) { $$("[data-lang]", root).forEach(b => b.onclick = () => { setLang(b.dataset.lang); localStorage.removeItem("sw_coach"); render(); }); }

// ---------------------------------------------------------------------
//  Рутер
// ---------------------------------------------------------------------
let map = null;
function render() {
  const view = $("#view");
  if (map) { map.remove(); map = null; }
  drawTabbar();
  if (!state.user) { $("#tabbar").hidden = true; view.classList.add("full"); return renderOnboarding(view); }
  $("#tabbar").hidden = false; view.classList.remove("full");
  const tab = (location.hash || "#map").slice(1);
  $$("#tabbar a").forEach(a => a.classList.toggle("active", a.dataset.tab === tab));
  view.scrollTop = 0;
  ({ map: renderMap, now: renderNow, skopi: renderSkopi, wrapped: renderWrappedHome, me: renderMe }[tab] || renderMap)(view);
}
function drawTabbar() {
  $("#tabbar").innerHTML = `
    <a href="#map" data-tab="map">${icon("map")}<span>${t("tab.map")}</span></a>
    <a href="#now" data-tab="now">${icon("now")}<span>${t("tab.now")}</span></a>
    <a href="#skopi" data-tab="skopi" class="skopi-tab"><span class="skopi-orb"><img src="icon.svg" alt=""></span><span>${t("tab.skopi")}</span></a>
    <a href="#wrapped" data-tab="wrapped">${icon("star")}<span>${t("tab.wrapped")}</span></a>
    <a href="#me" data-tab="me">${icon("user")}<span>${t("tab.me")}</span></a>`;
}
window.addEventListener("hashchange", render);

// ---------------------------------------------------------------------
//  Онбординг
// ---------------------------------------------------------------------
function renderOnboarding(view) {
  let step = 0, name = "", picks = [], hood = "";
  const dots = n => `<div class="dots">${[0, 1, 2].map(i => `<i class="${i === n ? "on" : ""}"></i>`).join("")}</div>`;
  const draw = () => {
    if (step === 0) {
      view.innerHTML = `<div class="onb">
        <div class="row onb-top"><img src="icon.svg" class="mini-orb" alt=""><div class="spacer"></div>${langSwitch()}</div>
        <div class="onb-hero">
          <div class="eyebrow grad-text">${t("onb.tagline")}</div>
          <div class="h-display big">Скопје<br><span class="grad-text">Wrapped</span></div>
          <p class="lead">${t("onb.sub")}</p>
          <div class="features">
            <div><span class="fi" style="background:rgba(255,90,54,.15);color:var(--coral)">${icon("qr", 20)}</span>${t("onb.f1")}</div>
            <div><span class="fi" style="background:rgba(255,210,63,.15);color:var(--sun)">${icon("sparkle", 20)}</span>${t("onb.f2")}</div>
            <div><span class="fi" style="background:rgba(123,97,255,.18);color:#A895FF">${icon("star", 20)}</span>${t("onb.f3")}</div>
          </div>
        </div>
        <div class="stack">
          <input class="field" id="nm" placeholder="${esc(t("onb.name"))}" autocomplete="given-name" maxlength="20" value="${esc(name)}">
          <button class="btn grad block" id="go" ${name ? "" : "disabled"}>${t("onb.start")}</button>
        </div></div>`;
      bindLang(view);
      const nm = $("#nm"), go = $("#go");
      nm.addEventListener("input", () => { name = nm.value.trim(); go.disabled = !name; });
      nm.addEventListener("keydown", e => e.key === "Enter" && name && go.click());
      go.onclick = () => { step = 1; draw(); };
    } else if (step === 1) {
      view.innerHTML = `<div class="onb">
        <div class="row onb-top"><button class="icon-btn" id="back">←</button><div class="spacer"></div>${dots(1)}</div>
        <div class="onb-body">
          <div class="eyebrow">${t("onb.step", { n: 2 })}</div>
          <div class="h1">${t("onb.interests")}</div>
          <p class="muted">${t("onb.interestsSub")}</p>
          <div class="interest-grid">${INTERESTS.map(i => `<button class="interest ${picks.includes(i.id) ? "on" : ""}" data-i="${i.id}"><span>${i.icon}</span>${esc(i[LANG] || i.mk)}</button>`).join("")}</div>
        </div>
        <button class="btn grad block" id="go" ${picks.length === 3 ? "" : "disabled"}>${picks.length === 3 ? t("onb.next") : t("onb.more", { n: 3 - picks.length })}</button>
      </div>`;
      $("#back").onclick = () => { step = 0; draw(); };
      $$(".interest", view).forEach(c => c.onclick = () => {
        const i = c.dataset.i;
        if (picks.includes(i)) picks = picks.filter(x => x !== i); else if (picks.length < 3) picks.push(i);
        draw();
      });
      $("#go").onclick = () => { step = 2; draw(); };
    } else {
      view.innerHTML = `<div class="onb">
        <div class="row onb-top"><button class="icon-btn" id="back">←</button><div class="spacer"></div>${dots(2)}</div>
        <div class="onb-body">
          <div class="eyebrow">${t("onb.step", { n: 3 })}</div>
          <div class="h1">${t("onb.hood")}</div>
          <p class="muted">${t("onb.hoodSub")}</p>
          <div class="chips">${HOODS.map(([h]) => `<button class="chip ${hood === h ? "on" : ""}" data-h="${esc(h)}">${esc(N(h))}</button>`).join("")}</div>
        </div>
        <button class="btn grad block" id="go" ${hood ? "" : "disabled"}>${t("onb.go")}</button>
      </div>`;
      $("#back").onclick = () => { step = 1; draw(); };
      $$("[data-h]", view).forEach(c => c.onclick = () => { hood = c.dataset.h; draw(); });
      $("#go").onclick = () => {
        state.user = { name, interests: picks, hood, photo: null };
        seedDemo(); save();
        location.hash = "#map"; render();
        handlePending();
      };
    }
  };
  draw();
}

// ---------------------------------------------------------------------
//  Мапа (вистинска мапа на Скопје)
// ---------------------------------------------------------------------
function pinIcon(p, visited) {
  const col = TYPE_COLOR[p.type] || "#FF5A36";
  return L.divIcon({
    className: "", iconSize: [38, 46], iconAnchor: [19, 44], popupAnchor: [0, -40],
    html: `<div class="pin ${visited ? "visited" : ""}" style="--c:${col}"><span>${TYPE_ICON[p.type] || "•"}</span></div>`,
  });
}
function renderMap(view) {
  const st = stats();
  const pct = Math.round(st.hoods / st.totalHoods * 100);
  view.innerHTML = `<div class="map-wrap">
    <div id="map"></div>
    <div class="map-top">
      <div class="stat-glass explored">
        <div class="row">
          <div><div class="big">${st.hoods}<span class="of">/${st.totalHoods}</span></div><div class="lbl">${t("map.explored")}</div></div>
          <div class="spacer"></div>
          <div style="text-align:right"><div class="big sm">${st.visits}</div><div class="lbl">${t("map.visits")}</div></div>
        </div>
        <div class="bar"><i style="width:${Math.max(pct, 3)}%"></i></div>
      </div>
      <button class="icon-btn glass" id="locate" aria-label="locate">${icon("locate", 20)}</button>
    </div>
    <div class="map-actions">
      <div class="coach"><img src="icon.svg" alt=""><div><div class="eyebrow" style="color:var(--sun)">${t("map.coach")}</div><div class="t" id="coachTxt"><span class="typing"><i></i><i></i><i></i></span></div></div></div>
      <div class="fab-row">
        <button class="btn grad" id="scanBtn">${icon("qr", 20)} ${t("map.scan")}</button>
        <button class="btn" id="photoBtn">${icon("camera", 20)} ${t("map.photo")}</button>
      </div>
    </div>
  </div>`;

  map = L.map("map", { zoomControl: false, attributionControl: true }).setView([41.9975, 21.428], 14);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO", subdomains: "abcd", maxZoom: 19,
  }).addTo(map);

  // Истражено: светло околу секое посетено место (како heatmap на Strava)
  for (const p of PLACES) {
    const n = st.placeCount[p.id] || 0; if (!n) continue;
    L.circle([p.lat, p.lng], { radius: 260 + n * 40, stroke: false, fillColor: "#FF5A36", fillOpacity: .16, interactive: false }).addTo(map);
    L.circle([p.lat, p.lng], { radius: 120 + n * 20, stroke: false, fillColor: "#FFB020", fillOpacity: .22, interactive: false }).addTo(map);
  }
  for (const p of PLACES) {
    const n = st.placeCount[p.id] || 0;
    const m = L.marker([p.lat, p.lng], { icon: pinIcon(p, n > 0) }).addTo(map);
    m.bindPopup(`<div class="pop-title">${esc(N(p.name))}</div><div class="pop-sub">${esc(TY(p.type))} · ${esc(N(p.hood))} · ${n ? t("map.visited", { n }) : t("map.new")}</div>
      <div class="row"><button class="btn sm grad" data-ci="${p.id}">${t("map.checkin")}</button><button class="btn sm ghost" data-ask="${p.id}">${t("map.ask")}</button></div>`);
  }
  map.on("popupopen", e => {
    const el = e.popup.getElement();
    $("[data-ci]", el)?.addEventListener("click", ev => { map.closePopup(); checkIn(ev.currentTarget.dataset.ci); });
    $("[data-ask]", el)?.addEventListener("click", ev => askSkopi(t("map.askAbout", { p: N(placeById(ev.currentTarget.dataset.ask).name) })));
  });
  let meDot = null;
  $("#locate").onclick = async () => {
    const pos = await getPos(8000);
    if (!pos) return toast("📍 GPS?");
    if (meDot) meDot.remove();
    meDot = L.marker([pos.lat, pos.lng], { icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [18, 18] }) }).addTo(map);
    map.setView([pos.lat, pos.lng], 15);
  };
  $("#scanBtn").onclick = openScanner;
  $("#photoBtn").onclick = () => $("#photoInput").click();
  loadCoach();
}

async function loadCoach() {
  const key = new Date().toDateString() + "|" + state.visits.length + "|" + LANG;
  let cached = null; try { cached = JSON.parse(localStorage.getItem("sw_coach") || "null"); } catch {}
  let txt = cached?.key === key ? cached.txt : null;
  if (!txt) {
    txt = await AI.coach(state.user, stats(), getEvents());
    try { localStorage.setItem("sw_coach", JSON.stringify({ key, txt })); } catch {}
  }
  const el = $("#coachTxt"); if (el) el.textContent = txt;
}

// ---------------------------------------------------------------------
//  Чекирање (QR / фото / рачно)
// ---------------------------------------------------------------------
async function checkIn(placeId, extra = {}) {
  const p = placeById(placeId); if (!p) return toast(t("unknown"));
  const before = stats();
  const isNewHood = !before.hoodNames.includes(p.hood);
  const visit = { id: "v" + Date.now(), place: p.id, ts: Date.now(), mood: "", ...extra };
  state.visits.push(visit); save();
  confetti();
  const after = stats();
  const sheet = openSheet(`
    <div class="checkin-hero">
      <div class="plus">${t("ci.plus", { n: after.visits })}</div>
      <div class="h1" style="margin-top:8px">${esc(N(p.name))}</div>
      <div style="font-weight:700;margin-top:4px">${TYPE_ICON[p.type] || ""} ${esc(TY(p.type))} · ${esc(N(p.hood))}</div>
    </div>
    ${isNewHood ? `<div class="new-zone">${icon("sparkle", 18)} ${t("ci.newHood", { h: esc(N(p.hood)), a: after.hoods, b: after.totalHoods })}</div>` : ""}
    ${extra.photo ? `<img class="photo-prev" style="margin-top:12px" src="${extra.photo}" alt="">` : ""}
    <div class="skopi-says"><img src="icon.svg" alt=""><div class="bubble" id="story"><div id="storyText"><span class="typing"><i></i><i></i><i></i></span></div></div></div>
    <form class="ask-row" id="askF"><input class="field" id="askIn" placeholder="${esc(t("ci.askPh"))}"><button class="send" type="submit">${icon("send", 20)}</button></form>
    <div class="eyebrow" style="margin:18px 0 8px">${t("ci.how")}</div>
    <div class="moods">${["😍", "🔥", "🙂", "😐"].map(m => `<button data-m="${m}">${m}</button>`).join("")}</div>
    <button class="btn block" id="doneBtn" style="margin-top:16px">${t("ci.done")}</button>`);
  $$(".moods button", sheet).forEach(b => b.onclick = () => {
    $$(".moods button", sheet).forEach(x => x.classList.remove("on")); b.classList.add("on");
    visit.mood = b.dataset.m; save();
  });
  $("#doneBtn").onclick = closeSheet;
  $("#askF").onsubmit = async e => {
    e.preventDefault();
    const q = $("#askIn").value.trim(); if (!q) return;
    $("#askIn").value = "";
    const story = $("#story");
    story.insertAdjacentHTML("beforeend", `<div class="qa"><b>${t("ci.you")}:</b> ${esc(q)}</div><div class="qa" id="ans"><span class="typing"><i></i><i></i><i></i></span></div>`);
    const a = await AI.skopiReply([{ role: "user", content: t("ci.inPlace", { p: p.name, q }) }], state.user, stats(), getEvents());
    const ans = $("#ans"); if (ans) { ans.removeAttribute("id"); ans.textContent = a; }
  };
  const txt = await AI.placeStory(p, state.user);
  const el = $("#storyText"); if (el) el.textContent = txt;
  visit.story = txt; save();
}

let scanner = null;
function stopScanner() { if (scanner) { scanner.stop().catch(() => {}); scanner = null; } }
function openScanner() {
  const sheet = openSheet(`
    <div class="h1">${t("scan.title")}</div>
    <p class="muted" style="margin:6px 0 14px">${t("scan.sub")}</p>
    <div id="reader"></div>
    <div class="eyebrow" style="margin:18px 0 8px">${t("scan.noqr")}</div>
    <div class="place-pick">${PLACES.map(p => `<button data-p="${p.id}"><span class="pp-ico">${TYPE_ICON[p.type] || "•"}</span><span><b>${esc(N(p.name))}</b><br><span class="muted">${esc(TY(p.type))} · ${esc(N(p.hood))}</span></span></button>`).join("")}</div>`);
  $$("[data-p]", sheet).forEach(b => b.onclick = () => { hideSheet(); checkIn(b.dataset.p); });
  try {
    scanner = new Html5Qrcode("reader");
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, txt => {
      const r = parseLink(txt);
      if (r?.place) { hideSheet(); checkIn(r.place); }
      else if (r?.friend) { hideSheet(); addFriendByName(r.friend); render(); }
      else toast(t("scan.bad"));
    }).catch(() => { $("#reader").innerHTML = `<p class="muted" style="padding:20px">${t("scan.nocam")}</p>`; scanner = null; });
  } catch (e) { console.warn(e); }
}
function parseLink(txt) {
  try {
    const u = new URL(txt);
    const pl = u.searchParams.get("place"); if (placeById(pl)) return { place: pl };
    const fr = u.searchParams.get("friend"); if (fr) return { friend: fr.slice(0, 24) };
  } catch {}
  return placeById(txt.trim()) ? { place: txt.trim() } : null;
}

// Фото → активност
$("#photoInput").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  const big = await downscale(f, 768, .8), thumb = await downscale(f, 420, .72);
  const sheet = openSheet(`
    <img class="photo-prev" src="${big}" alt="">
    <div class="skopi-says"><img src="icon.svg" alt=""><div class="bubble" id="ph"><span class="typing"><i></i><i></i><i></i></span> ${t("ph.looking")}</div></div>
    <div id="phActs" style="margin-top:14px"></div>`);
  const pos = (await getPos()) || DEMO_HOME;
  const cands = PLACES.slice().sort((a, b) => dist(a, pos) - dist(b, pos)).slice(0, 5);
  const manual = msg => {
    $("#ph").textContent = msg;
    $("#phActs").innerHTML = `<div class="place-pick">${cands.map(p => `<button data-p="${p.id}"><span class="pp-ico">${TYPE_ICON[p.type] || "•"}</span><span><b>${esc(N(p.name))}</b><br><span class="muted">${Math.round(dist(p, pos))} m</span></span></button>`).join("")}</div>`;
    $$("[data-p]", sheet).forEach(b => b.onclick = () => { hideSheet(); checkIn(b.dataset.p, { photo: thumb }); });
  };
  if (!AI.hasKey()) return manual(t("ph.pickNoKey"));
  try {
    const r = await AI.photoActivity(big, cands);
    const p = placeById(r.place_id) || cands[0];
    $("#ph").innerHTML = `<b>${esc(r.title || r.kind)}</b><br>${esc(r.caption || "")}<br><br><span class="muted">📍 ${esc(N(p.name))} · ${esc(r.kind || TY(p.type))}</span>`;
    $("#phActs").innerHTML = `<button class="btn grad block" id="ok">${icon("check", 20)} ${t("ph.save")}</button><button class="btn ghost block" id="other" style="margin-top:8px">${t("ph.other")}</button>`;
    $("#ok").onclick = () => { hideSheet(); checkIn(p.id, { photo: thumb, title: r.title, caption: r.caption, kind: r.kind }); };
    $("#other").onclick = () => manual(t("ph.otherQ"));
  } catch (err) { console.warn(err); manual(t("ph.fail")); }
});

// ---------------------------------------------------------------------
//  Актуелно
// ---------------------------------------------------------------------
function renderNow(view) {
  const events = getEvents();
  const st = stats();
  const posts = [
    ...state.visits.filter(v => !v.demo || Date.now() - v.ts < 3 * 864e5).map(v => ({ id: v.id, person: me(), mine: true, place: v.place, ts: v.ts, mood: v.mood, note: v.caption, title: v.title, photo: v.photo })),
    ...PEOPLE_ACTIVITY.filter(a => state.following.includes(a.who)).map((a, i) => ({ id: "f" + a.who + a.place, person: personById(a.who), place: a.place, ts: Date.now() - a.hoursAgo * 36e5, mood: a.mood, note: LX(a.note) })),
  ].sort((a, b) => b.ts - a.ts);
  const suggest = allPeople().filter(p => !state.following.includes(p.id)).slice(0, 6);

  view.innerHTML = `<div class="screen">
    <div class="row"><div><div class="eyebrow">${t("now.week")}</div><div class="h1" style="margin:4px 0 14px">${t("now.title")}</div></div></div>
    <div class="events-strip">${events.map(e => {
      const joined = state.joined.includes(e.id);
      const going = 3 + (hash(e.titleMk) % 19) + (joined ? 1 : 0);
      const col = TYPE_COLOR[e.type] || "#FF5A36";
      return `<div class="ev" style="--c:${col}">
        <div class="ev-top"><span class="ev-day">${esc(e.dateLabel)}</span><span class="ev-time">${icon("clock", 14)} ${e.time}</span><div class="spacer"></div><span class="pill">${priceLabel(e.price)}</span></div>
        <div class="title">${esc(e.title)}</div>
        <div class="ev-where">${icon("pin", 14)} ${esc(N(e.placeName))} · ${esc(N(e.hood))}</div>
        <div class="ev-going">${avatarsStack(e.id)}<span>${t("now.going", { n: going })}</span></div>
        <div class="acts">
          <button class="btn sm ${joined ? "" : "grad"}" data-join="${e.id}">${joined ? icon("check", 16) + " " + t("now.joined") : t("now.join")}</button>
          <button class="btn sm ghost" data-crew="${e.id}">${icon("users", 16)} ${t("now.crew")}</button>
        </div></div>`;
    }).join("")}</div>

    ${suggest.length ? `<div class="eyebrow" style="margin-top:22px">${t("now.suggest")}</div>
    <div class="people-strip">${suggest.map(p => `<div class="person-card">${avatar(p, 52)}<b>${esc(N(p.name))}</b><span class="muted">${esc(N(p.hood || ""))}</span><button class="btn sm grad" data-follow="${p.id}">${t("fr.follow")}</button></div>`).join("")}</div>` : ""}

    <div class="eyebrow" style="margin-top:22px">${t("now.friends")}</div>
    ${!state.following.length ? `<div class="empty card"><p class="muted">${t("now.noFriends")}</p><button class="btn sm grad" id="findFr" style="margin-top:12px">${icon("users", 16)} ${t("now.findFriends")}</button></div>` : ""}
    ${posts.map(p => {
      const pl = placeById(p.place);
      const legend = p.mine && (st.placeCount[pl.id] || 0) >= 2;
      const kud = 2 + (hash(p.id) % 14) + (state.kudos.includes(p.id) ? 1 : 0);
      return `<div class="post">
        <div class="head">${avatar(p.person)}<div><div class="who">${esc(N(p.person.name))}${p.mine ? ` <span class="pill sun">${t("now.you")}</span>` : ""}</div><div class="what">${ago(p.ts)} · ${esc(N(pl.hood))}</div></div><div class="spacer"></div><div style="font-size:22px">${p.mood || ""}</div></div>
        <div class="body">
          <div class="place-card"><div class="ico" style="background:${TYPE_COLOR[pl.type] || "#333"}22">${TYPE_ICON[pl.type] || "•"}</div><div><div style="font-weight:800">${esc(p.title || N(pl.name))}</div><div class="muted" style="font-size:12.5px">${esc(TY(pl.type))} · ${esc(p.title ? N(pl.name) : N(pl.hood))}</div></div></div>
          ${legend ? `<div style="margin-top:8px"><span class="pill hot">👑 ${t("now.legend", { p: esc(N(pl.name)) })}</span></div>` : ""}
          ${p.photo ? `<img class="photo" src="${p.photo}" alt="">` : ""}
          ${p.note ? `<div class="note">${esc(p.note)}</div>` : ""}
          <div class="foot"><button class="chip kudos ${state.kudos.includes(p.id) ? "on" : ""}" data-kudo="${p.id}">👏 ${kud}</button>${p.mine ? "" : `<button class="chip" data-same="${pl.id}">${t("now.wantGo")}</button>`}</div>
        </div></div>`;
    }).join("")}
  </div>`;

  $$("[data-join]", view).forEach(b => b.onclick = () => {
    const id = b.dataset.join;
    state.joined = state.joined.includes(id) ? state.joined.filter(x => x !== id) : [...state.joined, id];
    save(); if (state.joined.includes(id)) toast(t("now.joinToast")); renderKeepScroll();
  });
  $$("[data-crew]", view).forEach(b => b.onclick = () => openCrew(events.find(e => e.id === b.dataset.crew)));
  $$("[data-kudo]", view).forEach(b => b.onclick = () => {
    const id = b.dataset.kudo;
    state.kudos = state.kudos.includes(id) ? state.kudos.filter(x => x !== id) : [...state.kudos, id];
    save(); renderKeepScroll();
  });
  $$("[data-follow]", view).forEach(b => b.onclick = () => { toggleFollow(b.dataset.follow); renderKeepScroll(); });
  $$("[data-same]", view).forEach(b => b.onclick = () => askSkopi(t("now.wantQ", { p: N(placeById(b.dataset.same).name) })));
  $("#findFr")?.addEventListener("click", openFriends);
}
function avatarsStack(seed) {
  const ppl = allPeople(); const n = 3; let out = "";
  for (let i = 0; i < n; i++) { const p = ppl[(hash(seed) + i * 3) % ppl.length]; out += avatar(p, 24); }
  return `<span class="stack-av">${out}</span>`;
}
function renderKeepScroll() { const v = $("#view"), y = v.scrollTop; const strip = $(".events-strip"); const x = strip?.scrollLeft || 0; render(); v.scrollTop = y; if ($(".events-strip")) $(".events-strip").scrollLeft = x; }

async function openCrew(ev) {
  const mine = state.user.interests;
  const group = allPeople().map(f => ({ ...f, score: f.interests.filter(i => mine.includes(i)).length + (hash(f.id + ev.id) % 3) * .1 }))
    .sort((a, b) => b.score - a.score).slice(0, 4);
  openSheet(`
    <div class="eyebrow">${t("crew.found")}</div>
    <div class="h1" style="margin:6px 0 4px">${esc(ev.title)}</div>
    <div class="muted">${esc(ev.dateLabel)} · ${ev.time} · ${esc(N(ev.placeName))}</div>
    <div class="group-grid" style="margin-top:16px">
      <div class="card">${avatar(me())}<div><b>${esc(state.user.name)}</b><div class="muted" style="font-size:11.5px">${t("crew.you")}</div></div></div>
      ${group.map(g => `<div class="card">${avatar(g)}<div><b>${esc(N(g.name))}</b><div class="muted" style="font-size:11.5px">${g.interests.filter(i => mine.includes(i)).map(interestLabel).map(esc).join(", ") || t("crew.new")}</div></div></div>`).join("")}
    </div>
    <p class="muted" style="font-size:12.5px;margin-top:10px">${t("crew.note")}</p>
    <div class="skopi-says"><img src="icon.svg" alt=""><div class="bubble"><div class="eyebrow" style="margin-bottom:4px">${t("crew.ice")}</div><span id="ice"><span class="typing"><i></i><i></i><i></i></span></span></div></div>
    <button class="btn grad block" id="joinCrew" style="margin-top:16px">${icon("users", 18)} ${t("crew.join")}</button>`);
  $("#joinCrew").onclick = () => {
    state.groups++; if (!state.joined.includes(ev.id)) state.joined.push(ev.id); save();
    hideSheet(); confetti(); toast(t("crew.toast") + " 👯"); render();
  };
  const ice = await AI.icebreaker(ev, [{ name: state.user.name, interests: mine }, ...group]);
  const el = $("#ice"); if (el) el.textContent = ice;
}

// ---------------------------------------------------------------------
//  Пријатели
// ---------------------------------------------------------------------
function toggleFollow(id) {
  state.following = state.following.includes(id) ? state.following.filter(x => x !== id) : [...state.following, id];
  save();
}
function addFriendByName(name) {
  name = String(name).trim(); if (!name) return;
  let p = allPeople().find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!p) {
    const cols = ["#FF5A36", "#3DDC97", "#7B61FF", "#FFD23F", "#36C5F0", "#FF8FB1"];
    const ids = INTERESTS.map(i => i.id), h = hash(name);
    p = { id: "inv-" + h, name, color: cols[h % cols.length], interests: [ids[h % ids.length], ids[(h >> 3) % ids.length], ids[(h >> 6) % ids.length]], hood: "" };
    state.invited.push(p);
  }
  if (!state.following.includes(p.id)) state.following.push(p.id);
  save(); confetti(); toast(t("fr.added", { n: N(p.name) }));
}
function openFriends(tab = "search") {
  const inviteLink = `${appBase()}?friend=${encodeURIComponent(state.user.name)}`;
  const sheet = openSheet(`
    <div class="row"><div class="h1">${t("fr.title")}</div><div class="spacer"></div><button class="icon-btn" id="xFr">${icon("close", 20)}</button></div>
    <div class="seg wide" style="margin:14px 0">${[["search", t("fr.searchTab")], ["code", t("fr.codeTab")]].map(([k, l]) => `<button data-ft="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div id="frBody"></div>`);
  $("#xFr").onclick = closeSheet;
  $$("[data-ft]", sheet).forEach(b => b.onclick = () => openFriends(b.dataset.ft));
  const body = $("#frBody");
  if (tab === "search") {
    body.innerHTML = `<div class="search">${icon("search", 18)}<input id="frQ" placeholder="${esc(t("fr.search"))}" autocomplete="off"></div><div id="frList" class="people-list"></div>`;
    const draw = () => {
      const q = $("#frQ").value.trim().toLowerCase();
      const list = allPeople().filter(p => !q || p.name.toLowerCase().includes(q) || latin(p.name).toLowerCase().includes(q));
      $("#frList").innerHTML = list.length ? list.map(p => {
        const common = p.interests.filter(i => state.user.interests.includes(i)).map(interestLabel);
        const on = state.following.includes(p.id);
        return `<div class="person-row">${avatar(p, 44)}<div style="flex:1;min-width:0"><b>${esc(N(p.name))}</b><div class="muted" style="font-size:12.5px">${esc(N(p.hood || ""))}${common.length ? " · " + t("fr.common", { x: esc(common.join(", ")) }) : ""}</div></div>
          <button class="btn sm ${on ? "ghost" : "grad"}" data-f="${p.id}">${on ? icon("check", 16) + " " + t("fr.followingBtn") : t("fr.follow")}</button></div>`;
      }).join("") : `<p class="muted" style="padding:16px 0">${t("fr.none")}</p>`;
      $$("[data-f]", body).forEach(b => b.onclick = () => { toggleFollow(b.dataset.f); draw(); });
    };
    $("#frQ").addEventListener("input", draw); draw();
  } else {
    const q = qrcode(0, "M"); q.addData(inviteLink); q.make();
    body.innerHTML = `<div class="invite">
      <div class="invite-card">${avatar(me(), 56)}<b style="font-size:18px">${esc(state.user.name)}</b><div class="qrbox">${q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div></div>
      <p class="muted" style="text-align:center;margin:12px 0">${t("fr.codeSub")}</p>
      <div class="row"><button class="btn grad" style="flex:1" id="copyL">${icon("link", 18)} ${t("fr.copy")}</button>${navigator.share ? `<button class="btn ghost" id="shareL">${icon("share", 18)}</button>` : ""}</div>
      <div class="muted" style="font-size:11.5px;margin-top:10px;word-break:break-all;text-align:center">${esc(inviteLink)}</div></div>`;
    $("#copyL").onclick = async () => { try { await navigator.clipboard.writeText(inviteLink); toast(t("fr.copied")); } catch { prompt("", inviteLink); } };
    $("#shareL")?.addEventListener("click", () => navigator.share({ title: "Скопје Wrapped", url: inviteLink }).catch(() => {}));
  }
}

// ---------------------------------------------------------------------
//  Скопи — разговор
// ---------------------------------------------------------------------
function askSkopi(q) { location.hash = "#skopi"; setTimeout(() => sendChat(q), 60); }
function renderSkopi(view) {
  if (!state.chat.length) state.chat.push({ role: "assistant", content: t("sk.hello", { n: state.user.name }) });
  view.innerHTML = `<div class="chat">
    <div class="chat-head"><img src="icon.svg" alt=""><div><div class="h2">Скопи</div><div class="status ${AI.hasKey() ? "on" : ""}">${AI.hasKey() ? t("sk.status") : t("sk.offline")}</div></div><div class="spacer"></div><button class="chip" id="clr">${icon("refresh", 15)} ${t("sk.new")}</button></div>
    <div class="chat-log" id="log">${state.chat.map(m => `<div class="msg ${m.role === "user" ? "me" : "bot"}">${esc(m.content)}</div>`).join("")}</div>
    <div class="chat-suggest">${["sk.s1", "sk.s2", "sk.s3", "sk.s4"].map(k => `<button class="chip" data-s="${esc(t(k))}">${esc(t(k))}</button>`).join("")}</div>
    <form class="chat-input" id="f"><input id="q" placeholder="${esc(t("sk.ph"))}" autocomplete="off"><button class="send" type="submit">${icon("send", 20)}</button></form>
  </div>`;
  const log = $("#log"); log.scrollTop = log.scrollHeight;
  $("#f").onsubmit = e => { e.preventDefault(); const q = $("#q").value.trim(); if (q) { $("#q").value = ""; sendChat(q); } };
  $$("[data-s]", view).forEach(b => b.onclick = () => sendChat(b.dataset.s));
  $("#clr").onclick = () => { state.chat = []; save(); render(); };
}
let chatBusy = false;
async function sendChat(q) {
  if (chatBusy) return; chatBusy = true;
  state.chat.push({ role: "user", content: q }); save();
  const log = $("#log");
  if (log) { log.insertAdjacentHTML("beforeend", `<div class="msg me">${esc(q)}</div><div class="msg bot" id="pending"><span class="typing"><i></i><i></i><i></i></span></div>`); log.scrollTop = log.scrollHeight; }
  const hist = state.chat.slice(-10).map(m => ({ role: m.role, content: m.content }));
  const a = await AI.skopiReply(hist, state.user, stats(), getEvents());
  state.chat.push({ role: "assistant", content: a }); save();
  const pend = $("#pending");
  if (pend) { pend.removeAttribute("id"); pend.textContent = a; $("#log").scrollTop = 1e9; }
  chatBusy = false;
}

// ---------------------------------------------------------------------
//  Wrapped
// ---------------------------------------------------------------------
function renderWrappedHome(view) {
  const st = stats();
  view.innerHTML = `<div class="screen">
    <div class="wr-hero">
      <div class="eyebrow">${t("wr.month")} · ${esc(monthName())}</div>
      <div class="h-display" style="font-size:46px;margin:8px 0 12px">Скопје<br><span class="grad-text">Wrapped</span></div>
      <p class="muted">${t("wr.sub", { m: esc(monthName()) })}</p>
    </div>
    <div class="stat-row">
      <div><b>${st.visits}</b><span>${t("wr.visits")}</span></div>
      <div><b>${st.hoods}</b><span>${t("wr.hoods")}</span></div>
      <div><b>${st.places}</b><span>${t("wr.places")}</span></div>
    </div>
    <button class="btn grad block" id="play" style="margin-top:18px;height:58px;font-size:17px" ${st.visits ? "" : "disabled"}>▶ ${t("wr.play")}</button>
    ${st.visits ? "" : `<p class="muted" style="margin-top:10px">${t("wr.empty")}</p>`}
  </div>`;
  $("#play").onclick = playWrapped;
}

async function playWrapped() {
  const st = stats();
  const box = document.createElement("div"); box.className = "story";
  box.innerHTML = `<div class="slide s-ink" style="align-items:center;text-align:center"><img src="icon.svg" style="width:90px;animation:bob 1.5s infinite"><div class="h2">${t("wr.writing")}</div></div>`;
  $("#app").appendChild(box);
  const w = await AI.wrapped(state.user, st);
  const m = monthName();
  const slides = [
    `<div class="slide s-ink"><div class="eyebrow">Скопје Wrapped · ${esc(m)}</div><div class="big">${t("wr.s1", { n: esc(state.user.name) })}</div></div>`,
    `<div class="slide s-coral"><div class="eyebrow" style="color:var(--ink)">${t("wr.outings")}</div><div class="huge">${st.visits}</div><div class="line">${st.night ? t("wr.night", { n: st.night }) : t("wr.noNight")}</div></div>`,
    `<div class="slide s-sun"><div class="eyebrow" style="color:var(--ink)">${t("wr.hoodsFound")}</div><div class="huge">${st.hoods}<span style="font-size:40px">/${st.totalHoods}</span></div><div class="line">${esc(w.hoods_line || w.zones_line || "")}</div><div style="font-weight:800">${st.hoodNames.map(N).map(esc).join(" · ")}</div></div>`,
    `<div class="slide s-violet"><div class="eyebrow" style="color:var(--paper)">${t("wr.place")}</div><div class="big">${esc(N(st.topPlace || "—"))}</div><div class="line">${esc(w.fav_line)}</div></div>`,
    `<div class="slide s-mint"><div class="eyebrow" style="color:var(--ink)">${t("wr.persona")}</div><div class="big">${esc(w.persona)}</div><div class="line">${esc(w.persona_line)}</div></div>`,
    `<div class="slide s-ink"><img src="icon.svg" style="width:70px"><div class="big" style="font-size:30px">${esc(w.roast)}</div><div class="line muted">${esc(w.next)}</div></div>`,
    `<div class="slide s-ink" style="justify-content:flex-start;padding-top:60px;gap:12px">${shareCardHTML(st, w, m)}
      <div class="row"><button class="btn grad" style="flex:1" id="dl">${icon("download", 18)} ${t("wr.save")}</button><button class="btn ghost" id="again">${icon("refresh", 18)}</button></div></div>`,
  ];
  let i = 0, timer;
  const show = () => {
    clearTimeout(timer);
    box.innerHTML = `<div class="story-progress">${slides.map((_, k) => `<i class="${k < i ? "done" : k === i ? "cur" : ""}"><b></b></i>`).join("")}</div><button class="story-close" id="x">${icon("close", 18)}</button>` + slides[i];
    $("#x", box).onclick = e => { e.stopPropagation(); clearTimeout(timer); box.remove(); };
    if (i === slides.length - 1) {
      $(".story-progress i.cur", box).className = "done";
      $("#dl", box).onclick = e => { e.stopPropagation(); downloadCard(); };
      $("#again", box).onclick = e => { e.stopPropagation(); i = 0; show(); };
    } else timer = setTimeout(() => { i++; show(); }, 6000);
  };
  box.onclick = e => {
    if (i === slides.length - 1 || e.target.closest("button")) return;
    const r = box.getBoundingClientRect();
    i = e.clientX - r.left < r.width / 3 ? Math.max(0, i - 1) : i + 1; show();
  };
  show();
}

// Мини-мапа за картичката: маала како точки (посетените светат)
function hoodSVG(st) {
  const W = 300, H = 230, lats = HOODS.map(h => h[1]), lngs = HOODS.map(h => h[2]);
  const minLa = Math.min(...lats), maxLa = Math.max(...lats), minLn = Math.min(...lngs), maxLn = Math.max(...lngs);
  const px = ln => 20 + (ln - minLn) / (maxLn - minLn) * (W - 40), py = la => 20 + (maxLa - la) / (maxLa - minLa) * (H - 40);
  const visited = new Set(st.hoodNames);
  const labeled = st.hoodNames.slice().sort((a, b) => (st.hoodCount[b] || 0) - (st.hoodCount[a] || 0)).slice(0, 3);
  const river = `<path d="M10 ${py(42.003)} C 80 ${py(42.000)}, 120 ${py(41.995)}, 170 ${py(41.997)} S 250 ${py(42.004)}, 295 ${py(42.010)}" fill="none" stroke="#36C5F0" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${river}${HOODS.map(([n, la, ln]) => {
    const v = visited.has(n), c = st.hoodCount[n] || 0;
    return v
      ? `<circle cx="${px(ln)}" cy="${py(la)}" r="${14 + c * 3}" fill="#FF5A36" fill-opacity=".25"/><circle cx="${px(ln)}" cy="${py(la)}" r="7" fill="#FFD23F"/>${labeled.includes(n) ? `<text x="${px(ln)}" y="${labeled.indexOf(n) % 2 ? py(la) + 26 + c * 2 : py(la) - 16 - c * 2}" text-anchor="middle" font-size="11" font-weight="800" fill="#F6F2EA" font-family="Manrope, sans-serif">${esc(N(n))}</text>` : ""}`
      : `<circle cx="${px(ln)}" cy="${py(la)}" r="4" fill="#3a3a4a"/>`;
  }).join("")}</svg>`;
}
function shareCardHTML(st, w, month) {
  return `<div class="share-card" id="shareCard">
    <div class="sc-top"><div class="sc-brand">СКОПЈЕ <span class="grad-text">WRAPPED</span></div><div class="muted" style="font-size:11px;font-weight:800;text-transform:uppercase">${esc(month)}</div></div>
    <div class="sc-persona">${t("wr.is", { n: esc(state.user.name) })}<br><span class="grad-text">${esc(w.persona)}</span></div>
    <div class="sc-hex">${hoodSVG(st)}</div>
    <div class="sc-stats"><div><b>${st.visits}</b><span>${t("wr.visits")}</span></div><div><b>${st.hoods}/${st.totalHoods}</b><span>${t("wr.hoods")}</span></div><div><b>${st.places}</b><span>${t("wr.places")}</span></div></div>
    <div class="sc-roast">„${esc(w.roast)}“ — Скопи</div>
  </div>`;
}
async function downloadCard() {
  const card = $("#shareCard"); if (!card) return;
  toast(t("wr.making"));
  try {
    const canvas = await html2canvas(card, { backgroundColor: "#0E0E12", scale: 3, useCORS: true });
    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    const file = new File([blob], "skopje-wrapped.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Скопје Wrapped" }); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "skopje-wrapped.png"; a.click();
    toast(t("wr.saved") + " 📸");
  } catch (e) { console.warn(e); toast(t("wr.fail")); }
}

// ---------------------------------------------------------------------
//  Профил
// ---------------------------------------------------------------------
function renderMe(view) {
  const st = stats();
  const u = state.user;
  const league = LEAGUE.map(([n, s]) => [n, s + (n === u.hood ? st.visits * 10 : 0)]);
  if (u.hood && !league.find(l => l[0] === u.hood)) league.push([u.hood, st.visits * 10]);
  league.sort((a, b) => b[1] - a[1]);
  const max = league[0][1];
  const friends = allPeople().filter(p => state.following.includes(p.id));
  view.innerHTML = `<div class="screen">
    <div class="profile-head">
      ${avatar(me(), 76)}
      <div style="flex:1;min-width:0">
        <div class="h1">${esc(u.name)}</div>
        <div class="muted" style="font-size:13px;margin-top:2px">${icon("pin", 13)} ${esc(N(u.hood || "—"))}</div>
        <div class="chips small" style="margin-top:8px">${u.interests.map(i => `<span class="chip">${(INTERESTS.find(x => x.id === i) || {}).icon || ""} ${esc(interestLabel(i))}</span>`).join("")}</div>
      </div>
    </div>
    <div class="stat-row" style="margin-top:16px">
      <div><b>${st.visits}</b><span>${t("wr.visits")}</span></div>
      <div><b>${st.hoods}</b><span>${t("wr.hoods")}</span></div>
      <div><b>${friends.length}</b><span>${t("me.following")}</span></div>
    </div>
    <div class="row" style="margin-top:12px;gap:8px">
      <button class="btn ghost" style="flex:1" id="editP">${icon("edit", 18)} ${t("me.edit")}</button>
      <button class="btn grad" style="flex:1" id="addF">${icon("users", 18)} ${t("me.addFriends")}</button>
    </div>

    <div class="section-h"><span class="eyebrow">${t("me.friends")}</span><span class="spacer"></span><button class="link-btn" id="allF">${friends.length}</button></div>
    <div class="friends-row">${friends.map(p => `<div class="fr">${avatar(p, 48)}<span>${esc(N(p.name))}</span></div>`).join("")}<button class="fr add" id="addF2"><span class="avatar" style="width:48px;height:48px;background:var(--ink-3);color:var(--paper)">${icon("plus", 20)}</span><span>${t("me.addFriends")}</span></button></div>

    <div class="section-h"><span class="eyebrow">${t("me.badges")}</span></div>
    <div class="badges">${BADGES.map(b => `<div class="badge ${b.test(st) ? "" : "locked"}"><div class="i">${b.icon}</div><div class="n">${esc(t("badge." + b.id))}</div>${STR.mk["badged." + b.id] ? `<div class="muted" style="font-size:10.5px">${esc(t("badged." + b.id))}</div>` : ""}</div>`).join("")}</div>

    <div class="section-h"><span class="eyebrow">${t("me.league", { m: esc(monthName()) })}</span></div>
    <ul class="league">${league.map(([n, s], k) => `<li class="${n === u.hood ? "me-hood" : ""}"><span class="rank">${k + 1}</span><span class="lname">${esc(N(n))}</span><span class="lbar"><i style="width:${s / max * 100}%"></i></span><b style="width:40px;text-align:right">${s}</b></li>`).join("")}</ul>
    ${u.hood ? `<p class="muted" style="font-size:12.5px;margin-top:8px">${t("me.leagueNote", { h: `<b style="color:var(--sun)">${esc(N(u.hood))}</b>` })}</p>` : ""}

    <div class="section-h"><span class="eyebrow">${icon("globe", 13)} ${t("me.lang")}</span></div>
    <div class="seg wide">${[["mk", "Македонски"], ["en", "English"]].map(([l, n]) => `<button data-lang="${l}" class="${LANG === l ? "on" : ""}">${n}</button>`).join("")}</div>

    <div class="section-h"><span class="eyebrow">${icon("key", 13)} ${t("me.ai")}</span></div>
    <div class="card stack">
      <input class="field" id="key" type="password" placeholder="${esc(t("me.keyPh"))}" value="${esc(AI.cfg.key)}" style="font-size:14px">
      <button class="btn grad block" id="save">${t("me.save")}</button>
      <div class="muted" id="aist" style="font-size:12.5px">${AI.hasKey() ? `${t("me.text")}: ${esc(AI.cfg.textModel)}<br>${t("me.vision")}: ${esc(AI.cfg.visionModel)}` : t("me.noKey")}</div>
    </div>

    <div class="section-h"><span class="eyebrow">${t("me.demo")}</span></div>
    <div class="stack">
      <a class="btn ghost block" href="qr.html" target="_blank">${icon("qr", 18)} ${t("me.qr")}</a>
      <button class="btn ghost block" id="reset">${t("me.reset")}</button>
    </div>
    <p class="muted" style="font-size:11.5px;margin-top:22px;text-align:center">${t("me.footer")}</p>
  </div>`;
  bindLang(view);
  $("#editP").onclick = openEditProfile;
  $("#addF").onclick = () => openFriends("search");
  $("#addF2").onclick = () => openFriends("search");
  $("#allF").onclick = () => openFriends("search");
  $("#save").onclick = async () => {
    AI.cfg.key = $("#key").value;
    $("#aist").textContent = t("me.checking");
    try {
      const r = await AI.testConnection();
      $("#aist").innerHTML = `✓ ${t("me.connected", { n: r.count })}<br>${t("me.text")}: ${esc(r.text)}<br>${t("me.vision")}: ${esc(r.vision)}`;
      localStorage.removeItem("sw_coach");
      toast(t("me.awake") + " ✦");
    } catch (e) { $("#aist").textContent = "✕ " + e.message; }
  };
  $("#reset").onclick = () => {
    if (!confirm(t("me.resetQ"))) return;
    const key = AI.cfg.key, lang = LANG;
    localStorage.clear(); AI.cfg.key = key; setLang(lang);
    state = fresh(); location.hash = ""; render();
  };
}

function openEditProfile() {
  const u = state.user;
  let d = { name: u.name, hood: u.hood, interests: [...u.interests], photo: u.photo };
  const draw = () => {
    const sheet = openSheet(`
      <div class="row"><div class="h1">${t("ed.title")}</div><div class="spacer"></div><button class="icon-btn" id="xEd">${icon("close", 20)}</button></div>
      <div class="edit-photo">${avatar({ ...d, color: "#F6F2EA" }, 88)}<label class="btn sm ghost">${icon("camera", 16)} ${t("ed.photo")}<input type="file" id="edPh" accept="image/*" hidden></label></div>
      <div class="eyebrow" style="margin:16px 0 6px">${t("ed.name")}</div>
      <input class="field" id="edName" value="${esc(d.name)}" maxlength="20">
      <div class="eyebrow" style="margin:16px 0 6px">${t("ed.hood")}</div>
      <div class="chips small">${HOODS.map(([h]) => `<button class="chip ${d.hood === h ? "on" : ""}" data-h="${esc(h)}">${esc(N(h))}</button>`).join("")}</div>
      <div class="eyebrow" style="margin:16px 0 6px">${t("ed.interests")}</div>
      <div class="interest-grid">${INTERESTS.map(i => `<button class="interest ${d.interests.includes(i.id) ? "on" : ""}" data-i="${i.id}"><span>${i.icon}</span>${esc(i[LANG] || i.mk)}</button>`).join("")}</div>
      <button class="btn grad block" id="edSave" style="margin-top:18px" ${d.name.trim() && d.interests.length === 3 ? "" : "disabled"}>${t("ed.save")}</button>`);
    $("#xEd").onclick = closeSheet;
    $("#edName").addEventListener("input", e => { d.name = e.target.value; $("#edSave").disabled = !(d.name.trim() && d.interests.length === 3); });
    $$("[data-h]", sheet).forEach(b => b.onclick = () => { d.hood = b.dataset.h; keep(draw); });
    $$("[data-i]", sheet).forEach(b => b.onclick = () => {
      const id = b.dataset.i;
      if (d.interests.includes(id)) d.interests = d.interests.filter(x => x !== id); else if (d.interests.length < 3) d.interests.push(id);
      keep(draw);
    });
    $("#edPh").addEventListener("change", async e => { const f = e.target.files[0]; if (f) { d.photo = await downscale(f, 256, .8); keep(draw); } });
    $("#edSave").onclick = () => {
      state.user = { ...u, name: d.name.trim(), hood: d.hood, interests: d.interests, photo: d.photo };
      save(); hideSheet(); toast(t("ed.saved")); render();
    };
  };
  const keep = fn => { const y = $(".sheet-card").scrollTop; fn(); $(".sheet-card").scrollTop = y; };
  draw();
}

// ---------------------------------------------------------------------
//  Старт: линкови ?place=… (QR на место) и ?friend=… (покана)
// ---------------------------------------------------------------------
function handlePending() {
  if (!pending || !state.user) return;
  const p = pending; pending = null;
  setTimeout(() => { if (p.place) checkIn(p.place); else if (p.friend) { addFriendByName(p.friend); location.hash = "#now"; render(); } }, 450);
}
(function start() {
  const params = new URLSearchParams(location.search);
  const pl = params.get("place"), fr = params.get("friend");
  if (pl && placeById(pl)) pending = { place: pl };
  else if (fr) pending = { friend: fr.slice(0, 24) };
  if (pending) history.replaceState(null, "", location.pathname + (location.hash || "#map"));
  if (location.hash === "#feed") location.hash = "#now";
  render();
  handlePending();
})();
