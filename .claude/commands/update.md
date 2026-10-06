---
description: 이번 주 공지 업데이트 — UPDATING.md 플레이북대로 사이트 갱신 (푸시 전 확인)
---

Austin이 이번 주 WIN2 공지 허브를 업데이트하려고 `/update`를 실행했습니다.
아래에 붙여넣은 내용이 이번 주 입력입니다 (Google Drive 폴더 링크 + 새 일정 /
카카오톡 메시지 등):

$ARGUMENTS

위 입력(그리고 이 메시지의 나머지 내용)을 "이번 주 업데이트 자료"로 보고,
저장소의 **`UPDATING.md` 플레이북**을 그대로 따라 실행하세요. UPDATING.md가
유일한 진실의 출처입니다 — 단계는 거기서 확인하고, 여기서 다시 적지 마세요.

실행 순서:
1. Google Drive 폴더 링크가 있으면 슬라이드를 내려받아 `tools/compress_images.py`로
   `images/` + `images/thumbs/`에 압축 저장하고, `data.js`의 `photos[]`를 새로
   생성합니다. (이미지 바이트는 직접 HTTP 다운로드로 처리 — MCP base64 다운로드 금지.
   폴더는 "링크가 있는 모든 사용자 - 뷰어" 공유여야 합니다.)
2. `data.js`의 `gwanggo.date`와 최상위 `updated`를 이번 주 날짜로 올립니다.
3. 새 일정을 `data.js`의 `items[]`에 추가합니다 (id/category/title/start/end/
   summary/people/done/body).
4. **아카이브 스윕 규칙**을 실행합니다: `data.js` 전체를 다시 훑어 `end`가 지난
   항목이 보관함으로 내려갔는지 확인(잘못/누락된 날짜 수정), 날짜 없이 명백히
   끝난 공지는 `done:true` 표시, 애매한 건 삭제하지 말고 Austin에게 먼저 물어봅니다.
5. `index.html`의 `?v=N` 캐시 버전 숫자를 올립니다.
6. **푸시 전에 멈춥니다.** 바뀐 내용을 요약해서 보여주세요 — 새 슬라이드, 새/수정
   일정, 보관함으로 이동한 항목, 날짜 변경. Austin의 OK를 받은 다음에만
   `git add . && git commit && git push` 합니다 (배포 후 1~2분 내 반영).

반드시 지킬 규칙:
- 콘텐츠는 **오직 `data.js`**에서만 수정합니다. HTML/CSS/app.js는 건드리지 않습니다.
- **`data.local.js`는 절대 건드리거나 커밋하지 않습니다.** 기도(prayer) 데이터를
  `data.js`로 옮기지 않습니다 — 민감 정보라 로컬 전용입니다.
- 입력이 비어 있거나 Drive 링크/일정이 안 보이면, 무엇을 붙여넣어야 하는지
  Austin에게 되물으세요.
