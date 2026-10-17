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
const TYPE_COLOR = { "Музеј": "#7B61FF", "Галерија": "#FF8FB1", "Споменик": "#36C5F0", "Тврдина": "#36C5F0", "Театар": "#FF5A36", "Чаршија": "#FFD23F", "Пазар": "#FFD23F", "Маало": "#3DDC97", "Концертна сала": "#FF5A36", "Парк": "#3DDC97", "Хакерспејс": "#3DDC97" };

// ---------------------------------------------------------------------
//  Состојба (се чува во прелистувачот)
// ---------------------------------------------------------------------
const S = {
  load() {
    try { return JSON.parse(localStorage.getItem("sw_state") || "null"); } catch { return null; }
  },
  save() {
    try { localStorage.setItem("sw_state", JSON.stringify(state)); } catch {}
  },
};
let state = S.load() || { user: null, visits: [], joined: [], kudos: [], groups: 0, chat: [] };
let pendingPlace = null;

// ---------------------------------------------------------------------
//  Зони: хексагонална мрежа преку Скопје (~38 зони)
// ---------------------------------------------------------------------
const Z = (() => {
  const lat0 = 41.998, lng0 = 21.425, R = 650;
  const mLat = 1 / 111320, mLng = 1 / (111320 * Math.cos(lat0 * Math.PI / 180));
  const toLL = (x, y) => [lat0 + y * mLat, lng0 + x * mLng];
  const toXY = (lat, lng) => [(lng - lng0) / mLng, (lat - lat0) / mLat];
  const zones = [];
  for (let q = -8; q <= 8; q++) for (let r = -6; r <= 6; r++) {
    const x = R * Math.sqrt(3) * (q + r / 2), y = R * 1.5 * r;
    if ((x / 4300) ** 2 + (y / 3000) ** 2 > 1) continue;
    const [lat, lng] = toLL(x, y);
    let best = null, bd = Infinity;
    for (const [n, hl, hg] of HOODS) { const d = (hl - lat) ** 2 + ((hg - lng) * .74) ** 2; if (d < bd) { bd = d; best = n; } }
    const corners = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); corners.push(toLL(x + R * Math.cos(a), y + R * Math.sin(a))); }
    zones.push({ id: `${q},${r}`, q, r, x, y, lat, lng, name: best, corners });
  }
  const byId = Object.fromEntries(zones.map(z => [z.id, z]));
  function at(lat, lng) {
    const [x, y] = toXY(lat, lng);
    let q = (Math.sqrt(3) / 3 * x - y / 3) / R, r = (2 / 3 * y) / R, s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    return byId[`${rq},${rr}`] || null;
  }
  return { zones, at, byId, R };
})();

// ---------------------------------------------------------------------
//  Настани (датуми релативни на денес)
// ---------------------------------------------------------------------
const MONTHS = ["јануари","февруари","март","април","мај","јуни","јули","август","септември","октомври","ноември","декември"];
const monthName = () => MONTHS[new Date().getMonth()];
const WD = ["Недела", "Понеделник", "Вторник", "Среда", "Четврток", "Петок", "Сабота"];
function getEvents() {
  const now = new Date();
  return EVENT_TEMPLATES.map((e, i) => {
    const d = new Date(now); d.setDate(d.getDate() + e.day);
    const p = placeById(e.place);
    return { ...e, id: "ev" + i, date: d, dateLabel: e.day === 0 ? "Денес" : e.day === 1 ? "Утре" : WD[d.getDay()], placeName: p.name, hood: p.hood, lat: p.lat, lng: p.lng };
  });
}

// ---------------------------------------------------------------------
//  Статистика
// ---------------------------------------------------------------------
function stats() {
  const v = state.visits;
  const zoneIds = new Set(), zoneNames = new Set(), typeCount = {}, tagCount = {}, placeCount = {}, zoneCount = {};
  let night = 0;
  for (const x of v) {
    const p = placeById(x.place); if (!p) continue;
    const z = Z.at(p.lat, p.lng);
    if (z) { zoneIds.add(z.id); zoneNames.add(z.name); zoneCount[z.id] = (zoneCount[z.id] || 0) + 1; }
    typeCount[p.type] = (typeCount[p.type] || 0) + 1;
    for (const t of p.tags) tagCount[t] = (tagCount[t] || 0) + 1;
    placeCount[p.id] = (placeCount[p.id] || 0) + 1;
    if (new Date(x.ts).getHours() >= 20) night++;
  }
  const top = Object.entries(placeCount).sort((a, b) => b[1] - a[1])[0];
  return {
    visits: v.length, zones: zoneIds.size, totalZones: Z.zones.length, zoneIds, zoneCount,
    zoneNames: [...zoneNames], typeCount, tagCount, placeCount, night, groups: state.groups,
    topPlace: top ? placeById(top[0]).name : null, topPlaceId: top?.[0],
  };
}

