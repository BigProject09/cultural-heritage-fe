# FE 신규 참여자 인수인계 가이드

## 먼저 이해할 구조

이 프로젝트는 페이지 순서대로 한 번만 진행하는 구조가 아닙니다. 하나의
유물 `artifactId` 아래에 `복원 가이드`, `X-RAY 사진 분석`, `육안 조사` 세 기능이
독립적으로 연결됩니다.

- 세 기능은 어느 것부터 시작해도 됩니다.
- 기능별 상태는 서로 덮어쓰지 않습니다.
- 세 기능이 모두 `DONE`일 때만 최종 통합 보고서를 만들 수 있습니다.
- 새 URL은 항상 `/artifacts/:artifactId/...` 형태를 사용합니다.

현재 유물 정보와 기능 상태는 로컬 테스트를 위해 `localStorage`, 대표
이미지는 `IndexedDB`에 저장합니다. 실제 API 모드가 완성되면 Spring 유물
API와 S3로 전환할 예정입니다.

## 지금까지 구현된 사용자 흐름

1. 홈에서 세 기능 중 시작할 기능을 선택합니다.
2. 기존 유물을 선택하거나 신규 유물을 등록합니다.
3. 신규 등록 시 공통 유물 정보와 대표 컬러 이미지를 저장합니다.
4. 유물 워크스페이스에서 기능별 `미시작/진행 중/완료` 상태를 확인합니다.
5. 각 기능을 독립적으로 실행합니다.
6. 세 기능 완료 후 최종 보고서 화면이 열립니다.

복원 가이드는 `Flow 선택 → 해체 → 세척 → 강화 → 접합 → 복원` 구조이며
Spring의 task start/resume API와 연결되어 있습니다. X-RAY는 `조각 등록 →
결합 → 배치 보정 → 결함 탐지 → 정상 후보 제외 → 문안 작성 → 최종 검토`
흐름까지 구현되어 있습니다.

육안 조사는 현재 예시 결과를 표시하고 완료 상태만 바꾸는 단계라 실제 기능
구현이 필요합니다.

## 맡아주길 바라는 1차 작업

`육안 조사 모듈 고도화`를 독립 작업으로 맡습니다.

대상 파일:

```text
src/pages/PreInvestigation/VisualPage.jsx
src/pages/PreInvestigation/VisualPage.css
src/services/visualInspectionApi.js       # 신규 생성 가능
src/services/visualInspectionMock.js      # 신규 생성 가능
```

필요 기능:

1. 현재 유물의 대표 컬러 이미지를 불러와 표시합니다.
2. 손상 항목을 추가·수정·삭제할 수 있게 합니다.
3. 항목에는 최소한 아래 필드를 둡니다.
   - 손상 유형
   - 심각도
   - 위치 또는 영역
   - 전문가 소견
   - `AI 후보`와 `사용자 확정` 구분
4. 작업 중 임시 저장이 가능해야 합니다.
5. 같은 `artifactId`로 다시 열었을 때 저장 결과를 복구합니다.
6. 사용자가 최종 확인한 뒤에만 `VISUAL` 상태를 `DONE`으로 바꿉니다.
7. API가 준비되지 않았을 때도 mock 모드로 전체 흐름을 확인할 수 있게
   service 계층을 분리합니다.

실제 백엔드 API 형식이 아직 확정되지 않았다면, 화면 컴포넌트에서
`localStorage`나 `fetch`를 직접 호출하지 말고 `visualInspectionApi.js`를
거치도록 만듭니다. 나중에 구현체만 교체하기 위함입니다.

## 작업 완료 기준

- `/artifacts/:artifactId/visual`로 직접 접속해도 정상 동작
- 새로고침 후 유물 정보와 임시 저장 결과 복구
- 유물 A와 유물 B의 조사 결과가 섞이지 않음
- 항목 0건, 로딩, 저장 중, 저장 실패, 재시도 상태 제공
- 최종 확정 전에는 프로젝트 상태를 `DONE`으로 바꾸지 않음
- 완료 후 `/artifacts/:artifactId`로 복귀
- 기존 `GUIDE`, `XRAY` 흐름에 회귀 오류 없음
- 다음 명령 모두 통과

```bash
npm run lint
npm run build
npm run build -- --mode mock
```

## 수정 충돌 방지 규칙

첫 작업에서는 아래 공용 파일을 직접 수정하지 않습니다.

```text
src/App.jsx
src/data/workspaceProjects.js
src/context/DisassemblyContext.jsx
src/services/xrayApi.js
src/utils/flowNavigation.js
src/index.css의 기존 토큰명
```

공용 수정이 꼭 필요하면 먼저 필요한 변경과 함수 입력·출력 형태를 공유합니다.
공용 변경과 육안 조사 화면 변경은 커밋을 분리합니다.

라우트는 이미 등록돼 있으므로 `App.jsx`에 새 라우트를 추가할 필요가
없습니다. 공통 유물 정보는 URL의 `artifactId`로 조회하며, 다른 유물의
결과가 섞이지 않도록 저장 키에도 `artifactId`를 포함합니다.

## 실행 모드

백엔드 없이 UI를 확인할 때:

```bash
npm ci
npm run dev:mock
```

실제 API를 확인할 때:

```bash
cp .env.example .env
npm run dev
```

실제 연동 구조는 `React → Spring 8080 → FastAPI 8001`입니다. 브라우저에서
FastAPI `8001`을 직접 호출하는 코드가 새로 생기지 않도록 합니다.

## 권장 브랜치와 커밋

```bash
git switch main
git pull origin main
git switch -c feature/visual-inspection
```

커밋은 검토 가능한 단위로 나눕니다.

```text
feat: add visual inspection form and image viewer
feat: add visual inspection mock persistence
fix: handle visual inspection empty and error states
```

작업 중 `main` 반영이 필요하면 기능 브랜치에서 `main`을 받아 충돌을 해결한
후 lint와 build를 다시 실행합니다. PR에는 구현 화면, 테스트 순서, 미구현 API
항목을 함께 적습니다.

## 현재 건드리면 안 되는 오해 포인트

- `GUIDE`, `XRAY`, `VISUAL`은 순차 단계가 아니라 독립 기능입니다.
- X-RAY의 AI 탐지 결과는 확정값이 아니라 후보입니다.
- X-RAY 후보는 모두 이상으로 시작하고 정상으로 확인된 후보만 제외합니다.
- 결합 결과와 탐지 결과는 전문가 확인 없이 자동 완료 처리하지 않습니다.
- 최종 보고서는 복원 가이드 내부 단계가 아니라 세 기능을 합치는 별도 화면입니다.
- `VITE_VIA_SPRING=true`가 기본이며 React가 FastAPI를 직접 호출하지 않습니다.

## 1차 작업 이후 후보

1. 육안 조사 결과 API 연결
2. 최종 보고서에 GUIDE/XRAY/VISUAL 실제 결과 표시
3. 공통 로딩·오류·빈 상태와 모바일/태블릿 반응형 QA
4. 접근성 점검 및 키보드 이동 보완
