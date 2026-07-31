# cultural-heritage-fe

문화재 보존처리 관리 시스템 프론트엔드. React + Vite.

## 실행

    npm install
    npm run dev

http://localhost:5174

## 환경 설정과 실행 모드

### 실제 백엔드 연동

저장소의 `.env.example`을 복사해 `.env`를 만든다. `.env`는 Git에
포함하지 않는다.

```bash
cp .env.example .env
npm run dev
```

기본 `.env.example` 설정에서는 다음과 같이 호출한다.

- X-RAY 조각 결합: Spring `http://localhost:8080/api/xray/stitch`
- X-RAY 결함 분석·문안 생성: FastAPI `http://localhost:8001`
- 복원 가이드: Vite 프록시를 통해 Spring의 `/tasks` API
- 유물 목록·상태: 브라우저 로컬 저장소

결함 분석도 Spring을 통하도록 바꾸려면 `.env`의
`VITE_VIA_SPRING=true`를 사용한다.

### 백엔드 없는 mock 테스트

저장소에 포함된 `.env.mock`은 다음 값을 사용한다.

```env
VITE_ARTIFACT_STORAGE_MODE=local
VITE_USE_XRAY_MOCK=true
VITE_USE_GUIDE_MOCK=true
```

실행:

```bash
npm install
npm run dev:mock
```

`npm run dev:mock`은 내부적으로 `vite --mode mock`을 실행한다. Vite가
공통 `.env`를 읽은 뒤 `.env.mock`의 같은 항목을 우선 적용하므로,
`.env`의 API 주소를 `.env.mock`에 반복해서 작성할 필요가 없다.

| 실행 명령          | X-RAY    | 복원 가이드 | Spring·FastAPI |
| ------------------ | -------- | ----------- | -------------- |
| `npm run dev`      | 실제 API | 실제 API    | 필요           |
| `npm run dev:mock` | mock     | mock        | 불필요         |

mock 모드에서는 X-RAY 결합·결함 분석, 복원 가이드 시작·단계 진행,
강화 습윤 분석, 접합 전후 사진 분석, 사진 업로드가 브라우저의 mock
데이터로 처리된다. 실제 `/tasks` 및 사진 업로드 API를 호출하지 않는다.

`VITE_ARTIFACT_STORAGE_MODE=local`은 유물 목록·상태는 `localStorage`,
대표 이미지 Blob은 `IndexedDB`에 저장한다. 기존 Base64 이미지는 첫
조회 시 자동으로 IndexedDB로 이전된다. 이 데이터는 현재 브라우저에만
남으며 사이트 데이터 삭제 시 사라진다. Spring의 유물 API가 준비되면
`api`로 바꾼다.

> Vite는 환경파일을 시작할 때만 읽는다. 값을 바꾼 뒤에는 개발 서버를
> 완전히 종료하고 다시 실행한다. `VITE_`로 시작하는 값은 클라이언트
> 번들에 노출되므로 API 키나 비밀번호를 넣지 않는다.

## 백엔드

실제 API 모드의 X-RAY 기능은 Spring과 FastAPI 컨테이너가 모두 떠
있어야 동작한다. 기본 설정에서는 결합은 Spring을 거치고 결함 분석은
FastAPI를 직접 호출한다.

    cd ../cultural-heritage-be
    docker compose up --build -d

유물 프로젝트 목록·등록·기능 상태는 현재 `local` 모드로 테스트한다.
Spring 구현이 완료되면 `api` 모드로 전환한다. 필요한 엔드포인트와
요청·응답 형식은
[`docs/workspace-api-contract.md`](docs/workspace-api-contract.md)에 정리되어
있다.

## 구조

    src/
    ├── components/
    │   ├── common/      여러 페이지 공용
    │   ├── routing/     artifactId 라우트 동기화·구 URL 이동
    │   ├── workspace/   유물 워크스페이스 공통 UI
    │   └── xray/        X-RAY 전용
    ├── context/
    ├── data/            유물 상태·화면용 데이터
    ├── pages/
    ├── services/        API 호출
    └── utils/           라우트·공정 이동·보고서 유틸리티

## 스타일링

Tailwind CSS 4와 공식 Vite 플러그인을 사용한다. `tailwind.config.js`
대신 `src/index.css`의 `@theme`에서 프로젝트 토큰을 관리한다. 새 UI는
JSX의 Tailwind 유틸리티 클래스로 작성한다.

```jsx
<button
  type="button"
  className="rounded-lg bg-vora-bronze px-4 py-2 text-sm font-semibold text-white"
>
  저장
</button>
```

기존 화면의 복합 선택자와 상태 스타일은 각 컴포넌트 CSS 파일에 유지하되,
일반 CSS 선언 대신 `@apply`로 Tailwind 유틸리티를 조합한다. 각 스타일
파일의 `@reference "../../index.css";`는 `@apply`가 기본 유틸리티와
프로젝트 `@theme` 토큰을 함께 참조하기 위해 필요하다. 파일 위치에 따라
상대 경로의 `../` 개수만 달라진다.

```css
@reference "../../index.css";

@layer components {
  .heritage-card {
    @apply flex flex-col rounded-xl border border-vora-line bg-vora-surface p-6;
  }

  .heritage-card-action {
    @apply mt-auto pt-4 text-sm font-semibold text-vora-bronze-dark;
  }
}
```

현재 공통 토큰은 두 묶음이다.

- `vora-*`: 홈·유물 워크스페이스·최종 통합 보고서
- `guide-*`: 해체·세척·강화·접합·복원 가이드

반복 색상을 페이지 CSS에 HEX 값으로 추가하지 말고, 여러 화면에서
재사용할 값이라면 먼저 `src/index.css`의 `@theme`에 정의한다.

클래스명은 Tailwind가 소스에서 정적으로 찾을 수 있도록 완성된 문자열로
작성한다.

```jsx
// 권장
const colorClasses = {
  success: "bg-emerald-600 text-white",
  warning: "bg-amber-500 text-stone-950",
};

<span className={colorClasses[status]} />

// 사용하지 않음
<span className={`bg-${color}-600`} />
```

VS Code에서 `Unknown at rule @apply` 또는 `@reference` 경고가 표시되면
Tailwind CSS IntelliSense 확장 프로그램을 설치한다. 해당 경고는 에디터의
기본 CSS 검사기가 Tailwind 지시어를 인식하지 못해 표시하는 것으로,
`npm run build`가 성공한다면 빌드 오류는 아니다.

## 기술 스택

| 항목                | 버전        |
| ------------------- | ----------- |
| React               | 19.2        |
| Vite                | 8.1         |
| Tailwind CSS        | 4.3         |
| react-router-dom    | 7.18        |
| konva / react-konva | 10.3 / 19.2 |
| axios               | 1.18        |