function seedDemo() {
  const day = 864e5, now = Date.now();
  const mk = (place, daysAgo, hour, mood, note) => {
    const d = new Date(now - daysAgo * day); d.setHours(hour, 10 + Math.floor(Math.random() * 40));
    return { id: "d" + Math.random().toString(36).slice(2, 8), place, ts: d.getTime(), mood, note, demo: true };
  };
  state.visits = [
    mk("kamen-most", 19, 17, "🙂", "Прошетка до чаршијата."),
    mk("kale", 16, 18, "😍", "Зајдисонце од Калето."),
    mk("daut-pasin-amam", 12, 12, "😍", "Изложбата под куполите."),
    mk("univerzalna-sala", 9, 21, "🔥", "Концерт до полноќ."),
    mk("debar-maalo", 5, 22, "🙂", "Џез во мал бар."),
    mk("opera", 3, 20, "😍", "Прв пат на балет!"),
    mk("kurshumli-an", 1, 13, "🙂", ""),
  ];
}

// ---------------------------------------------------------------------
//  Помошни
// ---------------------------------------------------------------------
function toast(msg, ms = 2600) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), ms);
}
function confetti() {
  const box = document.createElement("div"); box.className = "confetti";
  const cols = ["#FFD23F", "#FF5A36", "#7B61FF", "#3DDC97", "#36C5F0", "#FF8FB1"];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement("i");
    c.style.left = Math.random() * 100 + "%";
    c.style.background = cols[i % cols.length];
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
    c.style.animationDelay = Math.random() * .4 + "s";
    box.appendChild(c);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3600);
}
function ago(ts) {
  const m = Math.round((Date.now() - ts) / 6e4);
  if (m < 1) return "штотуку";
  if (m < 60) return `пред ${m} мин.`;
  const h = Math.round(m / 60); if (h < 24) return `пред ${h} ч.`;
  const d = Math.round(h / 24); return d === 1 ? "вчера" : `пред ${d} дена`;
}
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const avatar = (name, color) => `<div class="avatar" style="background:${color}">${esc(name[0])}</div>`;
function dist(a, b) { const dx = (a.lng - b.lng) * 82000, dy = (a.lat - b.lat) * 111000; return Math.sqrt(dx * dx + dy * dy); }
function getPos() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { timeout: 6000, maximumAge: 60000 });
  });
}
function openSheet(html) { const sh = $("#sheet"); $(".sheet-card", sh).innerHTML = html; sh.hidden = false; return $(".sheet-card", sh); }
function closeSheet() { $("#sheet").hidden = true; stopScanner(); render(); }
$("#sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });

// ---------------------------------------------------------------------
//  Рутер
// ---------------------------------------------------------------------
let map = null;
function render() {
  const view = $("#view");
  if (map) { map.remove(); map = null; }
  if (!state.user) { $("#tabbar").hidden = true; view.classList.add("full"); return renderOnboarding(view); }
  $("#tabbar").hidden = false; view.classList.remove("full");
  const tab = (location.hash || "#map").slice(1);
  $$("#tabbar a").forEach(a => a.classList.toggle("active", a.dataset.tab === tab));
  ({ map: renderMap, feed: renderFeed, skopi: renderSkopi, wrapped: renderWrappedHome, me: renderMe }[tab] || renderMap)(view);
}
window.addEventListener("hashchange", render);

// ---------------------------------------------------------------------
//  Онбординг
// ---------------------------------------------------------------------
function renderOnboarding(view) {
  let step = 0, name = "", picks = [];
  const draw = () => {
    if (step === 0) {
      view.innerHTML = `<div class="onb">
        <div class="onb-hero">
          <img class="orb" src="icon.svg" alt="">
          <div class="h-display big">Скопје<br><span class="grad-text">Wrapped</span></div>
          <p class="muted" style="font-size:17px">Strava за култура. Секоја изложба, концерт и претстава ја обојува твојата мапа на Скопје — а Скопи, твојот AI другар, ти кажува каде следно.</p>
        </div>
        <div class="stack">
          <input class="field" id="nm" placeholder="Како се викаш?" autocomplete="given-name" maxlength="20">
          <button class="btn grad block" id="go" disabled>Почни</button>
        </div></div>`;
      const nm = $("#nm"), go = $("#go");
      nm.addEventListener("input", () => (go.disabled = !nm.value.trim()));
      nm.addEventListener("keydown", e => e.key === "Enter" && nm.value.trim() && go.click());
      go.onclick = () => { name = nm.value.trim(); step = 1; draw(); };
    } else {
      view.innerHTML = `<div class="onb">
        <div class="onb-hero" style="justify-content:flex-start;padding-top:20px">
          <div class="eyebrow">Чекор 2 од 2</div>
          <div class="h1">Здраво ${esc(name)}! Избери 3 работи што те палат.</div>
          <p class="muted">Скопи ќе ги користи за предлози и за да те спои со екипа.</p>
          <div class="chips">${INTERESTS.map(i => `<button class="chip ${picks.includes(i) ? "on" : ""}" data-i="${esc(i)}">${esc(i)}</button>`).join("")}</div>
        </div>
        <button class="btn grad block" id="go" ${picks.length === 3 ? "" : "disabled"}>${picks.length === 3 ? "Ајде во градот" : `Избери уште ${3 - picks.length}`}</button>
      </div>`;
      $$(".chip", view).forEach(c => c.onclick = () => {
        const i = c.dataset.i;
        if (picks.includes(i)) picks = picks.filter(x => x !== i); else if (picks.length < 3) picks.push(i);
        draw();
      });
      $("#go").onclick = () => {
        state.user = { name, interests: picks, demo: true };
        seedDemo(); S.save();
        location.hash = "#map"; render();
        if (pendingPlace) { const p = pendingPlace; pendingPlace = null; setTimeout(() => checkIn(p), 400); }
      };
    }
  };
  draw();
}

// ---------------------------------------------------------------------
//  Мапа
// ---------------------------------------------------------------------
function renderMap(view) {
  const st = stats();
  const pct = Math.round(st.zones / st.totalZones * 100);
  view.innerHTML = `<div class="map-wrap">
    <div id="map"></div>
    <div class="map-top">
      <div class="stat-glass explored">
        <div class="row"><div class="big">${pct}%</div><div class="muted" style="font-size:12px;line-height:1.25">од Скопје<br>истражено</div><div class="spacer"></div><div style="text-align:right"><b style="font-family:var(--display)">${st.zones}/${st.totalZones}</b><div class="muted" style="font-size:11px">зони</div></div></div>
        <div class="bar"><i style="width:${Math.max(pct, 2)}%"></i></div>
      </div>
    </div>
    <div class="map-actions">
      <div class="coach"><img src="icon.svg" alt=""><div><div class="eyebrow" style="color:var(--sun)">Предизвик од Скопи</div><div class="t" id="coachTxt"><span class="typing"><i></i><i></i><i></i></span></div></div></div>
      <div class="fab-row">
        <button class="btn grad" id="scanBtn">⌗ Скенирај QR</button>
        <button class="btn" id="photoBtn">◉ Сликај</button>
      </div>
    </div>
  </div>`;

  map = L.map("map", { zoomControl: false, attributionControl: true }).setView([41.9985, 21.428], 13);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: "abcd", maxZoom: 19,
  }).addTo(map);

  for (const z of Z.zones) {
    const n = st.zoneCount[z.id] || 0;
    const fill = n >= 3 ? "#FFD23F" : n === 2 ? "#FF8A3D" : n === 1 ? "#FF5A36" : "#7B61FF";
    L.polygon(z.corners, {
      color: n ? fill : "#3a3a4a", weight: n ? 1.5 : 1, opacity: n ? .9 : .6,
      fillColor: fill, fillOpacity: n ? .32 + Math.min(n, 4) * .07 : .05,
    }).addTo(map).bindTooltip(`${esc(z.name)}${n ? ` · ${n} посет${n === 1 ? "а" : "и"}` : " · неоткриена"}`, { direction: "center", className: "" });
  }
  for (const p of PLACES) {
    const visited = !!st.placeCount[p.id];
    const m = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", html: `<div class="place-dot ${visited ? "visited" : ""}"></div>`, iconSize: [14, 14] }) }).addTo(map);
    m.bindPopup(`<div class="h2">${esc(p.name)}</div><div class="muted" style="font-size:12px;margin-bottom:10px">${TYPE_ICON[p.type] || ""} ${esc(p.type)} · ${esc(p.hood)}${visited ? ` · ${st.placeCount[p.id]}× посетено` : ""}</div>
      <div class="row"><button class="btn sm grad" data-ci="${p.id}">Чекирај се</button><button class="btn sm ghost" data-ask="${p.id}">Прашај</button></div>`);
  }
  map.on("popupopen", e => {
    const el = e.popup.getElement();
    $("[data-ci]", el)?.addEventListener("click", ev => { map.closePopup(); checkIn(ev.target.dataset.ci); });
    $("[data-ask]", el)?.addEventListener("click", ev => { const p = placeById(ev.target.dataset.ask); askSkopi(`Раскажи ми за ${p.name}. Што има таму оваа недела?`); });
  });

  $("#scanBtn").onclick = openScanner;
  $("#photoBtn").onclick = () => $("#photoInput").click();
  loadCoach();
}

