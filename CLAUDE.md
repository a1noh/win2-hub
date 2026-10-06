# WIN2 공지 허브 — Claude 작업 규칙

보기 전용(view-only) 정적 공지 사이트. Austin(선교 MC)만 수정하고 나머지는 읽기만 함.
Live: https://a1noh.github.io/win2-hub/ · Repo: `a1noh/win2-hub` (GitHub Pages, main/root)

## 황금 규칙
- 콘텐츠는 **오직 `data.js`**(`window.HUB_DATA`)에서만 수정한다. `index.html` /
  `styles.css` / `app.js`는 콘텐츠 업데이트 때 건드리지 않는다.
- **`data.local.js`는 절대 건드리거나 `git add` 하지 않는다.** 여기엔 민감한 기도
  요청(prayer)이 들어 있고 `.gitignore` 처리돼 있다. 기도 데이터를 `data.js`로
  옮기지 않는다.

## 주간 업데이트 신호 (자동 인식)
Austin이 **Google Drive 폴더 링크 + 새 일정/카카오톡 메시지**를 붙여넣으면 —
`/update`를 직접 치지 않았더라도 — 이번 주 공지 업데이트 요청으로 인식한다.
"이번 주 업데이트로 보고 플레이북대로 진행할게요"라고 말하고, `/update` 명령과
동일한 흐름을 따른다. (명령 정의: `.claude/commands/update.md`)

전체 절차는 **`UPDATING.md`**가 유일한 출처다. 핵심:
1. 슬라이드 다운로드+압축(`tools/compress_images.py`) → `data.js` `photos[]` 재생성
2. `gwanggo.date` + 최상위 `updated` 날짜 올리기
3. 새 일정을 `items[]`에 추가
4. **아카이브 스윕**: `data.js` 전체 재점검 — 지난 항목 보관함 확인, 끝난 무날짜
   항목 `done:true`, 애매하면 삭제 말고 Austin에게 질문
5. `index.html`의 `?v=N` 캐시 버전 올리기

## 푸시 규칙
항상 바뀐 내용을 **먼저 요약해서 보여주고 Austin의 OK를 받은 뒤**에만
`git add . && git commit && git push` 한다 (공개 사이트라 검토 후 배포). 배포 1~2분 내 반영.

## 날짜/시간
날짜 표시는 이미 동적이다 — `app.js`가 매 로드 시 America/New_York 기준 현재 날짜로
D-day 배지(오늘/내일/D-N/진행 중/지남), 메인↔보관함 자동 분류, 정렬을 계산한다.
`data.js`의 `start`/`end`는 날짜 문자열(사실)이라 정적인 게 맞다.
