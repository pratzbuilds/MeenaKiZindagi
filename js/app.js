/* ============================================================
   MEENA KI ZINDAGI — game engine
   Plain JavaScript. No build step. No framework.
   Story logic lives in data/story.json
   All words live in data/lang/{en,hi,mr}.json
   ============================================================ */
(function () {
  "use strict";

  const SAVE_KEY = "meena_save_v4";
  const LANG_KEY = "meena_lang";
  const MUTE_KEY = "meena_mute";

  let STORY = null;        // story.json
  let L = {};              // current language strings
  let S = null;            // game state
  const app = document.getElementById("app");
  function track(ev) { try { if (window.meenaTrack) window.meenaTrack(ev); } catch (e) {} }

  /* ---------------- i18n ---------------- */
  function charFirstName() {
    if (!S || !S.charId) return L["char.meena.n"] ? L["char.meena.n"].split(",")[0] : "Meena";
    const full = L["char." + S.charId + ".n"] || "";
    return full.split(",")[0].trim();
  }
  function t(key, vars) {
    let s = L[key];
    if (s === undefined) s = key; // fail visible, not silent
    const merged = Object.assign({ name: charFirstName() }, vars || {});
    for (const k in merged) s = s.split("{" + k + "}").join(merged[k]);
    return s;
  }
  function rupees(n) {
    n = Math.round(n);
    const neg = n < 0; n = Math.abs(n);
    return (neg ? "-₹" : "₹") + n.toLocaleString("en-IN");
  }

  /* ---------------- sound (synthesized, no files) ---------------- */
  let audioCtx = null;
  function muted() { return localStorage.getItem(MUTE_KEY) === "1"; }
  function tone(freq, dur, type, delay, vol) {
    if (muted()) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type || "triangle"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(vol || 0.18, audioCtx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(audioCtx.currentTime + delay); o.stop(audioCtx.currentTime + delay + dur + 0.05);
    } catch (e) { /* audio unavailable — fine */ }
  }
  const sfx = {
    click: () => tone(600, 0.08, "square", 0, 0.06),
    coin:  () => { tone(880, 0.09, "triangle", 0); tone(1320, 0.12, "triangle", 0.08); },
    good:  () => { tone(523, 0.1, "triangle", 0); tone(659, 0.1, "triangle", 0.09); tone(784, 0.16, "triangle", 0.18); },
    bad:   () => { tone(330, 0.15, "sawtooth", 0, 0.08); tone(220, 0.25, "sawtooth", 0.13, 0.08); },
    sting: () => { tone(196, 0.3, "sawtooth", 0, 0.1); tone(185, 0.35, "sawtooth", 0.25, 0.1); },
    win:   () => { [523,659,784,1046].forEach((f,i)=>tone(f,0.18,"triangle",i*0.12,0.14)); }
  };

  /* ---------------- state ---------------- */
  function newState(charId, incomeIdx) {
    const inc = STORY.incomes[incomeIdx];
    return {
      lang: localStorage.getItem(LANG_KEY) || "hi",
      charId, incomeIdx,
      personal: inc.personal, household: inc.household,
      year: 1, chapterIdx: 0, screenIdx: -1, phase: "chapterIntro",
      pots: { cash: 0, rd: 0, sip: 0, ssy: 0, gold: 0, chit: 0, endowment: 0, scam: 0 },
      autos: {}, drains: [], debt: 0,
      tension: 20, health: 90, tensionSum: 0, tensionN: 0,
      flags: {}, news: [], pauseYears: 0,
      pendingShortfall: 0, chitDone: false, scamSeen: false,
      lastFeedback: null, learnOpen: false
    };
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  function loadSave() {
    try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return d && d.charId ? d : null; }
    catch (e) { return null; }
  }

  function totalAssets() {
    const p = S.pots;
    return p.cash + p.rd + p.sip + p.ssy + p.gold + p.chit + p.endowment + p.scam;
  }
  function monthlyExpense() { return Math.round(S.household * STORY.config.expenseShare); }
  function surakshaScore() {
    let s = 0;
    if (S.flags.pmjjby) s += 20; if (S.flags.pmsby) s += 15;
    if (S.flags.pmjay) s += 25; if (S.flags.apy) s += 15;
    if (S.flags.eshram) s += 10;
    if (S.pots.cash >= 3 * monthlyExpense()) s += 15;
    return Math.min(100, s);
  }
  function clampMeters() {
    S.tension = Math.max(0, Math.min(100, S.tension));
    S.health = Math.max(5, Math.min(100, S.health));
  }

  /* ---------------- effects ---------------- */
  function applyEffects(fx) {
    if (!fx) return;
    if (fx.cash) S.pots.cash += fx.cash;
    if (fx.debt) S.debt += fx.debt;
    if (fx.tension) S.tension += fx.tension;
    if (fx.health) S.health += fx.health;
    if (fx.flags) for (const k in fx.flags) S.flags[k] = fx.flags[k];
    if (fx.autosave) S.autos[fx.autosave.target] = (S.autos[fx.autosave.target] || 0) + fx.autosave.monthly;
    if (fx.drain) S.drains.push({ monthly: fx.drain.monthly, years: fx.drain.years });
    if (fx.invest) { S.pots.cash -= fx.invest.amount; S.pots[fx.invest.target] += fx.invest.amount; }
    if (fx.invest2) { S.pots.cash -= fx.invest2.amount; S.pots[fx.invest2.target] += fx.invest2.amount; }
    if (fx.pauseSaves) S.pauseYears = Math.max(S.pauseYears, fx.pauseSaves);
    if (fx.redeem) {
      const tgt = fx.redeem.target;
      S.pots.cash += Math.round(S.pots[tgt] * (1 - (fx.redeem.cut || 0)));
      S.pots[tgt] = 0; delete S.autos[tgt];
    }
    clampMeters();
  }

  /* ---------------- year advance ---------------- */
  function advanceYears(n) {
    const R = STORY.config.rates;
    for (let i = 0; i < n; i++) {
      S.year++;
      // autosaves
      if (S.pauseYears > 0) { S.pauseYears--; }
      else {
        for (const tgt in S.autos) S.pots[tgt] += S.autos[tgt] * 12;
      }
      // drains (positive = expense, negative = income)
      S.drains.forEach(d => { if (d.years > 0) { S.pots.cash -= d.monthly * 12; d.years--; } });
      S.drains = S.drains.filter(d => d.years > 0);
      // growth
      for (const tgt in S.pots) {
        let r = R[tgt] || 0;
        if (tgt === "cash" && S.flags.cashInBank) r = R.cashInBank;
        if (tgt === "sip") r = R.sip + (Math.random() * 2 - 1) * STORY.config.sipSwing;
        S.pots[tgt] = Math.round(S.pots[tgt] * (1 + r));
      }
      // negative cash becomes debt
      if (S.pots.cash < 0) { S.debt += -S.pots.cash; S.pots.cash = 0; }
      // debt: family tightens the belt and repays BEFORE interest bites
      if (S.debt > 0) {
        const effort = Math.round(S.household * 12 * 0.06); // ~6% of yearly income goes to repayment
        S.debt -= Math.min(S.debt, effort);
        const spare = Math.max(0, S.pots.cash - monthlyExpense());
        const extra = Math.min(S.debt, spare);
        S.debt -= extra; S.pots.cash -= extra;
        if (S.debt > 0) { S.debt = Math.round(S.debt * (1 + STORY.config.debtRate)); S.tension += 6; }
      }
      // chit fate
      if (S.flags.chitJoined && !S.chitDone) {
        if (S.year >= STORY.config.chitCollapseYear && Math.random() < STORY.config.chitCollapseChance) {
          S.pots.chit = 0; delete S.autos.chit; S.chitDone = true;
          S.tension += 12; S.news.push("chitCollapse");
        } else if (S.year >= 6) {
          S.pots.cash += Math.round(S.pots.chit * 1.05);
          S.pots.chit = 0; delete S.autos.chit; S.chitDone = true;
          S.news.push("chitPaid");
        }
      }
      // scam fate (resolves after year 10)
      if (S.scamSeen && S.year > 10 && !S.flags.scamResolved) {
        S.flags.scamResolved = true;
        if (S.pots.scam > 0) { S.pots.scam = 0; S.tension += 15; S.news.push("scamGone"); }
        else S.news.push("scamDodged");
      }
      checkMilestones();
      // gentle drift
      S.tension = Math.max(0, S.tension - 4);
      S.health = Math.min(100, S.health + 1);
      S.tensionSum += S.tension; S.tensionN++;
      clampMeters();
    }
  }

  /* ---------------- savings milestones (visible rewards) ---------------- */
  const MILESTONES = [[1,"fan"],[3,"bed"],[6,"tv"],[9,"fridge"],[12,"wash"],[18,"paint"]];
  function checkMilestones() {
    const m = totalAssets() / monthlyExpense();
    MILESTONES.forEach(([months, id]) => {
      if (m >= months && !S.flags["mile_" + id]) {
        S.flags["mile_" + id] = true;
        S.news.push("mile." + id);
        track("milestone_" + id);
      }
    });
  }

  /* ---------------- events (shocks) ---------------- */
  function pickEvent(pool) {
    const total = pool.reduce((a, p) => a + p.weight, 0);
    let r = Math.random() * total;
    for (const p of pool) { r -= p.weight; if (r <= 0) return p.id; }
    return pool[0].id;
  }
  function resolveEvent(evId) {
    const ev = STORY.events[evId];
    const out = { id: evId, lines: [] };
    S.tension += ev.tension || 0; S.health += ev.health || 0;
    let cost = ev.cost || 0;
    // free via scheme (e.g., Ayushman)
    const freed = (ev.freeIf || []).some(f => S.flags[f]);
    if (freed && cost > 0) { out.lines.push(t("ev.free")); cost = 0; }
    // insurance payout
    let payout = 0;
    if (ev.payoutIf) for (const f in ev.payoutIf) if (S.flags[f]) payout += ev.payoutIf[f];
    if (evId === "ev_death") {
      out.lines.push(S.flags.pmjjby ? t("ev.death.pmjjby") : t("ev.death.nopolicy"));
      S.flags.widowed = true;
      if (ev.incomeDropShare) S.household = Math.round(S.household * (1 - ev.incomeDropShare));
    } else if (payout > 0) {
      out.lines.push(t("ev.payout", { amt: payout.toLocaleString("en-IN") }));
    }
    S.pots.cash += payout;
    // income loss
    if (ev.incomeLossMonths) cost += ev.incomeLossMonths * Math.round(S.household * 0.35);
    // pay
    if (cost > 0) {
      if (S.pots.cash >= cost) {
        S.pots.cash -= cost;
        out.lines.push(t("ev.paidCash", { amt: cost.toLocaleString("en-IN") }));
      } else {
        const short = cost - S.pots.cash;
        S.pots.cash = 0; S.pendingShortfall = short;
        out.lines.push(t("ev.shortfall", { amt: short.toLocaleString("en-IN") }));
      }
    }
    clampMeters();
    return out;
  }

  /* ---------------- ending ---------------- */
  function computeEnding() {
    const assets = totalAssets();
    const avgT = S.tensionN ? S.tensionSum / S.tensionN : S.tension;
    let tier;
    if (S.debt > 25000) tier = 1;
    else if (assets >= 24 * monthlyExpense() && (S.flags.pmjjby || S.flags.pmsby) && S.flags.apy && S.debt === 0) tier = 4;
    else if (assets >= 10 * monthlyExpense() && (S.flags.pmjjby || S.flags.pmsby || S.flags.pmjay)) tier = 3;
    else tier = 2;
    const ail = avgT > 45 ? "high" : avgT > 25 ? "mid" : "low";
    const lessons = [];
    if (tier <= 2) lessons.push("lesson.efund");
    if (!S.flags.pmjjby) lessons.push("lesson.ins456");
    if (!S.flags.pmjay) lessons.push("lesson.pmjay");
    if (!S.flags.ssy) lessons.push("lesson.ssy");
    if (!S.flags.sip) lessons.push("lesson.sip");
    if (S.flags.scamResolved && S.news.indexOf("scamDodged") < 0) lessons.push("lesson.scam");
    if (S.debt > 0) lessons.push("lesson.debt");
    if (!S.flags.apy) lessons.push("lesson.apy");
    if (lessons.length === 0) lessons.push("lesson.sip", "lesson.ins456");
    return { tier, ail, lessons: lessons.slice(0, 4), assets, avgT };
  }

  /* ---------------- rendering ---------------- */
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  const SCHEMES = { "PMJJBY":"pmjjby", "PMSBY":"pmsby", "PM-JAY":"pmjay", "APY":"apy", "SSY":"ssy", "eShram":"eshram" };
  function schemeify(escaped) {
    // wrap scheme acronyms in tappable chips that reveal a one-line explanation
    let out = escaped;
    for (const acro in SCHEMES)
      out = out.split(acro).join(`<button class="scheme-tag" data-s="${SCHEMES[acro]}">${acro} ⓘ</button>`);
    return out;
  }
  function wireSchemeTags() {
    document.querySelectorAll(".scheme-tag").forEach(el => el.onclick = (e) => {
      e.stopPropagation();
      const old = document.querySelector(".scheme-pop");
      if (old) old.remove();
      if (el.nextElementSibling && el.nextElementSibling.className === "scheme-pop") return;
      el.insertAdjacentHTML("afterend", `<span class="scheme-pop">${esc(t("scheme." + el.dataset.s))}</span>`);
      sfx.click();
    });
  }
  function yearBarHTML() {
    const markers = STORY.chapters.map(c => c.year);
    const pct = Math.min(100, Math.round((S.year - 1) / 19 * 100));
    const dots = markers.map(y => {
      const p = Math.round((y - 1) / 19 * 100);
      const state = S.year >= y ? "done" : "todo";
      return `<span class="yr-dot ${state}" style="left:${p}%"></span>`;
    }).join("");
    return `<div class="yearbar">
      <div class="yearbar-track"><div class="yearbar-fill" style="width:${pct}%"></div>${dots}</div>
      <div class="yearbar-label">${esc(t("ui.year"))} ${S.year} / 20</div>
    </div>`;
  }
  function topbarHTML() {
    const gLevel = Math.min(100, Math.round(totalAssets() / (12 * monthlyExpense()) * 100));
    return `
    <div class="topbar">
      ${yearBarHTML()}
      <div class="topbar-row">
        <span class="money-chip ${S.debt > 0 ? "debt" : ""}">
          ${S.debt > 0 ? esc(t("ui.debt")) + " " + rupees(S.debt) : rupees(totalAssets())}
        </span>
        <button class="iconbtn" id="muteBtn" aria-label="${esc(t("ui.mute"))}">${muted() ? "🔇" : "🔊"}</button>
        <button class="iconbtn" id="resetBtn" aria-label="reset">↺</button>
      </div>
      <div class="gullak-wrap">
        <div class="gullak-big" id="gullak">
          <svg viewBox="0 0 120 110" class="gullak-svg">
            <path d="M14 92 Q8 50 60 46 Q112 50 106 92 Z" fill="#C96F33" stroke="#2E1E12" stroke-width="4"/>
            <clipPath id="gkclip"><path d="M14 92 Q8 50 60 46 Q112 50 106 92 Z"/></clipPath>
            <rect x="8" y="${92 - 46 * gLevel / 100}" width="104" height="${46 * gLevel / 100}" fill="#F5A800" class="gk-level" clip-path="url(#gkclip)"/>
            <rect x="48" y="50" width="24" height="6" rx="3" fill="#3A1F0D"/>
            <circle class="coin-drop" cx="60" cy="10" r="8" fill="#FFD166" stroke="#B27600" stroke-width="2" opacity="0"/>
          </svg>
        </div>
        <div class="gullak-amt">${rupees(totalAssets())}<span>${esc(t("ui.gullak"))}</span></div>
      </div>
      <div class="meters-big">
        ${meterHTML("sehat", "health", S.health, "❤️")}
        ${meterHTML("tension", "tension", S.tension, "😰")}
        ${meterHTML("suraksha", "suraksha", surakshaScore(), "🛡️")}
      </div>
    </div>`;
  }
  function meterHTML(labelKey, cls, val, icon) {
    return `<div class="meter-big">
      <div class="meter-top"><span class="meter-icon">${icon}</span><span class="meter-num">${Math.round(val)}</span></div>
      <div class="bar-big"><div class="fill-big ${cls}" style="width:${val}%"></div></div>
      <label>${esc(t("ui." + labelKey))}</label>
    </div>`;
  }
  function shell(inner, buttonLabel, onButton, secondary) {
    app.innerHTML = topbarHTML() + `<div class="stage">${inner}</div>` +
      (buttonLabel ? `<div class="bottombar">
        <button class="btn-primary" id="mainBtn">${esc(buttonLabel)}</button>
        ${secondary ? `<button class="btn-secondary" id="secBtn">${esc(secondary.label)}</button>` : ""}
      </div>` : "");
    wireTopbar();
    if (buttonLabel) document.getElementById("mainBtn").onclick = () => { sfx.click(); onButton(); };
    if (secondary) document.getElementById("secBtn").onclick = () => { sfx.click(); secondary.fn(); };
  }
  function wireTopbar() {
    const m = document.getElementById("muteBtn"), r = document.getElementById("resetBtn");
    if (m) m.onclick = () => { localStorage.setItem(MUTE_KEY, muted() ? "0" : "1"); m.textContent = muted() ? "🔇" : "🔊"; };
    if (r) r.onclick = () => { if (confirm(t("ui.reset"))) { localStorage.removeItem(SAVE_KEY); location.reload(); } };
  }
  function coinDrop() {
    const g = document.querySelector("#gullak .coin-drop");
    if (g) {
      g.classList.remove("anim"); void g.getBBox();
      g.classList.add("anim");
    }
    sfx.coin();
  }

  /* ---------------- screens ---------------- */
  function renderTitle() {
    const hasSave = !!loadSave();
    const lang = localStorage.getItem(LANG_KEY) || "hi";
    app.innerHTML = `
    <div class="title-screen">
      <div class="title-art">🪔👩🏽‍🦱🏙️</div>
      <h1>${esc(t("ui.title"))}</h1>
      <p class="tagline">${esc(t("ui.tagline"))}</p>
      <div class="lang-row">
        <button class="lang-btn ${lang === "hi" ? "active" : ""}" data-l="hi">हिंदी</button>
        <button class="lang-btn ${lang === "mr" ? "active" : ""}" data-l="mr">मराठी</button>
        <button class="lang-btn ${lang === "en" ? "active" : ""}" data-l="en">English</button>
      </div>
      <div class="bottombar" style="position:relative;padding:20px 0 0;background:none;transform:none;left:0;">
        ${hasSave ? `<button class="btn-primary" id="contBtn">${esc(t("ui.continue"))}</button>` : ""}
        <button class="${hasSave ? "btn-secondary" : "btn-primary"}" id="newBtn">${esc(t("ui.start"))}</button>
      </div>
      <p style="font-size:12px;opacity:.7;margin-top:18px;">${esc(t("ui.savedAuto"))}<br>${esc(t("ui.installHint"))}</p>
    </div>`;
    document.querySelectorAll(".lang-btn").forEach(b => b.onclick = async () => {
      localStorage.setItem(LANG_KEY, b.dataset.l);
      await loadLang(b.dataset.l); renderTitle();
    });
    const c = document.getElementById("contBtn");
    if (c) c.onclick = () => { S = loadSave(); route(); };
    document.getElementById("newBtn").onclick = () => { sfx.click(); renderIntro(); };
  }

  /* ---------------- intro / welcome (V4) ---------------- */
  function renderIntro() {
    app.innerHTML = `
    <div class="title-screen intro-screen">
      <h1 style="font-size:24px;">${esc(t("intro.welcome"))}</h1>
      <div class="intro-card"><p>${esc(t("intro.what"))}</p></div>
      <div class="intro-card how"><p>${esc(t("intro.how1"))}</p></div>
      <div class="intro-card how"><p>${esc(t("intro.how2"))}</p></div>
      <div class="intro-card how"><p>${esc(t("intro.how3"))}</p></div>
      <div class="bottombar" style="position:relative;padding:16px 0 0;background:none;transform:none;left:0;">
        <button class="btn-primary" id="introBtn">${esc(t("intro.btn"))}</button>
      </div>
      <p class="disclaimer">${esc(t("ui.disclaimer"))}</p>
    </div>`;
    document.getElementById("introBtn").onclick = () => { sfx.good(); renderSetup(); };
  }

  function renderSetup() {
    let charId = "meena", incomeIdx = 1;
    function draw() {
      const chars = STORY.characters.map(c => `
        <div class="char-card ${c.id === charId ? "active" : ""}" data-c="${c.id}">
          <div class="char-emoji">${c.emoji}</div>
          <div><h3>${esc(t("char." + c.id + ".n"))}</h3><p>${esc(t("char." + c.id + ".d"))}</p></div>
        </div>`).join("");
      const incs = STORY.incomes.map((inc, i) => `
        <button class="income-btn ${i === incomeIdx ? "active" : ""}" data-i="${i}">${rupees(inc.personal)}</button>`).join("");
      app.innerHTML = `
      <div class="title-screen">
        <h1 style="font-size:26px;">${esc(t("ui.chooseChar"))}</h1>
        <div class="char-grid">${chars}</div>
        <div class="section-label">${esc(t("ui.chooseIncome"))}</div>
        <div class="income-row">${incs}</div>
        <p style="font-size:13px;text-align:left;margin-top:8px;">${esc(t("ui.householdNote", { h: rupees(STORY.incomes[incomeIdx].household) }))}</p>
        <div class="bottombar" style="position:relative;padding:18px 0 0;background:none;transform:none;left:0;">
          <button class="btn-primary" id="beginBtn">${esc(t("ui.begin"))}</button>
        </div>
      </div>`;
      document.querySelectorAll(".char-card").forEach(el => el.onclick = () => { charId = el.dataset.c; sfx.click(); draw(); });
      document.querySelectorAll(".income-btn").forEach(el => el.onclick = () => { incomeIdx = +el.dataset.i; sfx.click(); draw(); });
      document.getElementById("beginBtn").onclick = () => {
        S = newState(charId, incomeIdx); sfx.good(); save();
        track("game_start"); route();
      };
    }
    draw();
  }

  function chapter() { return STORY.chapters[S.chapterIdx]; }

  function route() {
    save();
    if (!S) return renderTitle();
    switch (S.phase) {
      case "chapterIntro": return renderChapterIntro();
      case "news": return renderNews();
      case "event": return renderEvent();
      case "funding": return renderFunding();
      case "screen": return renderScreen();
      case "album": return renderAlbum(false);
      case "timepass": return renderTimepass();
      case "ending": return renderEnding();
      default: return renderTitle();
    }
  }

  function renderChapterIntro() {
    const ch = chapter();
    track("chapter_" + (S.chapterIdx + 1));
    const char = STORY.characters.find(c => c.id === S.charId);
    shell(`
      <div class="chapter-card">
        <div class="ch-no">${esc(t("ui.chapter"))} ${S.chapterIdx + 1}/8</div>
        <h2>${esc(t(ch.id + ".t"))}</h2>
        <div class="ch-year">${esc(t(ch.id + ".sub"))}</div>
      </div>
      ${stageSVG("")}
      <div class="scene">
        <p>${esc(t(ch.id + ".intro", { p: S.personal.toLocaleString("en-IN") }))}</p>
      </div>`,
      t("ui.next"), () => {
        if (S.news.length) { S.phase = "news"; }
        else if (ch.event) { S.phase = "event"; }
        else { S.phase = "screen"; S.screenIdx = 0; }
        route();
      });
  }

  function renderNews() {
    const n = S.news.shift();
    const isMile = n.indexOf("mile.") === 0;
    shell(`
      <div class="scene chat ${isMile ? "milestone" : ""}">
        <div class="speaker">${isMile ? "🎉 " + esc(t("mile.t")) : "📰 " + esc(t("news." + n + ".t"))}</div>
        <p>${esc(isMile ? t(n) : t("news." + n + ".b"))}</p>
      </div>`,
      t("ui.next"), () => {
        if (S.news.length) { S.phase = "news"; }
        else if (chapter().event && !S.flags["evDone_" + chapter().id]) { S.phase = "event"; }
        else { S.phase = "screen"; S.screenIdx = Math.max(0, S.screenIdx); }
        route();
      });
    isMile ? sfx.win() : sfx.sting();
  }

  function renderEvent() {
    const ch = chapter();
    const evId = pickEvent(ch.event.pool);
    S.flags["evDone_" + ch.id] = true;
    const ev = STORY.events[evId];
    const result = resolveEvent(evId);
    save();
    shell(`
      <div class="scene" style="background:#FDE0D9;">
        <div class="big-emoji">${ev.emoji}</div>
        <div class="speaker">⚡ ${esc(t("ev." + evId + ".t"))}</div>
        <p>${esc(t("ev." + evId + ".b"))}</p>
      </div>
      ${result.lines.map(l => `<div class="feedback ${S.pendingShortfall ? "bad" : "neutral"}">${esc(l)}</div>`).join("")}`,
      t("ui.next"), () => {
        if (S.pendingShortfall > 0) S.phase = "funding";
        else { S.phase = "screen"; S.screenIdx = 0; }
        route();
      });
    sfx.sting();
  }

  function savingsValue() {
    // realisable value of non-cash pots (chit pays out at 80%, gold at 90%)
    const p = S.pots;
    return p.rd + p.sip + p.ssy + p.endowment + Math.round(p.chit * 0.8) + Math.round(p.gold * 0.9);
  }
  function drawFromSavings(amount) {
    // withdraw in order: rd → gold → endowment → sip → chit → ssy (daughter's fund last)
    let need = amount;
    const order = [["rd",1],["gold",0.9],["endowment",1],["sip",1],["chit",0.8],["ssy",1]];
    for (const [pot, factor] of order) {
      if (need <= 0) break;
      const avail = Math.round(S.pots[pot] * factor);
      if (avail <= 0) continue;
      const take = Math.min(avail, need);
      S.pots[pot] = Math.max(0, S.pots[pot] - Math.round(take / factor));
      if (S.pots[pot] === 0) delete S.autos[pot];
      if (pot === "chit" && S.pots.chit === 0) S.chitDone = true;
      need -= take;
    }
    return amount - need; // actually raised
  }
  function renderFunding() {
    const short = S.pendingShortfall;
    const sav = savingsValue();
    const opts = [];
    // SAVINGS FIRST — borrowing is the last resort
    if (sav >= short && (totalAssets() - short) >= 6 * monthlyExpense()) {
      opts.push({ id: "surplus", emoji: "💪", fb: "fund.surplusfb", good: true, act: () => { drawFromSavings(short); } });
    } else if (sav >= short) {
      opts.push({ id: "cash", emoji: "🪔", fb: "fund.cashfb", good: true, act: () => { drawFromSavings(short); } });
    } else if (sav > 0) {
      opts.push({ id: "partial", emoji: "🤝", fb: "fund.partialfb", good: true, act: () => {
        const got = drawFromSavings(sav); S.debt += short - got;
      }});
    }
    opts.push({ id: "sahukar", emoji: "🧔", fb: "fund.sahukarfb", act: () => { S.debt += short; } });
    opts.push({ id: "app", emoji: "📱", fb: "fund.appfb", act: () => { S.debt += short; } });
    shell(`
      <div class="scene">
        <div class="speaker">🆘</div>
        <p>${esc(t("fund.q", { amt: short.toLocaleString("en-IN") }))}</p>
        <div class="options">
          ${opts.map((o, i) => `<button class="opt" data-i="${i}">
            <span class="opt-emoji">${o.emoji}</span><span>${esc(t("fund." + o.id))}</span></button>`).join("")}
        </div>
        <div id="fbArea"></div>
      </div>`);
    document.querySelectorAll(".opt").forEach(el => el.onclick = () => {
      const o = opts[+el.dataset.i];
      o.act(); S.pendingShortfall = 0; clampMeters(); save();
      (o.id === "sahukar" || o.id === "app") ? sfx.bad() : (o.good ? sfx.good() : sfx.coin());
      document.getElementById("fbArea").innerHTML =
        `<div class="feedback ${o.id === "sahukar" || o.id === "app" ? "bad" : o.good ? "good" : "neutral"}">${esc(t(o.fb))}</div>`;
      document.querySelectorAll(".opt").forEach(b => b.disabled = true);
      app.insertAdjacentHTML("beforeend",
        `<div class="bottombar"><button class="btn-primary" id="mainBtn">${esc(t("ui.next"))}</button></div>`);
      document.getElementById("mainBtn").onclick = () => { sfx.click(); S.phase = "screen"; S.screenIdx = 0; route(); };
    });
  }

  function visibleOptions(sc) {
    return sc.options.filter(o =>
      !(o.hideIfFlag && S.flags[o.hideIfFlag]) && !(o.needFlag && !S.flags[o.needFlag]));
  }
  function screenApplies(sc) {
    if (sc.showIfFlag && !S.flags[sc.showIfFlag]) return false;
    if (sc.hideIfFlag && S.flags[sc.hideIfFlag]) return false;
    return true;
  }

  function renderScreen() {
    const ch = chapter();
    while (S.screenIdx < ch.screens.length && !screenApplies(ch.screens[S.screenIdx])) S.screenIdx++;
    if (S.screenIdx >= ch.screens.length) { S.phase = "timepass"; return route(); }
    const sc = ch.screens[S.screenIdx];
    const opts = visibleOptions(sc);
    shell(`
      ${stageSVG("slim")}
      <div class="scene chat">
        <div class="big-emoji">${sc.emoji || "💬"}</div>
        <p>${schemeify(esc(t(sc.id + ".q")))}</p>
      </div>
      <div class="options">
        ${opts.map((o, i) => `<button class="opt" data-i="${i}">
          <span class="opt-emoji">${o.emoji}</span>
          <span>${schemeify(esc(t(sc.id + "." + o.id)))}</span>
          ${o.costLabel ? `<span class="opt-cost">${esc(o.costLabel)}</span>` : ""}
        </button>`).join("")}
      </div>
      <div id="fbArea"></div>`);
    wireSchemeTags();
    document.querySelectorAll(".opt").forEach(el => el.onclick = () => {
      const o = opts[+el.dataset.i];
      applyEffects(o.effects);
      checkMilestones();
      if (sc.id === "c6s1") S.scamSeen = true;
      save();
      o.tone === "good" ? (coinDrop(), sfx.good()) : o.tone === "bad" ? sfx.bad() : sfx.click();
      document.querySelectorAll(".opt").forEach(b => { b.disabled = true; if (b !== el) b.style.opacity = .45; });
      let fb = `<div class="feedback ${o.tone}">${schemeify(esc(t(sc.id + "." + o.id + "fb")))}</div>`;
      if (sc.learnmore) fb += `<button class="learnmore-btn" id="lmBtn">${esc(t("ui.aurSamjho"))}</button><div id="lmArea"></div>`;
      document.getElementById("fbArea").innerHTML = fb;
      // refresh topbar numbers
      document.querySelector(".topbar").outerHTML = topbarHTML(); wireTopbar();
      wireSchemeTags();
      const lmBtn = document.getElementById("lmBtn");
      if (lmBtn) lmBtn.onclick = () => {
        document.getElementById("lmArea").innerHTML = `
          <div class="learnmore"><h4>${esc(t(sc.learnmore.key + ".t"))}</h4>
          ${esc(t(sc.learnmore.key + ".b"))}<br>
          <a href="${sc.learnmore.video}" target="_blank" rel="noopener">${esc(t("ui.video"))}</a></div>`;
        lmBtn.remove();
      };
      app.insertAdjacentHTML("beforeend",
        `<div class="bottombar"><button class="btn-primary" id="mainBtn">${esc(t("ui.next"))}</button></div>`);
      document.getElementById("mainBtn").onclick = () => {
        sfx.click(); S.screenIdx++; S.phase = "screen"; route();
      };
    });
  }

  function renderTimepass() {
    const nextCh = STORY.chapters[S.chapterIdx + 1];
    if (!nextCh) { S.phase = "ending"; return route(); }
    const yrs = nextCh.year - chapter().year;
    shell(`
      <div class="scene" style="text-align:center;">
        <div class="big-emoji">⏳</div>
        <p>${esc(t("ui.timepass", { n: yrs }))}</p>
      </div>`,
      t("ui.next"), () => {
        advanceYears(yrs);
        S.chapterIdx++; S.screenIdx = -1;
        S.phase = nextCh.album ? "album" : "chapterIntro";
        route();
      });
  }

  function albumTone() {
    const a = totalAssets();
    if (S.debt > 15000 || a < monthlyExpense()) return "bad";
    if (a < 4 * monthlyExpense()) return "mid";
    return "good";
  }

  /* ---------------- illustrated stage (the scene IS the game) ----------------
     Flat, warm, chawl-wall style. An artist can later replace this whole
     function's output with hand-drawn images — see DESIGN_BRIEF.md. */
  const CHAR_LOOK = {
    meena:  { saris: ["#D6336C", "#146B6A", "#7A4B94", "#B3402A"], skin: "#C68B59" },
    sunita: { saris: ["#146B6A", "#D6336C", "#E4573D", "#3D6B99"], skin: "#DDA36B" },
    rekha:  { saris: ["#7A4B94", "#4C8C2B", "#B3402A", "#8a5a2b"], skin: "#A9714A" }
  };
  function svgWoman(x, y, sc, o) {
    const ink = "#2E1E12", skin = o.skin || "#C68B59";
    let g = `<g transform="translate(${x},${y}) scale(${sc})">`;
    g += `<path d="M-17 0 Q0 4 17 0 L23 46 Q0 52 -23 46 Z" fill="${o.sari}" stroke="${ink}" stroke-width="2.5"/>`;
    g += `<path d="M-13 -26 L13 -26 L17 2 L-17 2 Z" fill="${o.blouse}" stroke="${ink}" stroke-width="2.5"/>`;
    g += `<path d="M13 -26 L-17 2 L-9 2 L15 -18 Z" fill="${o.sari}" opacity="0.92"/>`;
    g += `<circle cx="0" cy="-38" r="13" fill="${skin}" stroke="${ink}" stroke-width="2.5"/>`;
    g += `<path d="M-13 -38 Q-13 -52 0 -52 Q13 -52 13 -38 Q7 -46 0 -46 Q-7 -46 -13 -38 Z" fill="${o.hair}"/>`;
    g += `<circle cx="13" cy="-31" r="5.5" fill="${o.hair}"/>`;
    if (o.grey) g += `<path d="M-10 -47 Q-4 -50 2 -49" stroke="#DDD3C4" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    g += `<circle cx="0" cy="-43" r="1.9" fill="#D6336C"/>`;
    g += `<circle cx="-4.5" cy="-38" r="1.6" fill="${ink}"/><circle cx="4.5" cy="-38" r="1.6" fill="${ink}"/>`;
    g += o.smile
      ? `<path d="M-4 -32 Q0 -28 4 -32" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`
      : `<path d="M-4 -30.5 Q0 -33 4 -30.5" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    g += `</g>`;
    return g;
  }
  function svgMan(x, y, sc, o) {
    const ink = "#2E1E12", skin = "#B57B4B";
    let g = `<g transform="translate(${x},${y}) scale(${sc})">`;
    g += `<rect x="-9" y="18" width="7" height="28" fill="#4a3a2c" stroke="${ink}" stroke-width="2"/>`;
    g += `<rect x="2" y="18" width="7" height="28" fill="#4a3a2c" stroke="${ink}" stroke-width="2"/>`;
    g += `<path d="M-14 -26 L14 -26 L16 22 L-16 22 Z" fill="${o.kurta}" stroke="${ink}" stroke-width="2.5"/>`;
    g += `<circle cx="0" cy="-38" r="12" fill="${skin}" stroke="${ink}" stroke-width="2.5"/>`;
    g += `<path d="M-12 -40 Q-12 -50 0 -50 Q12 -50 12 -40 Q6 -45 0 -45 Q-6 -45 -12 -40 Z" fill="${o.hair}"/>`;
    g += `<circle cx="-4.5" cy="-39" r="1.6" fill="${ink}"/><circle cx="4.5" cy="-39" r="1.6" fill="${ink}"/>`;
    g += `<path d="M-5 -33 Q0 -30.5 5 -33" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    g += `</g>`;
    return g;
  }
  function svgGirl(x, y, sc, o) {
    const ink = "#2E1E12", skin = "#C68B59";
    let g = `<g transform="translate(${x},${y}) scale(${sc})">`;
    g += `<path d="M-4 -20 L4 -20 L14 14 L-14 14 Z" fill="${o.frock}" stroke="${ink}" stroke-width="2.4"/>`;
    g += `<rect x="-6" y="14" width="4.5" height="14" fill="${skin}" stroke="${ink}" stroke-width="1.8"/>`;
    g += `<rect x="1.5" y="14" width="4.5" height="14" fill="${skin}" stroke="${ink}" stroke-width="1.8"/>`;
    g += `<circle cx="0" cy="-30" r="10" fill="${skin}" stroke="${ink}" stroke-width="2.4"/>`;
    g += `<path d="M-10 -31 Q-10 -41 0 -41 Q10 -41 10 -31 Q5 -37 0 -37 Q-5 -37 -10 -31 Z" fill="#1d1108"/>`;
    g += `<circle cx="-11" cy="-27" r="3.6" fill="#1d1108"/><circle cx="11" cy="-27" r="3.6" fill="#1d1108"/>`;
    g += `<circle cx="-3.5" cy="-30" r="1.4" fill="${ink}"/><circle cx="3.5" cy="-30" r="1.4" fill="${ink}"/>`;
    g += `<path d="M-3 -25 Q0 -22.5 3 -25" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    if (o.book) g += `<rect x="-8" y="-14" width="16" height="11" rx="1.5" fill="#fff" stroke="${ink}" stroke-width="2"/><line x1="0" y1="-14" x2="0" y2="-3" stroke="${ink}" stroke-width="1.6"/>`;
    g += `</g>`;
    return g;
  }
  function stageSVG(cls) {
    const ink = "#2E1E12", tone = albumTone(), yr = S.year;
    let wall = tone === "bad" ? "#D9C6A4" : tone === "mid" ? "#F3DBAB" : "#FBE6B4";
    if (S.flags.mile_paint) wall = "#CFE8D8"; // freshly painted — mint green
    const gLevel = Math.min(88, Math.round(totalAssets() / (12 * monthlyExpense()) * 100));
    let s = `<svg class="${cls || ""}" viewBox="0 0 360 200" xmlns="http://www.w3.org/2000/svg" role="img">`;
    s += `<rect width="360" height="200" fill="${wall}"/>`;
    s += `<rect y="158" width="360" height="42" fill="#B98A5A"/><path d="M0 158 Q90 154 180 158 T360 158" stroke="${ink}" stroke-width="2.5" fill="none"/>`;
    // window with Mumbai sky + towers
    s += `<rect x="256" y="26" width="76" height="62" fill="#BFE3E0" stroke="${ink}" stroke-width="3"/>`;
    s += `<rect x="264" y="52" width="12" height="36" fill="#9CC5C2"/><rect x="282" y="42" width="12" height="46" fill="#8FBAB7"/><rect x="300" y="58" width="14" height="30" fill="#9CC5C2"/>`;
    s += `<line x1="294" y1="26" x2="294" y2="88" stroke="${ink}" stroke-width="2.5"/><line x1="256" y1="57" x2="332" y2="57" stroke="${ink}" stroke-width="2.5"/>`;
    // shelf
    s += `<rect x="22" y="86" width="150" height="6" fill="#8a5a2b" stroke="${ink}" stroke-width="2"/>`;
    s += `<rect x="30" y="66" width="22" height="20" rx="3" fill="#C9CED6" stroke="${ink}" stroke-width="2"/>`; // steel dabba
    // gullak with visible fill
    s += `<g><path d="M70 86 Q66 62 92 60 Q118 62 114 86 Z" fill="#C96F33" stroke="${ink}" stroke-width="2.5"/>`;
    s += `<clipPath id="gk"><path d="M70 86 Q66 62 92 60 Q118 62 114 86 Z"/></clipPath>`;
    s += `<rect x="66" y="${86 - 24 * gLevel / 100}" width="52" height="${24 * gLevel / 100}" fill="#F5A800" clip-path="url(#gk)"/>`;
    s += `<rect x="85" y="63" width="14" height="3" rx="1.5" fill="#3A1F0D"/></g>`;
    // family photos accumulate over the years
    const photos = Math.min(4, Math.floor(yr / 5));
    for (let i = 0; i < photos; i++)
      s += `<rect x="${128 + i * 16}" y="40" width="12" height="15" fill="#fff" stroke="${ink}" stroke-width="2"/><rect x="${130.5 + i * 16}" y="44" width="7" height="8" fill="${["#D6336C","#146B6A","#F5A800","#4C8C2B"][i]}"/>`;
    // V4: possessions appear as savings milestones are reached
    const F = S.flags;
    if (F.mile_fan)  s += `<g><line x1="180" y1="0" x2="180" y2="12" stroke="${ink}" stroke-width="2.5"/><circle cx="180" cy="14" r="3" fill="${ink}"/><ellipse cx="166" cy="15" rx="12" ry="4" fill="#C9CED6" stroke="${ink}" stroke-width="2"/><ellipse cx="194" cy="15" rx="12" ry="4" fill="#C9CED6" stroke="${ink}" stroke-width="2"/></g>`;
    if (F.mile_bed)  s += `<g><rect x="290" y="132" width="62" height="14" rx="3" fill="#8a5a2b" stroke="${ink}" stroke-width="2.4"/><rect x="292" y="124" width="24" height="10" rx="4" fill="#fff" stroke="${ink}" stroke-width="2"/><rect x="290" y="146" width="5" height="12" fill="#5d3a1a"/><rect x="347" y="146" width="5" height="12" fill="#5d3a1a"/></g>`;
    if (F.mile_tv)   s += `<g><rect x="216" y="60" width="34" height="22" rx="2" fill="#20242a" stroke="${ink}" stroke-width="2.4"/><rect x="220" y="64" width="26" height="14" fill="#7fd0cb"/><rect x="228" y="82" width="10" height="4" fill="${ink}"/></g>`;
    if (F.mile_fridge) s += `<rect x="196" y="96" width="34" height="62" rx="4" fill="#E4573D" stroke="${ink}" stroke-width="3"/><line x1="199" y1="120" x2="227" y2="120" stroke="${ink}" stroke-width="2.5"/><circle cx="222" cy="110" r="2" fill="${ink}"/>`;
    if (F.mile_wash) s += `<g><rect x="300" y="96" width="30" height="38" rx="3" fill="#DDE4EA" stroke="${ink}" stroke-width="2.6"/><circle cx="315" cy="117" r="9" fill="#9CC5C2" stroke="${ink}" stroke-width="2.2"/><circle cx="306" cy="101" r="1.8" fill="${ink}"/><circle cx="312" cy="101" r="1.8" fill="${ink}"/></g>`;
    if (tone === "bad") {
      s += `<path d="M40 14 l7 12 -5 9 8 12" stroke="#8f7a58" stroke-width="3" fill="none" stroke-linecap="round"/>`; // crack
      s += `<path d="M226 30 q26 12 52 0" stroke="${ink}" stroke-width="1.6" fill="none"/><path d="M238 30 l0 8 M252 31 l0 10 M266 30 l0 7" stroke="${ink}" stroke-width="1.4"/>`; // clothesline
    }
    // diya for remembrance
    if (S.flags.widowed) s += `<g><ellipse cx="152" cy="84" rx="9" ry="4.5" fill="#C96F33" stroke="${ink}" stroke-width="2"/><path d="M152 78 q-3.4 -7 0 -11 q3.4 4 0 11" fill="#F5A800" stroke="#E4573D" stroke-width="1.4"/></g>`;
    // family
    const ageIdx = yr <= 3 ? 0 : yr <= 8 ? 1 : yr <= 14 ? 2 : 3;
    const look = CHAR_LOOK[S.charId] || CHAR_LOOK.meena;
    s += svgWoman(84, 152, 1.28, {
      sari: look.saris[ageIdx], blouse: "#F5A800", skin: look.skin,
      hair: ageIdx >= 3 ? "#5d4d3d" : "#1d1108", grey: ageIdx >= 2,
      smile: tone !== "bad"
    });
    if (!S.flags.widowed)
      s += svgMan(150, 152, 1.24, { kurta: tone === "bad" ? "#9aa5a0" : "#2E7D78", hair: ageIdx >= 3 ? "#5d4d3d" : "#1d1108" });
    // mother-in-law — part of the household from day 1
    s += svgWoman(36, 152, 1.12, { sari: "#8a6d3b", blouse: "#B98A5A", skin: "#B57B4B", hair: "#7d6d5d", grey: true, smile: tone !== "bad" });
    if (yr >= 7 && yr < 10)
      s += `<g><path d="M232 150 q18 16 36 0 l-3 12 q-15 10 -30 0 Z" fill="#8a5a2b" stroke="${ink}" stroke-width="2.4"/><circle cx="250" cy="146" r="8" fill="#C68B59" stroke="${ink}" stroke-width="2.2"/><path d="M242 146 q8 -10 16 0" fill="#1d1108"/></g>`; // baby cradle
    if (yr >= 10)
      s += svgGirl(252, 150, yr >= 15 ? 1.35 : 1.0, { frock: "#F5A800", book: yr >= 15 && !S.flags.eduPulled });
    s += `</svg>`;
    return `<div class="stage-wrap ${cls || ""}">${s}</div>`;
  }

  /* replay collection */
  function endingsSeen() {
    try { return JSON.parse(localStorage.getItem("meena_endings") || "[]"); } catch (e) { return []; }
  }
  function renderAlbum() {
    const tone = albumTone();
    shell(`
      <div class="album">
        <h3>${esc(t("album.t", { y: chapter().year }))}</h3>
        ${stageSVG("")}
        <p>${esc(t("album." + tone))}</p>
        <span class="stat">${esc(t("album.stats", { a: rupees(totalAssets()), d: rupees(S.debt) }))}</span>
      </div>`,
      t("ui.next"), () => { S.phase = "chapterIntro"; route(); });
    tone === "good" ? sfx.good() : tone === "bad" ? sfx.bad() : sfx.click();
  }

  /* ---------------- ending + share ---------------- */
  function renderEnding() {
    const E = computeEnding();
    track("ending_tier_" + E.tier);
    const badges = { 1: "🕳️", 2: "🌧️", 3: "🌤️", 4: "🌟" };
    const extra = [];
    if (S.flags.eduKept) extra.push(t("end.edu"));
    if (S.flags.eduPulled) extra.push(t("end.eduPulled"));
    if (S.flags.mentor) extra.push(t("end.mentor"));
    if (S.flags.widowed) extra.push(t("end.widow"));
    const seen = endingsSeen();
    if (seen.indexOf(E.tier) < 0) { seen.push(E.tier); try { localStorage.setItem("meena_endings", JSON.stringify(seen)); } catch (e) {} }
    const collectRow = [1,2,3,4].map(i =>
      `<span class="collect ${seen.indexOf(i) >= 0 ? "on" : ""}">${seen.indexOf(i) >= 0 ? {1:"🕳️",2:"🌧️",3:"🌤️",4:"🌟"}[i] : "🔒"}</span>`).join("");
    shell(`
      <div class="chapter-card"><h2>${esc(t("end.t"))}</h2></div>
      ${stageSVG("")}
      <div class="album tier-${E.tier}">
        <div class="tier-badge">${badges[E.tier]}</div>
        <h3>${esc(t("end.tier" + E.tier + ".t"))}</h3>
        <p>${esc(t("end.tier" + E.tier + ".b"))}</p>
        <span class="stat">${esc(t("end.assets", { a: rupees(E.assets) }))}</span>
        ${S.debt > 0 ? `<span class="stat">${esc(t("end.debtLine", { d: rupees(S.debt) }))}</span>` : ""}
        ${S.flags.apy ? `<span class="stat">${esc(t("end.pension"))}</span>` : ""}
        <p>${esc(t("end.ail." + E.ail))}</p>
        ${extra.map(x => `<p>${esc(x)}</p>`).join("")}
      </div>
      <div class="scene">
        <div class="speaker">${esc(t("ui.lessonsTitle"))}</div>
        <ul class="lesson-list">${E.lessons.map(k => `<li>${esc(t(k))}</li>`).join("")}</ul>
        <p style="font-size:13px;opacity:.75;">${esc(t("ui.madeWith"))}</p>
      </div>
      <div class="scene" style="text-align:center;">
        <div class="speaker">${esc(t("ui.collection", { x: seen.length }))}</div>
        <div class="collect-row">${collectRow}</div>
        <p style="font-size:14px;">${esc(t("ui.collectionHint"))}</p>
      </div>
      <canvas id="shareCanvas" width="1080" height="1080"></canvas>`,
      t("ui.share"), () => { track("share_clicked"); shareCard(E); },
      { label: t("ui.playAgain"), fn: () => { localStorage.removeItem(SAVE_KEY); S = null; renderTitle(); } });
    E.tier >= 3 ? sfx.win() : sfx.sting();
  }

  function shareCard(E) {
    const cv = document.getElementById("shareCanvas"), x = cv.getContext("2d");
    const colors = { 1: "#B3402A", 2: "#8a6d3b", 3: "#146B6A", 4: "#4C8C2B" };
    x.fillStyle = "#FFF3DC"; x.fillRect(0, 0, 1080, 1080);
    x.fillStyle = "#D6336C"; x.fillRect(0, 0, 1080, 200);
    x.fillStyle = "#fff"; x.font = "bold 72px sans-serif"; x.textAlign = "center";
    x.fillText(t("share.cardTop"), 540, 125);
    const badges = { 1: "🕳️", 2: "🌧️", 3: "🌤️", 4: "🌟" };
    x.font = "220px sans-serif"; x.fillText(badges[E.tier], 540, 500);
    x.fillStyle = colors[E.tier]; x.font = "bold 88px sans-serif";
    x.fillText(t("end.tier" + E.tier + ".t"), 540, 660);
    x.fillStyle = "#2E1E12"; x.font = "56px sans-serif";
    x.fillText(t("end.assets", { a: rupees(E.assets) }), 540, 770);
    x.fillStyle = "#146B6A"; x.font = "bold 52px sans-serif";
    x.fillText(t("share.cardBottom"), 540, 950);
    cv.toBlob(async (blob) => {
      const file = new File([blob], "meena-result.png", { type: "image/png" });
      const shareUrl = location.origin + location.pathname + "?src=share";
      const text = t("share.text", { tier: t("end.tier" + E.tier + ".t"), a: rupees(E.assets) }) + " " + shareUrl;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text }); return; } catch (e) {}
      }
      if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) {} }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "meena-result.png"; a.click();
      alert(t("ui.shareFail"));
    });
  }

  /* ---------------- boot ---------------- */
  async function loadLang(lang) {
    const res = await fetch("data/lang/" + lang + ".json");
    L = await res.json();
  }
  async function boot() {
    try {
      const res = await fetch("data/story.json");
      STORY = await res.json();
      const lang = localStorage.getItem(LANG_KEY) || "hi";
      await loadLang(lang);
      const saved = loadSave();
      if (saved) { S = saved; if (S.lang) await loadLang(S.lang); }
      if (S) S.lang = localStorage.getItem(LANG_KEY) || "hi";
      renderTitle();
    } catch (e) {
      app.innerHTML = "<div class='boot'><p>Could not load game files. If you opened index.html directly, please run a local server (see SETUP_GUIDE.md) or deploy to Netlify/GitHub Pages.</p></div>";
    }
  }
  boot();
})();
