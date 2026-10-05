/* =============================================================
   WIN2 공지 허브 — 렌더링 로직 (v2: 탭 구조)
   내용 수정은 data.js 에서만 합니다. 이 파일은 건드릴 필요 없음.
   ============================================================= */
(function () {
  "use strict";

  var DATA = window.HUB_DATA || {};
  var TZ = "America/New_York";

  // ── 날짜 유틸 (America/New_York 기준) ─────────────────────
  function todayNY() {
    var s = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date());
    return ymdToMs(s);
  }
  function ymdToMs(str) {
    if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return NaN;
    var p = str.split("-");
    return Date.UTC(+p[0], +p[1] - 1, +p[2]);
  }
  var DAY = 86400000;
  function daysBetween(a, b) { return Math.round((b - a) / DAY); }
  function fmtDate(ms) {
    if (isNaN(ms)) return "확인 필요";
    var d = new Date(ms);
    var mo = d.getUTCMonth() + 1, da = d.getUTCDate();
    var wd = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()];
    return mo + "/" + da + "(" + wd + ")";
  }
  function dateRangeText(item) {
    var s = ymdToMs(item.start), e = ymdToMs(item.end || item.start);
    if (isNaN(s)) return "확인 필요";
    if (isNaN(e) || e === s) return fmtDate(s);
    return fmtDate(s) + " – " + fmtDate(e);
  }

  var TODAY = todayNY();

  function isPast(item) {
    if (item.done) return true;
    var e = ymdToMs(item.end || item.start);
    if (isNaN(e)) return false;
    return e < TODAY;
  }
  function relLabel(item) {
    if (item.done) return { text: "지남", kind: "past" };
    var s = ymdToMs(item.start), e = ymdToMs(item.end || item.start);
    if (isNaN(s)) return { text: "확인 필요", kind: "far" };
    if (e < TODAY) return { text: "지남", kind: "past" };
    if (s <= TODAY && TODAY <= e) {
      if (s === e) return { text: "오늘", kind: "today" };
      return { text: "진행 중", kind: "now" };
    }
    var diff = daysBetween(TODAY, s);
    if (diff === 0) return { text: "오늘", kind: "today" };
    if (diff === 1) return { text: "내일", kind: "soon" };
    return { text: "D-" + diff, kind: diff <= 7 ? "soon" : "far" };
  }

  // ── HTML 이스케이프 ───────────────────────────────────────
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function inlineFormat(escaped) {
    escaped = escaped.replace(/@([0-9A-Za-z_가-힣]+)/g, '<span class="mention">@$1</span>');
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return escaped;
  }

  // ── markdown-lite 렌더러 ──────────────────────────────────
  function renderMarkdown(src) {
    var lines = String(src || "").split("\n");
    var html = "", listType = null, paraBuf = [];
    function flushList() { if (listType) { html += "</" + listType + ">"; listType = null; } }
    function flushPara() { if (paraBuf.length) { html += "<p>" + paraBuf.join("<br>") + "</p>"; paraBuf = []; } }
    function openList(type) { if (listType !== type) { flushList(); html += "<" + type + ">"; listType = type; } }
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].replace(/\s+$/, "").trim();
      if (t === "") { flushPara(); flushList(); continue; }
      var mH = t.match(/^#{2,3}\s+(.*)$/);
      var mUL = t.match(/^[-*]\s+(.*)$/);
      var mOL = t.match(/^(\d+)\.\s+(.*)$/);
      if (mH) { flushPara(); flushList(); html += "<h4>" + inlineFormat(esc(mH[1])) + "</h4>"; }
      else if (mUL) { flushPara(); openList("ul"); html += "<li>" + inlineFormat(esc(mUL[1])) + "</li>"; }
      else if (mOL) { flushPara(); openList("ol"); html += "<li>" + inlineFormat(esc(mOL[2])) + "</li>"; }
      else { flushList(); paraBuf.push(inlineFormat(esc(t))); }
    }
    flushPara(); flushList();
    return html;
  }

  // ── DOM 헬퍼 ──────────────────────────────────────────────
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;   // 호출부에서 escape 된 것만 전달
    return n;
  }
  function relBadge(item) {
    var r = relLabel(item);
    return el("span", "rel " + r.kind, esc(r.text));
  }
  function flash(card) {
    card.classList.remove("flash");
    void card.offsetWidth;
    card.classList.add("flash");
  }

  // ── 카드 ──────────────────────────────────────────────────
  function buildCard(item) {
    var hasBody = item.body && item.body.trim() !== "";
    var hasPeople = item.people && item.people.length;
    var card = el("div", "card" + (hasBody ? "" : " no-body"));
    card.id = "card-" + item.id;

    var head = el("button", "card-head");
    head.type = "button";
    head.setAttribute("aria-expanded", "false");

    var row1 = el("div", "card-row1");
    row1.appendChild(el("span", "card-title", inlineFormat(esc(item.title || "확인 필요"))));
    var chip = categoryChip(item);
    if (chip) row1.appendChild(chip);
    row1.appendChild(relBadge(item));
    if (hasBody) row1.appendChild(el("span", "card-chev", "▾"));
    head.appendChild(row1);
    head.appendChild(el("div", "card-date", esc(dateRangeText(item))));

    if (item.summary) head.appendChild(el("div", "card-summary", inlineFormat(esc(item.summary))));
    else if (!hasBody && !hasPeople) head.appendChild(el("div", "card-summary muted", "확인 필요"));

    if (hasPeople) {
      var pe = el("div", "people");
      item.people.forEach(function (name) { pe.appendChild(el("span", "chip", esc(name))); });
      head.appendChild(pe);
    }
    card.appendChild(head);

    if (hasBody) {
      var body = el("div", "card-body");
      body.appendChild(el("div", "md", renderMarkdown(item.body)));
      card.appendChild(body);
      head.addEventListener("click", function () {
        var open = card.classList.toggle("open");
        head.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    return card;
  }

  // ── 정렬 헬퍼 ─────────────────────────────────────────────
  function byStartAsc(a, b) { return ymdToMs(a.start) - ymdToMs(b.start); }
  function byEndDesc(a, b) { return ymdToMs(b.end || b.start) - ymdToMs(a.end || a.start); }

  // 카테고리 → 칩 라벨 (이제 탭이 아니라 카드 위 작은 칩으로만 구분)
  var CATEGORY_LABEL = {
    leadership: "리더십",
    outing: "아웃팅",
    notice: "공지",
    reminder: "리마인더"
  };
  function categoryChip(item) {
    var label = CATEGORY_LABEL[item.category];
    if (!label) return null;
    return el("span", "cat-chip cat-" + item.category, esc(label));
  }

  // ── 탭 정의 ───────────────────────────────────────────────
  var TABS = [
    { id: "main",    label: "🏠 메인" },
    { id: "prayer",  label: "🙏 기도" },
    { id: "gwanggo", label: "📋 광고" },
    { id: "archive", label: "🗄️ 보관함" }
  ];

  // 🔒 사이트 전체 비밀번호 게이트 (가벼운 UI 잠금 — 강력한 보안은 아님).
  //   비밀번호 원문은 코드에 없고, SHA-256 해시만 저장해 비교합니다.
  //   한 기기에서 한 번 입력하면 계속 열린 상태로 유지됩니다(localStorage).
  var SITE_PW_HASH = "625b8de2f2d06e9d674d60dffe3d09cbc59a50b2cb1c71d38be0b2bc80af5a27";
  var SITE_UNLOCK_KEY = "win2_unlocked";
  function siteUnlocked() {
    try { return localStorage.getItem(SITE_UNLOCK_KEY) === "1"; } catch (e) { return false; }
  }
  function sha256hex(str) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
      return [].map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }
  var galleryBuilt = false;

  function setActive(tabId, updateHash) {
    if (!TABS.some(function (t) { return t.id === tabId; })) tabId = "main";
    TABS.forEach(function (t) {
      var panel = document.getElementById("panel-" + t.id);
      var btn = document.getElementById("tab-" + t.id);
      var on = t.id === tabId;
      if (panel) panel.classList.toggle("active", on);
      if (btn) { btn.classList.toggle("active", on); btn.setAttribute("aria-selected", on ? "true" : "false"); }
    });
    if (tabId === "gwanggo" && !galleryBuilt) buildGallery();
    if (updateHash !== false) {
      if (history.replaceState) history.replaceState(null, "", "#" + tabId);
      else location.hash = tabId;
    }
    // 활성 탭 버튼을 가로 스크롤 영역에서 보이게
    var ab = document.getElementById("tab-" + tabId);
    if (ab && ab.scrollIntoView) ab.scrollIntoView({ block: "nearest", inline: "center" });
  }

  // ── 고정(핀) 정보 — 메인 맨 위 (날짜 없는 상시 정보) ──────
  function buildPinned(pins) {
    if (!pins || !pins.length) return null;
    var wrap = el("div", "pinned");
    pins.forEach(function (p) {
      var box = el("div", "pin");
      box.appendChild(el("div", "pin-title", "📌 " + inlineFormat(esc(p.title || "확인 필요"))));
      if (p.body && p.body.trim()) box.appendChild(el("div", "md pin-body", renderMarkdown(p.body)));
      wrap.appendChild(box);
    });
    return wrap;
  }

  // ── 기도 제목 (🙏 기도 탭) ────────────────────────────────
  function buildPrayer(pr) {
    var wrap = document.createElement("div");
    var people = (pr && pr.people) || [];
    if (!people.length) { wrap.appendChild(el("p", "muted empty", "기도 제목이 없습니다.")); return wrap; }
    var grid = el("div", "card-grid");
    people.forEach(function (person) {
      var card = el("div", "card pray-card");
      var inner = el("div", "pray-inner");
      inner.appendChild(el("div", "pray-name", inlineFormat(esc(person.name || "확인 필요"))));
      if (person.requests && person.requests.length) {
        var ul = el("ul", "pray-list");
        person.requests.forEach(function (r) { ul.appendChild(el("li", null, inlineFormat(esc(r)))); });
        inner.appendChild(ul);
      } else {
        inner.appendChild(el("div", "pray-empty muted", "확인 필요"));
      }
      card.appendChild(inner);
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  // 🔒 사이트 비밀번호 입력 화면 (전체 사이트 잠금)
  function buildSiteLock(app) {
    var screen = el("div", "site-lock");
    var box = el("div", "lockbox");
    box.appendChild(el("div", "lock-brand", "WIN2 공지 허브"));
    box.appendChild(el("div", "lock-title", "🔒 비밀번호를 입력하세요"));
    var form = document.createElement("form");
    form.className = "lock-form";
    var input = document.createElement("input");
    input.type = "password"; input.className = "lock-input";
    input.placeholder = "비밀번호"; input.autocomplete = "current-password";
    input.setAttribute("aria-label", "비밀번호");
    var btn = el("button", "lock-btn", "열기"); btn.type = "submit";
    form.appendChild(input); form.appendChild(btn);
    var err = el("div", "lock-err", "");
    box.appendChild(form); box.appendChild(err);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      sha256hex(input.value).then(function (h) {
        if (h === SITE_PW_HASH) {
          try { localStorage.setItem(SITE_UNLOCK_KEY, "1"); } catch (e2) {}
          render();
        } else {
          err.textContent = "비밀번호가 올바르지 않습니다.";
          input.value = ""; input.focus();
        }
      });
    });
    screen.appendChild(box);
    app.appendChild(screen);
    setTimeout(function () { try { input.focus(); } catch (e3) {} }, 50);
  }

  // ── 주일 광고 헤더 (날짜 + 선택적 슬라이드 링크) ──────────
  //   광고 내용 자체는 슬라이드 사진 그리드로 보여준다.
  function buildGwanggoHead(g) {
    var wrap = el("div", "gwanggo-head");
    if (g.date) wrap.appendChild(el("div", "gwanggo-date", esc(fmtDate(ymdToMs(g.date)) + " 주일 광고")));
    if (g.slidesUrl && g.slidesUrl.trim()) {
      var a = el("a", "slide-link", "📑 구글 슬라이드 전체 보기");
      a.href = g.slidesUrl; a.target = "_blank"; a.rel = "noopener noreferrer";
      wrap.appendChild(a);
    }
    return wrap;
  }

  // ── 카드 그리드 ───────────────────────────────────────────
  function buildCardGrid(items, emptyMsg) {
    if (!items.length) return el("p", "muted empty", emptyMsg || "항목이 없습니다.");
    var grid = el("div", "card-grid");
    items.forEach(function (it) { grid.appendChild(buildCard(it)); });
    return grid;
  }

  // ── 사진 갤러리 + 라이트박스 ──────────────────────────────
  function buildGallery() {
    galleryBuilt = true;
    var panel = document.getElementById("panel-gwanggo");
    var photos = DATA.photos || [];
    if (!photos.length) { panel.appendChild(el("p", "muted empty", "사진이 없습니다.")); return; }
    var grid = el("div", "gallery");
    photos.forEach(function (p, idx) {
      var btn = el("button", "gphoto");
      btn.type = "button";
      btn.setAttribute("aria-label", (p.caption || "사진") + " 크게 보기");
      var img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = p.caption || "";
      img.src = p.thumb || p.src;
      btn.appendChild(img);
      if (p.caption) btn.appendChild(el("span", "gcap", esc(p.caption)));
      btn.addEventListener("click", function () { openLightbox(idx); });
      grid.appendChild(btn);
    });
    panel.appendChild(grid);
  }

  var lb = null, lbIndex = 0;
  function ensureLightbox() {
    if (lb) return lb;
    lb = el("div", "lightbox");
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.innerHTML =
      '<button class="lb-close" aria-label="닫기">✕</button>' +
      '<button class="lb-nav lb-prev" aria-label="이전">‹</button>' +
      '<figure class="lb-fig"><img class="lb-img" alt=""><figcaption class="lb-cap"></figcaption></figure>' +
      '<button class="lb-nav lb-next" aria-label="다음">›</button>';
    document.body.appendChild(lb);
    lb.querySelector(".lb-close").addEventListener("click", closeLightbox);
    lb.querySelector(".lb-prev").addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
    lb.querySelector(".lb-next").addEventListener("click", function (e) { e.stopPropagation(); step(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    });
    return lb;
  }
  function showPhoto(i) {
    var photos = DATA.photos || [];
    lbIndex = (i + photos.length) % photos.length;
    var p = photos[lbIndex];
    var img = lb.querySelector(".lb-img");
    img.src = p.src || p.thumb;
    img.alt = p.caption || "";
    lb.querySelector(".lb-cap").textContent = p.caption || "";
  }
  function openLightbox(i) {
    ensureLightbox();
    showPhoto(i);
    lb.classList.add("open");
    document.body.classList.add("no-scroll");
  }
  function closeLightbox() {
    if (!lb) return;
    lb.classList.remove("open");
    document.body.classList.remove("no-scroll");
  }
  function step(d) { showPhoto(lbIndex + d); }

  // ── 메인 렌더 ─────────────────────────────────────────────
  function render() {
    var app = document.getElementById("app");
    app.innerHTML = "";

    // 🔒 비밀번호 잠금 — 열려 있지 않으면 잠금 화면만 보여주고 끝
    if (!siteUnlocked()) { buildSiteLock(app); return; }

    var items = (DATA.items || []).slice();
    var live = items.filter(function (it) { return !isPast(it); });
    var past = items.filter(isPast).sort(byEndDesc);
    var upcoming = live.slice().sort(byStartAsc);

    // 상단바: 헤더 + 탭 (탭은 sticky)
    var header = el("header", "site-header");
    header.appendChild(el("h1", null, "WIN2 공지 허브"));
    var upd = DATA.updated
      ? "마지막 업데이트: " + esc(DATA.updated)
      : '<span class="muted">마지막 업데이트: 확인 필요</span>';
    header.appendChild(el("div", "updated", upd));
    app.appendChild(header);

    var nav = el("nav", "tabs");
    nav.setAttribute("role", "tablist");
    TABS.forEach(function (t) {
      var b = el("button", "tab", esc(t.label));
      b.type = "button";
      b.id = "tab-" + t.id;
      b.setAttribute("role", "tab");
      b.addEventListener("click", function () { setActive(t.id); });
      nav.appendChild(b);
    });
    app.appendChild(nav);

    var main = el("div", "panels");
    TABS.forEach(function (t) {
      var panel = el("section", "panel");
      panel.id = "panel-" + t.id;
      panel.setAttribute("role", "tabpanel");
      main.appendChild(panel);
    });
    app.appendChild(main);

    // 🏠 메인: 고정 정보(있으면) + 다가오는 모든 일정 한 피드 (가까운 순)
    var pMain = document.getElementById("panel-main");
    var pinned = buildPinned(DATA.pinned);
    if (pinned) pMain.appendChild(pinned);
    pMain.appendChild(el("h2", "panel-h", "🗓️ 다가오는 일정 " + '<span class="count">' + upcoming.length + "</span>"));
    pMain.appendChild(buildCardGrid(upcoming, "예정된 일정이 없습니다."));

    // 🙏 기도 제목
    var pPr = document.getElementById("panel-prayer");
    if (pPr) {
      var nPray = (DATA.prayer && DATA.prayer.people ? DATA.prayer.people.length : 0);
      pPr.appendChild(el("h2", "panel-h", "🙏 기도 제목 " + '<span class="count">' + nPray + "</span>"));
      if (DATA.prayer && DATA.prayer.updated) {
        pPr.appendChild(el("div", "gwanggo-head", '<span class="gwanggo-date">' + esc("기준: " + DATA.prayer.updated) + "</span>"));
      }
      pPr.appendChild(buildPrayer(DATA.prayer));
    }

    // 📋 광고 (슬라이드 사진 그리드; 갤러리는 처음 열 때 lazy 생성)
    var pGw = document.getElementById("panel-gwanggo");
    var nPhotos = (DATA.photos || []).length;
    pGw.appendChild(el("h2", "panel-h", "📋 이번 주 광고 " + '<span class="count">' + nPhotos + "</span>"));
    if (DATA.gwanggo) pGw.appendChild(buildGwanggoHead(DATA.gwanggo));
    if (!nPhotos) pGw.appendChild(el("p", "muted empty", "광고 슬라이드가 없습니다."));

    // 🗄️ 보관함 (지난 것 전부, 최신순 — 그냥 한 줄 목록)
    var pAr = document.getElementById("panel-archive");
    pAr.appendChild(el("h2", "panel-h", "🗄️ 보관함 " + '<span class="count">' + past.length + "</span>"));
    pAr.appendChild(buildCardGrid(past, "보관된 공지가 없습니다."));

    // 초기 탭 = 해시 또는 메인
    var initial = (location.hash || "").replace("#", "");
    setActive(initial || "main", false);
    window.addEventListener("hashchange", function () {
      setActive((location.hash || "").replace("#", "") || "main", false);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
