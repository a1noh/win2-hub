# WIN2 공지 허브

온누리 IN2 New York · WIN2 공동체의 공지·일정을 **한 링크**에서 보는 view-only 사이트.
편집은 Austin(선교 MC) 혼자, 나머지는 읽기 전용.

**라이브 주소:** https://a1noh.github.io/win2-hub/

프레임워크·빌드·백엔드 없음. 순수 정적 사이트 (`index.html`, `styles.css`, `app.js`, `data.js`).
**내용은 전부 `data.js` 에만 있습니다. HTML/CSS/JS 는 건드릴 필요가 없습니다.**

---

## 매주 하는 일 (요약)

1. `data.js` 를 연다.
2. 맨 위 `updated` 날짜를 오늘로 바꾼다.
3. 이번 주 광고(`gwanggo`)와 일정(`items`)을 고친다. (아래 예시 참고)
4. 저장하고 push → 1~2분 뒤 사이트 반영.

```bash
git add .
git commit -m "공지 업데이트 10/11"
git push
```

끝난 일정은 지울 필요 없습니다. 날짜가 지나면 **자동으로 "지난 공지"** 로 내려갑니다.

---

## 1. 일정 한 개 추가/수정하기

`data.js` 의 `items: [ ... ]` 안에 블록을 **복사해서** 붙여넣고 값만 바꾸세요.

```js
{
  id: "mt-2026-11",                 // 겹치지 않는 영문 아이디
  category: "leadership",           // leadership | outing | notice | reminder
  title: "리더십 MT 2차",
  start: "2026-11-14",              // 시작일 (필수, YYYY-MM-DD)
  end: "2026-11-16",                // 종료일 (하루 일정이면 start 와 같게)
  summary: "한 줄 요약",
  people: ["재환", "세민"],          // 이름 칩, 없으면 []
  done: false,                      // true 로 하면 바로 "지난 공지" 로
  body: "## 소제목\n- 항목\n**굵게** 와 @이름 멘션 가능"
}
```

- **category** 에 따라 들어가는 섹션:
  `leadership` → 리더십 · `outing` → 아웃팅·모임 · `notice`/`reminder` → 공지·리마인더.
- 블록 사이에는 **쉼표(`,`)** 를 꼭 넣으세요. 마지막 블록 뒤에는 쉼표 없어도 됩니다.
- 날짜·이름·링크를 **지어내지 마세요.** 모르는 값은 비워두면 사이트에 `확인 필요` 로 표시됩니다.

### 이미 끝난 공지를 자료로 남기고 싶을 때
`done: true` 로 두면 날짜와 상관없이 바로 "지난 공지"로 내려가고, 본문은 그대로
보관됩니다. (예: 성찬 플로우를 다음에 재사용)

### 본문(body) 작성법 — markdown-lite
`\n` 은 줄바꿈입니다. 아래 기호만 쓰면 됩니다.

| 쓰기 | 결과 |
|------|------|
| `## 글자` | 소제목 |
| `- 글자` 또는 `* 글자` | • 글머리 목록 |
| `1. 글자` | 번호 목록 |
| `**글자**` | **굵게** |
| `@이름` | 강조 칩 (예: `@효준`) |
| 빈 줄 | 문단 나누기 |

---

## 2. 이번 주 광고(주일 광고) 교체하기

`data.js` 의 `gwanggo` 블록을 통째로 바꾸면 됩니다. 번호·띄어쓰기·이모지는
받은 그대로 적으세요.

```js
gwanggo: {
  date: "2026-10-11",        // 해당 주일 날짜
  slidesUrl: "",             // 구글 슬라이드 링크 생기면 여기에 ("" 면 버튼 안 보임)
  common: [                  // [공통]
    "0-0. Welcome",
    "1-1. 큐티책"
  ],
  win2: [                    // [윈투]
    "2-0. ON:IT",
    "2-1. 홀스"
  ]
},
```

---

## 3. 배포 (최초 1회 세팅)

GitHub 계정 `a1noh`, 저장소 이름 `win2-hub` 기준입니다.

### 방법 A — GitHub CLI(`gh`) 가 있을 때 (가장 간단)

```bash
cd C:/Users/17654/Documents/win2-lead-dashboard
git init
git add .
git commit -m "WIN2 공지 허브 v1"
git branch -M main

# 저장소 생성 + 푸시 한 번에
gh repo create a1noh/win2-hub --public --source=. --remote=origin --push

# GitHub Pages 켜기 (main 브랜치 / 루트)
gh api -X POST repos/a1noh/win2-hub/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

`gh api` 줄이 안 되면: GitHub 저장소 → **Settings → Pages → Branch: `main` / `(root)` → Save**.

### 방법 B — `gh` 없이 (브라우저로 저장소 만들기)

1. https://github.com/new 에서 저장소 이름 `win2-hub`, **Public** 으로 생성 (README 추가 체크 해제).
2. 터미널에서:
   ```bash
   cd C:/Users/17654/Documents/win2-lead-dashboard
   git init
   git add .
   git commit -m "WIN2 공지 허브 v1"
   git branch -M main
   git remote add origin https://github.com/a1noh/win2-hub.git
   git push -u origin main
   ```
3. 저장소 → **Settings → Pages → Branch: `main` / `(root)` → Save**.

몇 분 뒤 **https://a1noh.github.io/win2-hub/** 에서 열립니다.

### 이후 업데이트
```bash
git add .
git commit -m "공지 업데이트"
git push
```

---

## 설계 메모

- **시간대**: America/New_York. "오늘"은 페이지를 열 때 자동 계산됩니다.
- **상대 라벨**: `오늘` · `내일` · `D-6` · `진행 중` · `지남`.
- **검색 비노출**: `<meta name="robots" content="noindex, nofollow">` 적용.
  비밀은 아니지만 멤버 이름이 있어 검색엔진에는 안 뜨게 했습니다. 링크를 아는 사람은 볼 수 있습니다.
- **외부 호출**: 폰트(Pretendard CDN) 하나뿐. 애널리틱스·쿠키 없음.
- **공지·리마인더 섹션**은 해당하는 다가오는 항목이 있을 때만 보입니다 (없으면 숨김).
- 로컬에서 확인하려면 `index.html` 을 브라우저로 그냥 열면 됩니다 (`file://` 로도 동작).
