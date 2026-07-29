# cultural-heritage-fe

문화재 보존처리 관리 시스템 프론트엔드. React + Vite.

## 실행

    cd frontend
    npm install
    npm run dev

http://localhost:5173

## .env

저장소에 포함하지 않는다. `frontend/.env` 를 만든다.

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

## 구조

    src/
    ├── components/
    │   ├── common/      여러 페이지 공용
    │   └── xray/        X-RAY 전용
    ├── context/
    ├── pages/
    └── services/        API 호출

## 기술 스택

| 항목                | 버전        |
| ------------------- | ----------- |
| React               | 19.2        |
| Vite                | 8.1         |
| react-router-dom    | 7.18        |
| konva / react-konva | 10.3 / 19.2 |
| axios               | 1.18        |
