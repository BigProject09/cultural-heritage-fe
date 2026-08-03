# 로컬 테스트 모드와 기존 API 연동 현황

## 1. 현재 권장 실행 모드

AWS, S3, 유물 CRUD API가 아직 연결되지 않은 현재 개발 단계에서는 다음
설정을 사용한다.

```env
VITE_ARTIFACT_STORAGE_MODE=local
VITE_API_BASE_URL=http://localhost:8080
VITE_ARTIFACTS_API_PATH=/api/artifacts
VITE_USE_XRAY_MOCK=false
VITE_USE_GUIDE_MOCK=false
VITE_XRAY_STITCH_API_BASE=http://localhost:8080/api/xray/stitch
VITE_XRAY_INSPECTION_API_BASE=http://localhost:8001
VITE_VIA_SPRING=true
VITE_XRAY_SPRING_INSPECTION_API_BASE=http://localhost:8080/api/xray
```

`.env.example`을 `.env`로 복사하면 같은 설정을 사용할 수 있다.

```bash
cp .env.example .env
```

환경변수를 수정한 뒤에는 실행 중인 Vite 서버를 종료하고 `npm run dev`로
다시 시작해야 한다.

Spring과 FastAPI를 호출하지 않고 전체 UI 흐름을 확인할 때는 다음 명령을
사용한다.

```bash
npm run dev:mock
```

`.env.mock`이 X-RAY와 복원 가이드 mock을 모두 활성화한다. 해체·세척·강화·
접합·복원 안내와 강화 습윤 분석, 접합 임시접합 분석까지 화면에서 진행할 수
있다.

## 2. 유물 프로젝트 저장 방식

### `VITE_ARTIFACT_STORAGE_MODE=local`

- `/api/artifacts`를 호출하지 않는다.
- 신규 ID는 `artifact-{timestamp}` 형식으로 브라우저가 임시 발급한다.
- 유물 목록, 상세 정보, GUIDE/XRAY/VISUAL 상태를 `localStorage`에 저장한다.
- 대표 이미지는 브라우저 저장용 JPEG 미리보기로 축소해 저장한다.
- 기존 샘플 유물을 자동으로 만들지 않는다.
- 데이터는 같은 브라우저와 같은 사이트 주소에서만 유지된다.

이 모드에서도 복원 가이드, X-RAY 결합, X-RAY 결함 분석 등 기존 API는
실제 서버를 호출한다.

### `VITE_ARTIFACT_STORAGE_MODE=api`

`docs/workspace-api-contract.md`의 `/api/artifacts`와 Presigned URL API를
호출한다. Spring에 해당 API가 구현되고 S3가 연결된 뒤 사용한다.

## 3. 프론트에서 현재 호출하는 기존 API

| 기능 | 호출 대상 | 프론트 요청 | 현재 용도 |
| --- | --- | --- | --- |
| 복원 가이드 시작 | Spring `8080` | `POST /tasks/{taskId}/start` | 선택한 복원 Flow로 작업 시작 |
| 복원 단계 진행 | Spring `8080` | `POST /tasks/{taskId}/resume` | 해체·세척·강화·접합·복원 단계 응답 전달 |
| 공정 사진 업로드 | Spring `8080` | `POST /photos/upload` | 강화 습윤·접합 임시검증 사진 URL 발급 |
| X-RAY 결합 접수 | Spring `8080` | `POST /api/xray/stitch/jobs` | 컬러 이미지와 X-RAY 조각 업로드 |
| X-RAY 결합 상태 | Spring `8080` | `GET /api/xray/stitch/jobs/{jobId}` | `PENDING/RUNNING/COMPLETED/FAILED` 확인 |
| X-RAY 결합 결과 | Spring `8080` | `GET /api/xray/stitch/jobs/{jobId}/result` | 결합 이미지 다운로드 |
| X-RAY 배치 정보 | Spring `8080` | `GET /api/xray/stitch/jobs/{jobId}/layout` | 수동 보정용 조각 배치 조회 |
| AI 상태 확인 | Spring `8080` | `GET /api/xray/health` | 모델·LLM 상태 확인 |
| 결합본 결함 분석 | Spring `8080` | `POST /api/xray/detect/assembled` | 결합 이미지 후보 탐지 |
| 조각 결함 분석 | Spring `8080` | `POST /api/xray/detect/fragments` | 한 장 또는 여러 조각 후보 탐지 |
| 상태조사 문안 | Spring `8080` | `POST /api/xray/report` | 검수 결과 기반 문안 생성 |

복원 가이드 요청은 Vite의 `/tasks` 프록시를 통해 Spring으로 전달한다.
X-RAY 결합·결함 분석·문안도 Spring을 호출하고, Spring이 내부 FastAPI
서비스와 통신한다. `VITE_XRAY_INSPECTION_API_BASE`는 직접 호출을 확인해야
하는 경우를 위한 예비값이며 기본 실행에서는 사용하지 않는다.

## 4. 현재 로컬에서 확인할 수 있는 범위

- 신규 유물 등록 후 선택한 기능 화면으로 이동
- 대시보드와 프로젝트 목록에서 등록한 유물 확인
- 프로젝트 상세에서 기능별 진행 상태 변경
- 복원 가이드 `start/resume` 호출
- X-RAY 결합·결함 분석·문안 생성 호출
- 육안 조사 완료 후 프로젝트 허브 복귀
- 새로고침 후 같은 브라우저에서 유물 정보 유지

다음 항목은 `api` 모드용 Spring API와 AWS 연결 전에는 확인할 수 없다.

- PostgreSQL 유물 영구 저장
- 다른 사용자·PC와 프로젝트 공유
- S3 대표 이미지 원본 업로드
- 서버 발급 정식 `artifactId`
- Presigned URL 업로드 완료 검증

## 5. 로컬 실행 순서

```bash
# 터미널 1: Spring Boot
# localhost:8080

# Anaconda Prompt 2
conda activate xray-ai
uvicorn app.main:app --reload --port 8001

# Git Bash 3: React
npm run dev
```

React 개발 서버는 `http://localhost:5174`를 사용한다.