async function loadCoach() {
  const key = new Date().toDateString() + "|" + state.visits.length;
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
  const p = placeById(placeId); if (!p) return toast("Непознато место");
  const before = stats();
  const z = Z.at(p.lat, p.lng);
  const isNewZone = z && !before.zoneIds.has(z.id);
  const visit = { id: "v" + Date.now(), place: p.id, ts: Date.now(), mood: "", note: "", ...extra };
  state.visits.push(visit); S.save();
  confetti();
  const after = stats();
  const sheet = openSheet(`
    <div class="checkin-hero">
      <div class="plus">+1 културен излез · #${after.visits}</div>
      <div class="h1" style="margin-top:8px">${esc(p.name)}</div>
      <div style="font-weight:700;margin-top:4px">${TYPE_ICON[p.type] || ""} ${esc(p.type)} · ${esc(p.hood)}</div>
    </div>
    ${isNewZone ? `<div class="new-zone">✦ Нова зона откриена: ${esc(z.name)} — ${after.zones}/${after.totalZones}</div>` : ""}
    ${extra.photo ? `<img class="photo-prev" style="margin-top:12px" src="${extra.photo}" alt="">` : ""}
    <div class="skopi-says"><img src="icon.svg" alt=""><div class="bubble" id="story"><span class="typing"><i></i><i></i><i></i></span></div></div>
    <div class="row" style="margin-top:10px">
      <input class="field" id="askIn" placeholder="Прашај го Скопи за ова место…" style="height:46px;font-size:15px">
      <button class="btn sm grad" id="askBtn" style="height:46px">→</button>
    </div>
    <div class="eyebrow" style="margin:18px 0 8px">Како беше?</div>
    <div class="moods">${["😍", "🔥", "🙂", "😐"].map(m => `<button data-m="${m}">${m}</button>`).join("")}</div>
    <button class="btn block" id="doneBtn" style="margin-top:16px">Готово</button>
  `);
  $$(".moods button", sheet).forEach(b => b.onclick = () => {
    $$(".moods button", sheet).forEach(x => x.classList.remove("on")); b.classList.add("on");
    visit.mood = b.dataset.m; S.save();
  });
  $("#doneBtn").onclick = closeSheet;
  const ask = async () => {
    const q = $("#askIn").value.trim(); if (!q) return;
    $("#askIn").value = "";
    const story = $("#story");
    story.innerHTML += `\n\n<b>Ти:</b> ${esc(q)}\n<span class="typing"><i></i><i></i><i></i></span>`;
    const a = await AI.skopiReply([{ role: "user", content: `Сега сум во ${p.name}. ${q}` }], state.user, stats(), getEvents());
    $(".typing", story)?.remove();
    story.innerHTML += esc(a);
  };
  $("#askBtn").onclick = ask;
  $("#askIn").addEventListener("keydown", e => e.key === "Enter" && ask());
  const txt = await AI.placeStory(p, state.user);
  const el = $("#story"); if (el) el.textContent = txt;
  visit.story = txt; S.save();
}

