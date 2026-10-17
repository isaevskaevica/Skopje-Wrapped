// =====================================================================
//  СКОПИ — AI делот
//  Користи open-weight модели (Llama) преку Groq API.
//  Ако нема клуч или интернет, Скопи одговара со резервни (офлајн) одговори,
//  за демото никогаш да не пропадне.
// =====================================================================

const AI = (() => {
  const API = "https://api.groq.com/openai/v1";
  const PREFERRED_TEXT = [
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "openai/gpt-oss-120b",
    "qwen/qwen3-32b",
  ];
  const PREFERRED_VISION = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
  ];

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  const cfg = {
    get key() { return store.get("sw_groq_key", ""); },
    set key(v) { store.set("sw_groq_key", v.trim()); },
    get textModel() { return store.get("sw_text_model", PREFERRED_TEXT[0]); },
    set textModel(v) { store.set("sw_text_model", v); },
    get visionModel() { return store.get("sw_vision_model", PREFERRED_VISION[0]); },
    set visionModel(v) { store.set("sw_vision_model", v); },
  };

  const hasKey = () => cfg.key.startsWith("gsk_") || cfg.key.length > 20;

  const SKOPI_SYSTEM = `Ти си Скопи — AI културен другар во апликацијата „Скопје Wrapped“.
Зборуваш на македонски, топло и духовито, како пријателски локалец од Скопје. Пишуваш кратко (2–4 реченици освен ако не те прашаат повеќе), без маркдаун наслови.
ПРАВИЛА:
- Користи САМО факти, места и настани од ЗНАЕЊЕТО што ти е дадено. Никогаш не измислувај настани, датуми, цени или историски факти.
- Ако нешто не е во знаењето, кажи искрено дека не си сигурен и предложи нешто што е во знаењето.
- Не ја споделувај локацијата на други корисници и не коментирај изглед на луѓе.
- Пишувај граматички точно и природно.`;
  const langRule = () => LANG === "en"
    ? "\nIMPORTANT: Reply in ENGLISH, friendly and witty. Write Macedonian place names in Latin script (e.g. Kurshumli An, Debar Maalo)."
    : "\nВАЖНО: Одговарај на македонски, на кирилица.";
  const SYS = () => SKOPI_SYSTEM + langRule();

  async function chat(messages, { model, json = false, temperature = 0.7, maxTokens = 500 } = {}) {
    if (!hasKey()) throw new Error("no-key");
    const body = {
      model: model || cfg.textModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    };
    if (json) body.response_format = { type: "json_object" };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(`${API}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`groq ${r.status}: ${txt.slice(0, 200)}`);
      }
      const data = await r.json();
      const out = data.choices?.[0]?.message?.content || "";
      return out.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    } finally {
      clearTimeout(t);
    }
  }

  function parseJSON(s) {
    try { return JSON.parse(s); } catch {}
    const m = s.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }

  // Ги проверува достапните модели на Groq и ги избира најдобрите
  async function testConnection() {
    const r = await fetch(`${API}/models`, { headers: { Authorization: `Bearer ${cfg.key}` } });
    if (!r.ok) throw new Error(r.status === 401 ? "Клучот не е точен" : `Грешка ${r.status}`);
    const ids = (await r.json()).data.map(m => m.id);
    const text = PREFERRED_TEXT.find(m => ids.includes(m)) || ids.find(m => /llama|qwen|gpt-oss|gemma/i.test(m)) || ids[0];
    const vision = PREFERRED_VISION.find(m => ids.includes(m)) || ids.find(m => /scout|maverick|vision|vl/i.test(m)) || text;
    cfg.textModel = text;
    cfg.visionModel = vision;
    return { text, vision, count: ids.length };
  }

  function knowledge({ places = PLACES, events = [] } = {}) {
    const p = places.map(x => `- ${x.name} (${x.hood}, ${x.type}): ${x.story}`).join("\n");
    const e = events.map(x => `- ${x.dateLabel} ${x.time} · ${x.titleMk} · ${x.placeName} (${x.hood}) · ${x.price ? x.price + " ден." : "бесплатно"} · ${x.type}`).join("\n");
    return `ЗНАЕЊЕ — МЕСТА:\n${p}\n\nЗНАЕЊЕ — НАСТАНИ ОВАА НЕДЕЛА:\n${e || "(нема)"}`;
  }

  function userCtx(u, stats) {
    if (!u) return "";
    return `КОРИСНИК: ${u.name}. Маало: ${u.hood || "?"}. Интереси: ${u.interests.map(i => (INTERESTS.find(x => x.id === i) || {}).mk || i).join(", ")}. Посетени маала: ${stats?.hoodNames?.join(", ") || "уште ниедно"}.`;
  }

  // ---------- 1. Приказна на самото место (по QR скенирање) ----------
  async function placeStory(place, user) {
    try {
      return await chat([
        { role: "system", content: SYS() },
        { role: "system", content: knowledge({ places: [place] }) + "\n" + userCtx(user) },
        { role: "user", content: `Штотуку се чекирав во „${place.name}“. Раскажи ми 30-секундна приказна за ова место (максимум 4 реченици) и кажи ми на што да внимавам додека сум тука. Обрати ми се по име.` },
      ], { maxTokens: 300 });
    } catch (e) {
      console.warn("AI fallback", e);
      return LANG === "en" ? `Welcome to ${N(place.name)}, ${user?.name || ""}! (Skopi is offline. Add a Groq key in Profile for stories in English.)\n\n${place.story}` : `${user?.name ? user.name + ", д" : "Д"}обредојде во ${place.name}! ${place.story}`;
    }
  }

  // ---------- 2. Разговор: „шо да правам вечерва?“ ----------
  async function skopiReply(history, user, stats, events) {
    try {
      return await chat([
        { role: "system", content: SYS() + "\nКога предлагаш, дај 2–3 конкретни опции од настаните или местата и за секоја кажи зошто му одговара на корисникот (интереси, буџет, време). Секоја опција во нов ред што почнува со •" },
        { role: "system", content: knowledge({ events }) + "\n" + userCtx(user, stats) + `\nДенес е ${["недела","понеделник","вторник","среда","четврток","петок","сабота"][new Date().getDay()] + ", " + new Date().getDate() + "." + (new Date().getMonth()+1) + "."}, часот е ${new Date().toTimeString().slice(0, 5)}.` },
        ...history,
      ], { maxTokens: 500 });
    } catch (e) {
      console.warn("AI fallback", e);
      return offlineSuggest(history[history.length - 1]?.content || "", user, events);
    }
  }

  function offlineSuggest(q, user, events) {
    const ql = q.toLowerCase();
    const en = LANG === "en";
    const budget = parseInt((ql.match(/(\d{2,5})/) || [])[1] || "0", 10);
    let list = events.slice();
    if (budget) list = list.filter(e => e.price <= budget);
    if (/бесплат|free/.test(ql)) list = list.filter(e => !e.price);
    if (/вечерва|денес|сега|tonight|today|now/.test(ql)) list = list.filter(e => e.day === 0).concat(list.filter(e => e.day !== 0));
    if (/истори|history/.test(ql)) list = list.filter(e => e.tags.includes("историја")).concat(list.filter(e => !e.tags.includes("историја")));
    const myTags = (user?.interests || []).flatMap(i => (INTERESTS.find(x => x.id === i) || {}).tags || []);
    const score = e => e.tags.filter(tg => myTags.includes(tg)).length - e.day * 0.1;
    list.sort((a, b) => score(b) - score(a));
    const pick = list.slice(0, 3);
    if (!pick.length) return en ? "Hmm, nothing matches exactly. Try a different budget or day!" : "Хм, не најдов ништо што одговара точно на тоа. Пробај да ми кажеш поинаков буџет или ден!";
    const price = e => e.price ? `${e.price} ${en ? "MKD" : "ден."}` : (en ? "free" : "бесплатно");
    return (en ? "Here's what I'd suggest:\n" : "Еве што би ти предложил:\n")
      + pick.map(e => `• ${e.title} — ${e.dateLabel} ${en ? "at" : "во"} ${e.time}, ${N(e.placeName)} (${price(e)})`).join("\n")
      + (en ? "\n\n(Skopi is offline. Add a Groq key in Profile for smart suggestions.)" : "\n\n(Скопи е во офлајн режим. Внеси Groq клуч во Профил за паметни предлози.)");
  }

  // ---------- 3. Фото → активност (vision) ----------
  async function photoActivity(dataUrl, candidates) {
    const list = candidates.map(p => `${p.id}: ${p.name} (${p.type}, ${p.hood})`).join("\n");
    const txt = await chat([
      { role: "system", content: "Ти си систем за препознавање културни активности во Скопје. Одговараш САМО со JSON." },
      {
        role: "user",
        content: [
          { type: "text", text: `Корисникот ја фотографирал оваа сцена за да ја забележи културната посета. Најблиски места според GPS:\n${list}\n\nВрати JSON: {"place_id": id од листата што најмногу одговара, "kind": еден од ["Изложба","Концерт","Претстава","Кино","Историско место","Работилница","Фестивал","Друго"], "title": краток наслов на активноста (до 6 зборови), "caption": една реченица што опишува што се гледа на фотографијата}. Јазик за title, caption и kind: ${LANG === "en" ? "English" : "македонски"}.` },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ], { model: cfg.visionModel, json: true, temperature: 0.3, maxTokens: 250 });
    const j = parseJSON(txt);
    if (!j) throw new Error("bad json");
    return j;
  }

  // ---------- 4. AI-коуч: предизвик по мерка ----------
  async function coach(user, stats, events) {
    try {
      return await chat([
        { role: "system", content: SYS() + "\nТи си AI-коуч, како планот за тренинг на Strava. Дај ЕДЕН конкретен предизвик за оваа недела што го турка корисникот во НОВО маало каде не бил, користејќи настан или место од знаењето. Максимум 2 реченици. Почни директно, без поздрав." },
        { role: "system", content: knowledge({ events }) + "\n" + userCtx(user, stats) },
        { role: "user", content: "Кој е мојот предизвик за оваа недела?" },
      ], { maxTokens: 160, temperature: 0.8 });
    } catch {
      const visited = new Set(stats.hoodNames);
      const e = events.find(ev => !visited.has(ev.hood)) || events[0];
      return LANG === "en"
        ? `Break the routine this week: "${e.title}" at ${N(e.placeName)} (${N(e.hood)}), ${e.dateLabel} at ${e.time}. A new neighbourhood is waiting on your map!`
        : `Оваа недела излези од навиката: „${e.title}“ во ${e.placeName} (${e.hood}), ${e.dateLabel.toLowerCase()} во ${e.time}. Ново маало на мапата те чека!`;
    }
  }

  // ---------- 5. Wrapped текстови ----------
  async function wrapped(user, stats) {
    try {
      const txt = await chat([
        { role: "system", content: SYS() + "\nПишуваш текстови за Wrapped-картички (како Spotify Wrapped). Духовито, топло, лично, кратко. Одговараш САМО со JSON. Вредностите се на јазикот што е побаран." },
        { role: "user", content: `Податоци за месецот на ${user.name}:\n${JSON.stringify({ посети: stats.visits, маала: stats.hoodNames, број_маала: stats.hoods, вкупно_маала: stats.totalHoods, омилено_место: stats.topPlace, видови: stats.typeCount, теми: stats.tagCount, ноќни_излези: stats.night, интереси: user.interests })}\n\nВрати JSON: {"persona": културна личност во 2–4 зборови (пр. „Ноќна птица на џезот“), "persona_line": една реченица зошто, "hoods_line": духовита реченица за маалата што ги истражил, "fav_line": реченица за омиленото место, "roast": една нежна шега за неговите навики (пр. „Повеќе концерти отколку предавања. Не те осудуваме.“), "next": една реченица предизвик за следниот месец}` },
      ], { json: true, temperature: 0.9, maxTokens: 400 });
      const j = parseJSON(txt);
      if (j && j.persona) return j;
      throw new Error("bad json");
    } catch (e) {
      console.warn("AI fallback", e);
      const topTag = Object.entries(stats.tagCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
      const en = LANG === "en";
      const P = {
        "историја": ["Чувар на старото Скопје", "Keeper of old Skopje"], "изложби": ["Око за уметност", "Eye for art"],
        "музика": ["Ноќна птица на сцената", "Night owl of the stage"], "архитектура": ["Ловец на згради", "Building hunter"],
      }[topTag] || ["Културен истражувач", "Culture explorer"];
      const fav = stats.topPlace ? N(stats.topPlace) : (en ? "The city" : "Градот");
      return {
        persona: P[en ? 1 : 0],
        persona_line: en ? "Your outings have a clear favourite theme, and it shows." : "Твоите излези имаат јасна омилена тема, и тоа се гледа.",
        hoods_line: en ? `You discovered ${stats.hoods} of ${stats.totalHoods} neighbourhoods. Skopje is bigger than you think!` : `Откри ${stats.hoods} од ${stats.totalHoods} маала. Скопје е поголемо отколку мислиш!`,
        fav_line: en ? `${fav} is basically your second home.` : `${fav} ти е второ дома.`,
        roast: stats.night
          ? (en ? "More night outings than morning coffees. No judgement." : "Повеќе ноќни излези отколку утрински кафиња. Не те осудуваме.")
          : (en ? "Not a single outing after 8pm yet. Skopje at night is waiting." : "Уште ниеден излез после 20 ч. Скопје навечер те чека."),
        next: en ? "Next month: one neighbourhood you've never been to." : "Следниот месец: едно маало каде никогаш не си бил.",
      };
    }
  }

  // ---------- 6. Екипа + ледоломец ----------
  async function icebreaker(event, group) {
    try {
      return await chat([
        { role: "system", content: SYS() + "\nПишуваш ЕДНА кратка ледоломна порака за група непознати луѓе што заедно одат на настан. Прашање кое секој лесно ќе го одговори, поврзано со настанот и нивните заеднички интереси. Максимум 2 реченици." },
        { role: "user", content: `Настан: ${event.titleMk} во ${event.placeName}. Групата: ${group.map(g => `${g.name} (${g.interests.map(i => (INTERESTS.find(x => x.id === i) || {}).mk || i).join(", ")})`).join("; ")}.` },
      ], { maxTokens: 120, temperature: 0.9 });
    } catch {
      return LANG === "en"
        ? `Hey crew! Before "${event.title}": what's the best event you've been to this year?`
        : `Здраво екипа! Пред „${event.title}“: кој е најдобриот настан на кој сте биле оваа година?`;
    }
  }

  return { cfg, hasKey, testConnection, placeStory, skopiReply, photoActivity, coach, wrapped, icebreaker };
})();
