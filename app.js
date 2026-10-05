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

  // 아이템 → 어느 탭에 카드가 있는가
  function tabForItem(item) {
    if (isPast(item)) return "past";
    if (item.category === "leadership") return "leadership";
    if (item.category === "outing") return "outing";
    return "iljeong"; // notice / reminder 는 일정 탭에 표시
  }

  // ── 탭 정의 ───────────────────────────────────────────────
  var TABS = [
    { id: "iljeong",    label: "🗓️ 일정" },
    { id: "gwanggo",    label: "📋 광고" },
    { id: "leadership", label: "👥 리더십" },
    { id: "outing",     label: "🧺 아웃팅" },
    { id: "past",       label: "🗄️ 지난" }
  ];
  var galleryBuilt = false;

  function setActive(tabId, updateHash) {
    if (!TABS.some(function (t) { return t.id === tabId; })) tabId = "iljeong";
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

  function jumpToItem(id, category) {
    var tab = category === "leadership" ? "leadership"
            : category === "outing" ? "outing" : "iljeong";
    setActive(tab);
    var card = document.getElementById("card-" + id);
    if (!card) return;
    if (!card.classList.contains("open") && !card.classList.contains("no-body")) {
      var head = card.querySelector(".card-head");
      if (head) head.click();
    }
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    flash(card);
  }

  // ── 타임라인 (일정 탭) ────────────────────────────────────
  function buildTimeline(upcoming) {
    if (!upcoming.length) return el("p", "muted empty", "예정된 일정이 없습니다.");
    var ul = el("ul", "timeline");
    upcoming.forEach(function (item) {
      var li = document.createElement("li");
      var btn = el("button");
      btn.type = "button";
      btn.appendChild(el("span", "tl-date", esc(fmtDate(ymdToMs(item.start)))));
      btn.appendChild(el("span", "tl-title", inlineFormat(esc(item.title || "확인 필요"))));
      btn.appendChild(relBadge(item));
      btn.addEventListener("click", function () { jumpToItem(item.id, item.category); });
      li.appendChild(btn);
      ul.appendChild(li);
    });
    return ul;
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

    // 일정 탭: 타임라인 + (notice/reminder 카드)
    var pIl = document.getElementById("panel-iljeong");
    pIl.appendChild(el("h2", "panel-h", "🗓️ 다가오는 일정 " + '<span class="count">' + upcoming.length + "</span>"));
    pIl.appendChild(buildTimeline(upcoming));
    var loose = live.filter(function (it) { return it.category === "notice" || it.category === "reminder"; }).sort(byStartAsc);
    if (loose.length) {
      pIl.appendChild(el("h2", "panel-h sub", "📢 공지·리마인더"));
      pIl.appendChild(buildCardGrid(loose));
    }

    // 광고 탭 (슬라이드 사진 그리드; 갤러리는 처음 열 때 lazy 생성)
    var pGw = document.getElementById("panel-gwanggo");
    var nPhotos = (DATA.photos || []).length;
    pGw.appendChild(el("h2", "panel-h", "📋 이번 주 광고 " + '<span class="count">' + nPhotos + "</span>"));
    if (DATA.gwanggo) pGw.appendChild(buildGwanggoHead(DATA.gwanggo));
    if (!nPhotos) pGw.appendChild(el("p", "muted empty", "광고 슬라이드가 없습니다."));

    // 리더십 탭
    var lead = live.filter(function (it) { return it.category === "leadership"; }).sort(byStartAsc);
    var pLe = document.getElementById("panel-leadership");
    pLe.appendChild(el("h2", "panel-h", "👥 리더십 " + '<span class="count">' + lead.length + "</span>"));
    pLe.appendChild(buildCardGrid(lead, "예정된 리더십 일정이 없습니다."));

    // 아웃팅 탭
    var out = live.filter(function (it) { return it.category === "outing"; }).sort(byStartAsc);
    var pOut = document.getElementById("panel-outing");
    pOut.appendChild(el("h2", "panel-h", "🧺 아웃팅·모임 " + '<span class="count">' + out.length + "</span>"));
    pOut.appendChild(buildCardGrid(out, "예정된 아웃팅·모임이 없습니다."));

    // 지난 탭 (최신순)
    var pPa = document.getElementById("panel-past");
    pPa.appendChild(el("h2", "panel-h", "🗄️ 지난 공지 " + '<span class="count">' + past.length + "</span>"));
    pPa.appendChild(buildCardGrid(past, "지난 공지가 없습니다."));

    // 초기 탭 = 해시 또는 일정
    var initial = (location.hash || "").replace("#", "");
    setActive(initial || "iljeong", false);
    window.addEventListener("hashchange", function () {
      setActive((location.hash || "").replace("#", "") || "iljeong", false);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