let scanner = null;
function stopScanner() { if (scanner) { scanner.stop().catch(() => {}); scanner = null; } }
function openScanner() {
  const sheet = openSheet(`
    <div class="h1">Скенирај QR</div>
    <p class="muted" style="margin:6px 0 14px">Насочи ја камерата кон налепницата на културното место.</p>
    <div id="reader"></div>
    <div class="eyebrow" style="margin:18px 0 8px">Нема QR? Избери место (демо)</div>
    <div class="place-pick">${PLACES.map(p => `<button data-p="${p.id}">${TYPE_ICON[p.type] || "•"} <b>${esc(p.name)}</b> <span class="muted">· ${esc(p.hood)}</span></button>`).join("")}</div>
  `);
  $$("[data-p]", sheet).forEach(b => b.onclick = () => { stopScanner(); $("#sheet").hidden = true; checkIn(b.dataset.p); });
  try {
    scanner = new Html5Qrcode("reader");
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, txt => {
      const id = parsePlace(txt);
      if (!id) return toast("Овој QR не е од Скопје Wrapped");
      stopScanner(); $("#sheet").hidden = true; checkIn(id);
    }).catch(err => {
      $("#reader").innerHTML = `<p class="muted" style="padding:20px">Камерата не е достапна (${esc(err?.message || err)}). Можеш да ја скенираш налепницата и со обичната камера на телефонот, или избери место подолу.</p>`;
      scanner = null;
    });
  } catch (e) { console.warn(e); }
}
function parsePlace(txt) {
  try { const u = new URL(txt); const id = u.searchParams.get("place"); if (placeById(id)) return id; } catch {}
  return placeById(txt.trim()) ? txt.trim() : null;
}

// Фото → активност
$("#photoInput").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  const big = await downscale(f, 768, .8), thumb = await downscale(f, 360, .7);
  const sheet = openSheet(`
    <img class="photo-prev" src="${big}" alt="">
    <div class="skopi-says"><img src="icon.svg" alt=""><div class="bubble" id="ph"><span class="typing"><i></i><i></i><i></i></span> Гледам каде си…</div></div>
    <div id="phActs" style="margin-top:14px"></div>`);
  const pos = (await getPos()) || DEMO_HOME;
  const cands = PLACES.slice().sort((a, b) => dist(a, pos) - dist(b, pos)).slice(0, 5);
  const manual = msg => {
    $("#ph").textContent = msg;
    $("#phActs").innerHTML = `<div class="place-pick">${cands.map(p => `<button data-p="${p.id}">${TYPE_ICON[p.type] || "•"} <b>${esc(p.name)}</b> <span class="muted">· ${Math.round(dist(p, pos))} м</span></button>`).join("")}</div>`;
    $$("[data-p]", sheet).forEach(b => b.onclick = () => { $("#sheet").hidden = true; checkIn(b.dataset.p, { photo: thumb }); });
  };
  if (!AI.hasKey()) return manual("Каде е ова? Избери од најблиските места. (За автоматско препознавање, внеси Groq клуч во Профил.)");
  try {
    const r = await AI.photoActivity(big, cands);
    const p = placeById(r.place_id) || cands[0];
    $("#ph").innerHTML = `<b>${esc(r.title || r.kind)}</b>\n${esc(r.caption || "")}\n\n<span class="muted">📍 ${esc(p.name)} · ${esc(r.kind || p.type)}</span>`;
    $("#phActs").innerHTML = `<button class="btn grad block" id="ok">Зачувај активност</button><button class="btn ghost block" id="other" style="margin-top:8px">Друго место</button>`;
    $("#ok").onclick = () => { $("#sheet").hidden = true; checkIn(p.id, { photo: thumb, title: r.title, caption: r.caption, kind: r.kind }); };
    $("#other").onclick = () => manual("Во ред, каде си тогаш?");
  } catch (err) {
    console.warn(err);
    manual("Не успеав да ја прочитам сликата. Избери место:");
  }
});
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

