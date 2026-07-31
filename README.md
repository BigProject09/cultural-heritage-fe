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

기존 화면의 복합 선택자와 상태 스타일은 각 컴포넌트 CSS 파일에 유지하되,
일반 CSS 선언 대신 `@apply`로 Tailwind 유틸리티를 조합한다. 각 스타일
파일의 `@reference "tailwindcss";`는 `@apply`가 Tailwind 테마를 참조하기
위해 필요하므로 삭제하지 않는다. 전역 Tailwind 진입점은 `src/index.css`다.

## 기술 스택

| 항목                | 버전        |
| ------------------- | ----------- |
| React               | 19.2        |
| Vite                | 8.1         |
| Tailwind CSS        | 4.3         |
| react-router-dom    | 7.18        |
| konva / react-konva | 10.3 / 19.2 |
| axios               | 1.18        |
