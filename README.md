# cultural-heritage-fe

문화재 보존처리 관리 시스템 프론트엔드. React + Vite.

## 실행

    npm install
    npm run dev

http://localhost:5174

## .env

저장소에 포함하지 않는다. `.env` 를 만든다.

    VITE_API_BASE_URL=http://localhost:8080
    VITE_ARTIFACTS_API_PATH=/api/artifacts
    VITE_USE_XRAY_MOCK=false

값이 없으면 실제 API 를 호출한다. 백엔드 없이 화면만 확인할 때는
`true` 로 두면 가짜 응답으로 동작한다.

API 주소는 `/api` 를 기본으로 쓰고 `vite.config.js` 의 프록시가
8080 으로 넘긴다. 주소를 바꿔야 하면 `VITE_API_BASE_URL` 을
지정한다.

> Vite 는 `.env` 를 시작할 때만 읽는다. 값을 바꾸면 개발 서버를
> 다시 시작해야 한다.

## 백엔드

X-RAY 기능은 백엔드 컨테이너가 모두 떠 있어야 동작한다.
결합과 결함 탐지 모두 Spring(8080) 을 거친다.

    cd ../cultural-heritage-be
    docker compose up --build -d

유물 프로젝트 목록·등록·기능 상태는 샘플 데이터가 아니라 Spring API를
사용한다. 필요한 엔드포인트와 요청·응답 형식은
[`docs/workspace-api-contract.md`](docs/workspace-api-contract.md)에 정리되어
있다.

## 구조

    src/
    ├── components/
    │   ├── common/      여러 페이지 공용
    │   └── xray/        X-RAY 전용
    ├── context/
    ├── pages/
    └── services/        API 호출

## 스타일링

Tailwind CSS 4와 공식 Vite 플러그인을 사용한다. 새 UI는 JSX의 Tailwind
유틸리티 클래스로 작성한다.

```jsx
<button
  type="button"
  className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
>
  저장
</button>
```

기존 화면의 복합 선택자와 상태 스타일은 각 컴포넌트 CSS 파일에 유지하되,
일반 CSS 선언 대신 `@apply`로 Tailwind 유틸리티를 조합한다. 각 스타일
파일의 `@reference "tailwindcss";`는 `@apply`가 Tailwind 테마를 참조하기
위해 필요하므로 삭제하지 않는다. 전역 Tailwind 진입점은 `src/index.css`다.

```css
@reference "tailwindcss";

@layer components {
  .heritage-card {
    @apply flex flex-col rounded-xl border border-stone-200 bg-white p-6;
  }

  .heritage-card-action {
    @apply mt-auto pt-4 text-sm font-semibold text-amber-800;
  }
}
```

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