// ---------------------------------------------------------------------
//  Фид
// ---------------------------------------------------------------------
function renderFeed(view) {
  const events = getEvents();
  const me = state.user;
  const posts = [
    ...state.visits.filter(v => !v.demo || Date.now() - v.ts < 3 * 864e5).map(v => ({ id: v.id, who: me.name, color: "#F6F2EA", mine: true, place: v.place, ts: v.ts, mood: v.mood, note: v.caption || v.note, title: v.title, photo: v.photo })),
    ...FRIEND_ACTIVITY.map((a, i) => ({ id: "f" + i, who: a.who, color: FRIENDS.find(f => f.name === a.who).color, place: a.place, ts: Date.now() - a.hoursAgo * 36e5, mood: a.mood, note: a.note })),
  ].sort((a, b) => b.ts - a.ts);
  const st = stats();

  view.innerHTML = `<div class="screen">
    <div class="eyebrow">Оваа недела во Скопје</div>
    <div class="h1" style="margin:4px 0 14px">Каде одиме?</div>
    <div class="events-strip">${events.map(e => {
      const going = 3 + (hash(e.title) % 19) + (state.joined.includes(e.id) ? 1 : 0);
      const col = TYPE_COLOR[placeById(e.place).type] || "#FF5A36";
      return `<div class="ev"><div class="stripe" style="background:${col}"></div>
        <div class="row"><div class="when" style="color:${col}">${e.dateLabel} · ${e.time}</div><div class="spacer"></div><span class="pill">${e.price ? e.price + " ден." : "бесплатно"}</span></div>
        <div class="title">${esc(e.title)}</div>
        <div class="muted" style="font-size:13px">${esc(e.placeName)} · ${esc(e.hood)}</div>
        <div class="muted" style="font-size:12px;margin-top:6px">👥 ${going} одат</div>
        <div class="acts">
          <button class="btn sm ${state.joined.includes(e.id) ? "" : "grad"}" data-join="${e.id}">${state.joined.includes(e.id) ? "✓ Одам" : "И јас одам"}</button>
          <button class="btn sm ghost" data-crew="${e.id}">Најди екипа</button>
        </div></div>`;
    }).join("")}</div>

    <div class="eyebrow" style="margin-top:22px">Активности</div>
    ${posts.map(p => {
      const pl = placeById(p.place);
      const z = Z.at(pl.lat, pl.lng);
      const legend = p.mine && (st.placeCount[pl.id] || 0) >= 2;
      const kud = 2 + (hash(p.id) % 14) + (state.kudos.includes(p.id) ? 1 : 0);
      return `<div class="post">
        <div class="head">${avatar(p.who, p.color)}<div><div class="who">${esc(p.who)}${p.mine ? ' <span class="pill sun">ти</span>' : ""}</div><div class="what">${ago(p.ts)} · ${esc(z?.name || pl.hood)}</div></div><div class="spacer"></div><div style="font-size:22px">${p.mood || ""}</div></div>
        <div class="body">
          <div class="place-card"><div class="ico" style="background:${TYPE_COLOR[pl.type] || "#333"}22">${TYPE_ICON[pl.type] || "•"}</div><div><div style="font-weight:800">${esc(p.title || pl.name)}</div><div class="muted" style="font-size:12.5px">${esc(pl.type)}${p.title ? " · " + esc(pl.name) : " · " + esc(pl.hood)}</div></div></div>
          ${legend ? `<div style="margin-top:8px"><span class="pill hot">👑 Локална легенда на ${esc(pl.name)}</span></div>` : ""}
          ${p.photo ? `<img class="photo" src="${p.photo}" alt="">` : ""}
          ${p.note ? `<div class="note">${esc(p.note)}</div>` : ""}
          <div class="foot"><button class="chip kudos ${state.kudos.includes(p.id) ? "on" : ""}" data-kudo="${p.id}">👏 ${kud}</button>${p.mine ? "" : `<button class="chip" data-same="${pl.id}">И јас сакам да одам</button>`}</div>
        </div></div>`;
    }).join("")}
  </div>`;

  $$("[data-join]", view).forEach(b => b.onclick = () => {
    const id = b.dataset.join;
    state.joined = state.joined.includes(id) ? state.joined.filter(x => x !== id) : [...state.joined, id];
    S.save(); if (state.joined.includes(id)) toast("Супер! Скопи ќе те потсети."); render();
  });
  $$("[data-crew]", view).forEach(b => b.onclick = () => openCrew(events.find(e => e.id === b.dataset.crew)));
  $$("[data-kudo]", view).forEach(b => b.onclick = () => {
    const id = b.dataset.kudo;
    state.kudos = state.kudos.includes(id) ? state.kudos.filter(x => x !== id) : [...state.kudos, id];
    S.save(); render();
  });
  $$("[data-same]", view).forEach(b => b.onclick = () => askSkopi(`Сакам да одам во ${placeById(b.dataset.same).name}. Кога има нешто таму?`));
}

