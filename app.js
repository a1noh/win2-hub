/* =============================================================
   WIN2 공지 허브 — 렌더링 로직
   내용 수정은 data.js 에서만 합니다. 이 파일은 건드릴 필요 없음.
   ============================================================= */
(function () {
  "use strict";

  var DATA = window.HUB_DATA || {};
  var TZ = "America/New_York";

  var CATEGORY_LABEL = {
    leadership: "리더십",
    outing: "아웃팅·모임",
    notice: "공지",
    reminder: "리마인더"
  };

  // ── 날짜 유틸 (America/New_York 기준) ─────────────────────
  // 날짜만 비교하려고 UTC 자정 기준 ms 로 변환해서 다룬다.

  function todayNY() {
    // en-CA 로케일 → "YYYY-MM-DD"
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

  // 상대 날짜 라벨 → { text, kind }
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

  // ── HTML 이스케이프 (raw innerHTML 사용 금지) ─────────────
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ── 인라인 포맷: **굵게**, @멘션 ──────────────────────────
  // 입력은 반드시 이미 escape 된 문자열이어야 한다.
  function inlineFormat(escaped) {
    // @이름 (한글/영문/숫자/_), 멘션 칩으로
    escaped = escaped.replace(
      /@([0-9A-Za-z_가-힣]+)/g,
      '<span class="mention">@$1</span>'
    );
    // **굵게**
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return escaped;
  }

  // ── markdown-lite 렌더러 ──────────────────────────────────
  //   ## 제목 / - · * 글머리 / N. 번호 / **굵게** / @멘션 / 빈 줄=문단
  function renderMarkdown(src) {
    var lines = String(src || "").split("\n");
    var html = "";
    var listType = null;   // "ul" | "ol" | null
    var paraBuf = [];

    function flushList() {
      if (listType) { html += "</" + listType + ">"; listType = null; }
    }
    function flushPara() {
      if (paraBuf.length) {
        html += "<p>" + paraBuf.join("<br>") + "</p>";
        paraBuf = [];
      }
    }
    function openList(type) {
      if (listType !== type) { flushList(); html += "<" + type + ">"; listType = type; }
    }

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var line = raw.replace(/\s+$/, "");
      var t = line.trim();

      if (t === "") { flushPara(); flushList(); continue; }

      var mH = t.match(/^#{2,3}\s+(.*)$/);              // ## / ###
      var mUL = t.match(/^[-*]\s+(.*)$/);               // - 또는 *
      var mOL = t.match(/^(\d+)\.\s+(.*)$/);            // 1. 2. ...

      if (mH) {
        flushPara(); flushList();
        html += "<h4>" + inlineFormat(esc(mH[1])) + "</h4>";
      } else if (mUL) {
        flushPara(); openList("ul");
        html += "<li>" + inlineFormat(esc(mUL[1])) + "</li>";
      } else if (mOL) {
        flushPara(); openList("ol");
        html += "<li>" + inlineFormat(esc(mOL[2])) + "</li>";
      } else {
        flushList();
        paraBuf.push(inlineFormat(esc(t)));
      }
    }
    flushPara(); flushList();
    return html;
  }

  // ── DOM 헬퍼 ──────────────────────────────────────────────
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;   // html 은 호출부에서 escape 처리된 것만 전달
    return n;
  }

  function relBadge(item) {
    var r = relLabel(item);
    return el("span", "rel " + r.kind, esc(r.text));
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

    if (item.summary) {
      head.appendChild(el("div", "card-summary", inlineFormat(esc(item.summary))));
    } else if (!hasBody && !hasPeople) {
      head.appendChild(el("div", "card-summary muted", "확인 필요"));
    }

    if (hasPeople) {
      var pe = el("div", "people");
      item.people.forEach(function (name) {
        pe.appendChild(el("span", "chip", esc(name)));
      });
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

  // ── 섹션 생성 ─────────────────────────────────────────────
  function sectionEl(titleHtml, countText) {
    var sec = el("section", "section");
    var h = el("h2", null, titleHtml);
    if (countText != null) h.appendChild(el("span", "count", esc(countText)));
    sec.appendChild(h);
    return sec;
  }

  // ── 주일 광고 ─────────────────────────────────────────────
  function buildGwanggo(g) {
    var sec = sectionEl("📋 이번 주 광고");
    var card = el("div", "card gwanggo open");
    var body = el("div", "card-body");
    body.style.borderTop = "none";
    body.style.display = "block";

    if (g.date) {
      body.appendChild(el("div", "card-date", esc(fmtDate(ymdToMs(g.date)) + " 주일")));
    }

    function group(label, arr) {
      if (!arr || !arr.length) return;
      var grp = el("div", "grp");
      grp.appendChild(el("div", "grp-label", esc(label)));
      var ol = document.createElement("ol");
      arr.forEach(function (line) {
        ol.appendChild(el("li", null, esc(line)));
      });
      grp.appendChild(ol);
      body.appendChild(grp);
    }
    group("[공통]", g.common);
    group("[윈투]", g.win2);

    if (g.slidesUrl && g.slidesUrl.trim()) {
      var a = el("a", "slide-link", "📑 슬라이드 보기");
      a.href = g.slidesUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      body.appendChild(a);
    }

    card.appendChild(body);
    sec.appendChild(card);
    return sec;
  }

  // ── 타임라인 ──────────────────────────────────────────────
  function buildTimeline(upcoming) {
    var sec = sectionEl("🗓️ 다가오는 일정", String(upcoming.length));
    if (!upcoming.length) {
      sec.appendChild(el("p", "muted", "예정된 일정이 없습니다."));
      return sec;
    }
    var ul = el("ul", "timeline");
    upcoming.forEach(function (item) {
      var li = document.createElement("li");
      var btn = el("button");
      btn.type = "button";
      btn.appendChild(el("span", "tl-date", esc(fmtDate(ymdToMs(item.start)))));
      btn.appendChild(el("span", "tl-title", inlineFormat(esc(item.title || "확인 필요"))));
      btn.appendChild(relBadge(item));
      btn.addEventListener("click", function () { scrollToCard(item.id); });
      li.appendChild(btn);
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    return sec;
  }

  function scrollToCard(id) {
    var card = document.getElementById("card-" + id);
    if (!card) return;
    // 지난 공지 안에 있으면 먼저 펼친다
    var pastSec = card.closest(".section.past");
    if (pastSec && !pastSec.classList.contains("open")) {
      pastSec.classList.add("open");
    }
    if (card.classList.contains("no-body")) {
      // 본문 없는 카드는 펼칠 게 없음
    } else if (!card.classList.contains("open")) {
      var head = card.querySelector(".card-head");
      if (head) head.click();
    }
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    card.classList.remove("flash");
    void card.offsetWidth;        // reflow → 애니메이션 재시작
    card.classList.add("flash");
  }

  // ── 일반 아이템 섹션 ──────────────────────────────────────
  function buildItemSection(titleHtml, items) {
    var sec = sectionEl(titleHtml, String(items.length));
    items.forEach(function (item) { sec.appendChild(buildCard(item)); });
    return sec;
  }

  // ── 지난 공지 (접힘) ──────────────────────────────────────
  function buildPastSection(items) {
    var sec = el("section", "section past");
    var toggle = el("button", "past-toggle");
    toggle.type = "button";
    toggle.innerHTML =
      '<span>🗄️ 지난 공지 <span class="count">' + esc(String(items.length)) + "</span></span>" +
      '<span class="chev">▾</span>';
    var list = el("div", "past-list");
    items.forEach(function (item) { list.appendChild(buildCard(item)); });
    toggle.addEventListener("click", function () { sec.classList.toggle("open"); });
    sec.appendChild(toggle);
    sec.appendChild(list);
    return sec;
  }

  // ── 정렬 헬퍼 ─────────────────────────────────────────────
  function byStartAsc(a, b) { return ymdToMs(a.start) - ymdToMs(b.start); }
  function byEndDesc(a, b) {
    return ymdToMs(b.end || b.start) - ymdToMs(a.end || a.start);
  }

  // ── 메인 렌더 ─────────────────────────────────────────────
  function render() {
    var app = document.getElementById("app");
    app.innerHTML = "";

    // 헤더
    var header = el("header", "site-header");
    header.appendChild(el("h1", null, "WIN2 공지 허브"));
    var upd = DATA.updated
      ? "마지막 업데이트: " + esc(DATA.updated)
      : '<span class="muted">마지막 업데이트: 확인 필요</span>';
    header.appendChild(el("div", "updated", upd));
    app.appendChild(header);

    var items = (DATA.items || []).slice();
    var past = items.filter(isPast).sort(byEndDesc);
    var live = items.filter(function (it) { return !isPast(it); });

    // 1) 다가오는 일정 (모든 live 아이템)
    var upcoming = live.slice().sort(byStartAsc);
    app.appendChild(buildTimeline(upcoming));

    // 2) 이번 주 광고
    if (DATA.gwanggo) app.appendChild(buildGwanggo(DATA.gwanggo));

    // 3) 공지·리마인더 (있을 때만)
    var notices = live.filter(function (it) {
      return it.category === "notice" || it.category === "reminder";
    }).sort(byStartAsc);
    if (notices.length) {
      app.appendChild(buildItemSection("📢 공지·리마인더", notices));
    }

    // 4) 리더십
    var leadership = live.filter(function (it) { return it.category === "leadership"; })
      .sort(byStartAsc);
    if (leadership.length) {
      app.appendChild(buildItemSection("👥 리더십", leadership));
    }

    // 5) 아웃팅·모임
    var outings = live.filter(function (it) { return it.category === "outing"; })
      .sort(byStartAsc);
    if (outings.length) {
      app.appendChild(buildItemSection("🧺 아웃팅·모임", outings));
    }

    // 6) 지난 공지 (접힘)
    if (past.length) app.appendChild(buildPastSection(past));

    // 푸터
    var footer = el("footer", "site-footer");
    footer.appendChild(el("div", null, "WIN2 공지 허브 · 온누리 IN2 New York"));
    app.appendChild(footer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