async function openCrew(ev) {
  const mine = state.user.interests;
  const group = FRIENDS.map(f => ({ ...f, score: f.interests.filter(i => mine.includes(i)).length + (hash(f.name + ev.id) % 3) * .1 }))
    .sort((a, b) => b.score - a.score).slice(0, 4);
  const sheet = openSheet(`
    <div class="eyebrow">Скопи ти најде екипа</div>
    <div class="h1" style="margin:6px 0 4px">${esc(ev.title)}</div>
    <div class="muted">${ev.dateLabel} · ${ev.time} · ${esc(ev.placeName)}</div>
    <div class="group-grid" style="margin-top:16px">
      <div class="card">${avatar(state.user.name, "#F6F2EA")}<div><b>${esc(state.user.name)}</b><div class="muted" style="font-size:11.5px">ти</div></div></div>
      ${group.map(g => `<div class="card">${avatar(g.name, g.color)}<div><b>${esc(g.name)}</b><div class="muted" style="font-size:11.5px">${g.interests.filter(i => mine.includes(i)).map(esc).join(", ") || "нови вкусови"}</div></div></div>`).join("")}
    </div>
    <p class="muted" style="font-size:12.5px;margin-top:10px">Спојувањето е според заедничките интереси. Само групи од 4–6 луѓе, на јавно културно место.</p>
    <div class="skopi-says"><img src="icon.svg" alt=""><div class="bubble"><div class="eyebrow" style="margin-bottom:4px">Ледоломец</div><span id="ice"><span class="typing"><i></i><i></i><i></i></span></span></div></div>
    <button class="btn grad block" id="joinCrew" style="margin-top:16px">Влези во екипата</button>`);
  $("#joinCrew").onclick = () => {
    state.groups++; if (!state.joined.includes(ev.id)) state.joined.push(ev.id); S.save();
    $("#sheet").hidden = true; confetti(); toast("Добредојде во екипата! 👯"); render();
  };
  const ice = await AI.icebreaker(ev, [{ name: state.user.name, interests: mine }, ...group]);
  const el = $("#ice"); if (el) el.textContent = ice;
}

// ---------------------------------------------------------------------
//  Скопи — разговор
// ---------------------------------------------------------------------
function askSkopi(q) { location.hash = "#skopi"; setTimeout(() => sendChat(q), 50); }
function renderSkopi(view) {
  if (!state.chat.length) state.chat.push({ role: "assistant", content: `Здраво ${state.user.name}! Јас сум Скопи, твојот културен другар. 👋\nКажи ми колку време и пари имаш и какво ти е расположението — а јас ќе ти кажам каде да одиш.` });
  view.innerHTML = `<div class="chat">
    <div class="chat-head"><img src="icon.svg" alt=""><div><div class="h2">Скопи</div><div class="muted" style="font-size:12px">${AI.hasKey() ? "● AI другар · open-weight модел" : "○ офлајн режим — внеси клуч во Профил"}</div></div><div class="spacer"></div><button class="chip" id="clr">Нов разговор</button></div>
    <div class="chat-log" id="log">${state.chat.map(m => `<div class="msg ${m.role === "user" ? "me" : "bot"}">${esc(m.content)}</div>`).join("")}</div>
    <div class="chat-suggest">${["Имам 500 ден. и слободен сум до 22 ч. Шо да правам?", "Нешто бесплатно викендов?", "Ми е досадно од кафулиња 😅", "Каде да одам ако сакам историја?"].map(s => `<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div>
    <form class="chat-input" id="f"><input id="q" placeholder="Прашај го Скопи…" autocomplete="off"><button class="send" type="submit">→</button></form>
  </div>`;
  const log = $("#log"); log.scrollTop = log.scrollHeight;
  $("#f").onsubmit = e => { e.preventDefault(); const q = $("#q").value.trim(); if (q) { $("#q").value = ""; sendChat(q); } };
  $$("[data-s]", view).forEach(b => b.onclick = () => sendChat(b.dataset.s));
  $("#clr").onclick = () => { state.chat = []; S.save(); render(); };
}
let chatBusy = false;
async function sendChat(q) {
  if (chatBusy) return; chatBusy = true;
  state.chat.push({ role: "user", content: q }); S.save();
  const log = $("#log");
  if (log) {
    log.insertAdjacentHTML("beforeend", `<div class="msg me">${esc(q)}</div><div class="msg bot" id="pending"><span class="typing"><i></i><i></i><i></i></span></div>`);
    log.scrollTop = log.scrollHeight;
  }
  const hist = state.chat.slice(-10).map(m => ({ role: m.role, content: m.content }));
  const a = await AI.skopiReply(hist, state.user, stats(), getEvents());
  state.chat.push({ role: "assistant", content: a }); S.save();
  const pend = $("#pending");
  if (pend) { pend.removeAttribute("id"); pend.textContent = a; $("#log").scrollTop = 1e9; }
  chatBusy = false;
}

// ---------------------------------------------------------------------
//  Wrapped
// ---------------------------------------------------------------------
function renderWrappedHome(view) {
  const st = stats();
  const month = monthName();
  view.innerHTML = `<div class="screen">
    <div class="eyebrow">Твојот месец</div>
    <div class="h-display" style="font-size:44px;margin:6px 0 10px">Скопје<br><span class="grad-text">Wrapped</span></div>
    <p class="muted">Скопи го сумира твојот ${esc(month)}: каде беше, што откри и која културна личност си.</p>
    <div class="card" style="margin-top:18px;display:grid;grid-template-columns:repeat(3,1fr);text-align:center;gap:8px">
      <div><div class="h1">${st.visits}</div><div class="muted" style="font-size:12px">излези</div></div>
      <div><div class="h1">${st.zones}</div><div class="muted" style="font-size:12px">зони</div></div>
      <div><div class="h1">${st.zoneNames.length}</div><div class="muted" style="font-size:12px">маала</div></div>
    </div>
    <button class="btn grad block" id="play" style="margin-top:18px;height:58px;font-size:17px" ${st.visits ? "" : "disabled"}>▶ Пушти го мојот Wrapped</button>
    ${st.visits ? "" : `<p class="muted" style="margin-top:10px">Чекирај се некаде за да добиеш Wrapped!</p>`}
  </div>`;
  $("#play").onclick = playWrapped;
}

async function playWrapped() {
  const st = stats();
  const app = $("#app");
  const box = document.createElement("div"); box.className = "story";
  box.innerHTML = `<div class="slide s-ink" style="align-items:center;text-align:center"><img src="icon.svg" style="width:90px;animation:bob 1.5s infinite"><div class="h2">Скопи ја пишува твојата приказна…</div></div>`;
  app.appendChild(box);
  const w = await AI.wrapped(state.user, st);
  const month = monthName();
  const placeName = st.topPlace || "—";
  const slides = [
    `<div class="slide s-ink"><div class="eyebrow">Скопје Wrapped · ${esc(month)}</div><div class="big">${esc(state.user.name)},<br>ова беше <span class="grad-text">твојот град</span> овој месец.</div></div>`,
    `<div class="slide s-coral"><div class="eyebrow" style="color:var(--ink)">Културни излези</div><div class="huge">${st.visits}</div><div class="line">${st.night ? `${st.night} од нив по 20 ч. Ноќта е твоја.` : "Секој излез е нова точка на мапата."}</div></div>`,
    `<div class="slide s-sun"><div class="eyebrow" style="color:var(--ink)">Зони откриени</div><div class="huge">${st.zones}<span style="font-size:40px">/${st.totalZones}</span></div><div class="line">${esc(w.zones_line)}</div><div style="font-weight:800">${st.zoneNames.map(esc).join(" · ")}</div></div>`,
    `<div class="slide s-violet"><div class="eyebrow" style="color:var(--paper)">Твоето место</div><div class="big">${esc(placeName)}</div><div class="line">${esc(w.fav_line)}</div></div>`,
    `<div class="slide s-mint"><div class="eyebrow" style="color:var(--ink)">Твојата културна личност</div><div class="big">${esc(w.persona)}</div><div class="line">${esc(w.persona_line)}</div></div>`,
    `<div class="slide s-ink"><img src="icon.svg" style="width:70px"><div class="big" style="font-size:30px">${esc(w.roast)}</div><div class="line muted">${esc(w.next)}</div></div>`,
    `<div class="slide s-ink" style="justify-content:flex-start;padding-top:60px;gap:12px">${shareCardHTML(st, w, month)}
      <div class="row"><button class="btn grad" style="flex:1" id="dl">Зачувај за Instagram</button><button class="btn ghost" id="again">↺</button></div></div>`,
  ];
  let i = 0, timer;
  const show = () => {
    clearTimeout(timer);
    box.innerHTML = `<div class="story-progress">${slides.map((_, k) => `<i class="${k < i ? "done" : k === i ? "cur" : ""}"><b></b></i>`).join("")}</div><button class="story-close" id="x">✕</button>` + slides[i];
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

function hexSVG(st) {
  const xs = Z.zones.map(z => z.x), ys = Z.zones.map(z => z.y), R = Z.R;
  const minX = Math.min(...xs) - R, maxX = Math.max(...xs) + R, minY = Math.min(...ys) - R, maxY = Math.max(...ys) + R;
  const poly = z => { const pts = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 30); pts.push(`${(z.x + R * .92 * Math.cos(a) - minX).toFixed(0)},${(maxY - (z.y + R * .92 * Math.sin(a))).toFixed(0)}`); } return pts.join(" "); };
  return `<svg viewBox="0 0 ${(maxX - minX).toFixed(0)} ${(maxY - minY).toFixed(0)}" xmlns="http://www.w3.org/2000/svg">${Z.zones.map(z => {
    const n = st.zoneCount[z.id] || 0;
    const fill = n >= 3 ? "#FFD23F" : n === 2 ? "#FF8A3D" : n === 1 ? "#FF5A36" : "#22222C";
    return `<polygon points="${poly(z)}" fill="${fill}"/>`;
  }).join("")}</svg>`;
}
function shareCardHTML(st, w, month) {
  return `<div class="share-card" id="shareCard">
    <div class="sc-top"><div class="sc-brand">СКОПЈЕ <span class="grad-text">WRAPPED</span></div><div class="muted" style="font-size:11px;font-weight:800;text-transform:uppercase">${esc(month)}</div></div>
    <div class="sc-persona">${esc(state.user.name)} е<br><span class="grad-text">${esc(w.persona)}</span></div>
    <div class="sc-hex">${hexSVG(st)}</div>
    <div class="sc-stats"><div><b>${st.visits}</b><span>излези</span></div><div><b>${st.zones}/${st.totalZones}</b><span>зони</span></div><div><b>${st.zoneNames.length}</b><span>маала</span></div></div>
    <div class="sc-roast">„${esc(w.roast)}“ — Скопи</div>
  </div>`;
}
async function downloadCard() {
  const card = $("#shareCard"); if (!card) return;
  toast("Ја правам сликата…");
  try {
    const canvas = await html2canvas(card, { backgroundColor: "#0E0E12", scale: 3, useCORS: true });
    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    const file = new File([blob], "skopje-wrapped.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Мојот Скопје Wrapped" }); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "skopje-wrapped.png"; a.click();
    toast("Зачувано! 📸");
  } catch (e) { console.warn(e); toast("Не успеав да ја зачувам — направи screenshot 🙂"); }
}

// ---------------------------------------------------------------------
//  Профил
// ---------------------------------------------------------------------
function renderMe(view) {
  const st = stats();
  const myHood = Object.entries(st.zoneCount).sort((a, b) => b[1] - a[1])[0];
  const myHoodName = myHood ? Z.byId[myHood[0]].name : null;
  const league = LEAGUE.map(([n, s]) => [n, s + (n === myHoodName ? st.visits * 10 : 0)]).sort((a, b) => b[1] - a[1]);
  const max = league[0][1];
  view.innerHTML = `<div class="screen">
    <div class="row">${avatar(state.user.name, "#F6F2EA").replace('class="avatar"', 'class="avatar" style="width:58px;height:58px;font-size:22px;background:#F6F2EA"')}<div><div class="h1">${esc(state.user.name)}</div><div class="muted">${state.user.interests.map(esc).join(" · ")}</div></div></div>

    <div class="eyebrow" style="margin:24px 0 10px">Значки</div>
    <div class="badges">${BADGES.map(b => `<div class="badge ${b.test(st) ? "" : "locked"}"><div class="i">${b.icon}</div><div class="n">${esc(b.name)}</div>${b.desc ? `<div class="muted" style="font-size:10.5px">${esc(b.desc)}</div>` : ""}</div>`).join("")}</div>

    <div class="eyebrow" style="margin:26px 0 4px">Маалска лига · ${monthName()}</div>
    <ul class="league">${league.map(([n, s], k) => `<li class="${n === myHoodName ? "me-hood" : ""}"><span class="rank">${k + 1}</span><span style="width:110px;font-weight:700">${esc(n)}</span><span class="lbar"><i style="width:${s / max * 100}%"></i></span><b style="width:40px;text-align:right">${s}</b></li>`).join("")}</ul>
    ${myHoodName ? `<p class="muted" style="font-size:12.5px;margin-top:8px">Твоите излези носат поени за <b style="color:var(--sun)">${esc(myHoodName)}</b>.</p>` : ""}

    <div class="eyebrow" style="margin:26px 0 10px">AI поставки (Groq · open-weight модели)</div>
    <div class="card stack">
      <input class="field" id="key" type="password" placeholder="gsk_… Groq API клуч" value="${esc(AI.cfg.key)}" style="font-size:14px">
      <button class="btn grad block" id="save">Зачувај и тестирај</button>
      <div class="muted" id="aist" style="font-size:12.5px">${AI.hasKey() ? `Текст: ${esc(AI.cfg.textModel)}<br>Слики: ${esc(AI.cfg.visionModel)}` : "Без клуч Скопи работи во офлајн режим."}</div>
    </div>

    <div class="eyebrow" style="margin:26px 0 10px">Демо</div>
    <div class="stack">
      <a class="btn ghost block" href="qr.html" target="_blank">⌗ QR налепници за печатење</a>
      <button class="btn ghost block" id="reset">Почни од почеток</button>
    </div>
    <p class="muted" style="font-size:11.5px;margin-top:22px;text-align:center">Скопје Wrapped · Hacktoberfest 2026 · Base42<br>Отворен код · AI: open-weight модели преку Groq</p>
  </div>`;
  $("#save").onclick = async () => {
    AI.cfg.key = $("#key").value;
    $("#aist").textContent = "Проверувам…";
    try {
      const r = await AI.testConnection();
      $("#aist").innerHTML = `✓ Поврзано (${r.count} модели)<br>Текст: ${esc(r.text)}<br>Слики: ${esc(r.vision)}`;
      localStorage.removeItem("sw_coach");
      toast("Скопи е буден! ✦");
    } catch (e) { $("#aist").textContent = "✕ " + e.message; }
  };
  $("#reset").onclick = () => {
    if (!confirm("Да се избришат сите податоци на овој уред?")) return;
    const key = AI.cfg.key;
    localStorage.clear(); AI.cfg.key = key;
    state = { user: null, visits: [], joined: [], kudos: [], groups: 0, chat: [] };
    location.hash = ""; render();
  };
}

// ---------------------------------------------------------------------
//  Старт
// ---------------------------------------------------------------------
(function start() {
  const params = new URLSearchParams(location.search);
  const pid = params.get("place");
  if (pid && placeById(pid)) {
    history.replaceState(null, "", location.pathname + (location.hash || "#map"));
    if (state.user) setTimeout(() => checkIn(pid), 500); else pendingPlace = pid;
  }
  render();
})();
