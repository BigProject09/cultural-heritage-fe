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
VITE_USE_VCA_MOCK=false
VITE_VCA_ACCESS_TOKEN=local-vca-token
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

`.env.mock`이 X-RAY, 복원 가이드, VCA mock을 모두 활성화한다. 해체·세척·
강화·접합·복원 안내와 강화 습윤 분석, 접합 임시접합 분석, 육안 조사 화면
흐름까지 Spring과 AI 서버 없이 진행할 수 있다.

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
| VCA 이미지 업로드 | Spring `8080` | `POST /api/vca/{artifactId}/images` | 육안 조사 이미지 등록 |
| VCA 분석 실행 | Spring `8080` | `POST /api/vca/{artifactId}/runs` | VCA 실행, 도자기 재질이면 pottery 검사 대상 상태 기록 |
| VCA 보고서 조회 | Spring `8080` | `GET /api/vca/{artifactId}/runs/{assessmentRunId}/report` | VCA 보고서와 선택적 `potteryInspection` 확인 |
| VCA 도자기 검사 | Spring `8080` | `POST /api/vca/{artifactId}/runs/{assessmentRunId}/pottery-inspection` | 완료된 VCA run에 pottery 검사 결과 추가 또는 재시도 |
| VCA 중간 결과 | Spring `8080` | `GET /api/vca/{artifactId}/runs/{assessmentRunId}/intermediate-results` | 완료 run의 단계별 출력 파일 확인 |

복원 가이드 요청은 Vite의 `/tasks` 프록시를 통해 Spring으로 전달한다.
X-RAY 결합·결함 분석·문안도 Spring을 호출하고, Spring이 내부 FastAPI
서비스와 통신한다. VCA도 브라우저가 Spring `/api/vca/**`만 호출하고,
Spring이 `VCA_AI_BASE_URL`의 VCA 엔진과 `POTTERY_INSPECTION_AI_BASE_URL`의
pottery-inspection-ai를 필요할 때 호출한다. `VITE_XRAY_INSPECTION_API_BASE`는
직접 호출을 확인해야 하는 경우를 위한 예비값이며 기본 실행에서는 사용하지 않는다.

## 4. 현재 로컬에서 확인할 수 있는 범위

- 신규 유물 등록 후 선택한 기능 화면으로 이동
- 대시보드와 프로젝트 목록에서 등록한 유물 확인
- 프로젝트 상세에서 기능별 진행 상태 변경
- 복원 가이드 `start/resume` 호출
- X-RAY 결합·결함 분석·문안 생성 호출
- VCA 이미지 업로드, 분석 실행, 보고서와 중간 처리 결과 조회
- 도자기 재질 유물에서 보고서 카드의 도자기 검사 실행·재시도와 `potteryInspection` 결과 확인
- 비도자기 재질 유물에서 VCA는 실행되지만 `potteryInspection`이 비어 있는지 확인
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

# 터미널 3: VCA 엔진
# localhost:8002

# 터미널 4: pottery-inspection-ai
# localhost:8003

# Git Bash 5: React
npm run dev
```

React 개발 서버는 `http://localhost:5174`를 사용한다.

Spring 실행 전에는 VCA 관련 환경변수를 맞춘다.

```env
VCA_ACCESS_TOKEN=local-vca-token
VCA_AI_BASE_URL=http://localhost:8002
POTTERY_INSPECTION_AI_BASE_URL=http://localhost:8003
```

로컬에서 S3 없이 Spring이 직접 업로드 완료까지 처리해야 하는 테스트라면
Spring에 `VCA_LOCAL_DIRECT_COMPLETE_ENABLED=true`도 함께 지정한다.

## 6. VCA pottery 검증 순서

1. React를 실제 API 모드로 실행한다. `VITE_USE_VCA_MOCK=false`와
   `VITE_VCA_ACCESS_TOKEN=local-vca-token`이 적용되어야 한다.
2. 신규 유물을 등록하면서 재질을 `도자기`, `pottery`, `ceramic` 중 하나가
   포함된 값으로 입력한다.
3. `/artifacts/{artifactId}/visual`에서 이미지를 1장 이상 업로드한다.
4. `분석 시작`을 누른 뒤 브라우저 Network에서
   `POST /api/vca/{artifactId}/runs` 요청 body가 `{"material":"도자기"}`처럼
   재질을 포함하는지 확인한다.
5. 보고서가 표시되면 도자기 검사 카드의 `도자기 검사 실행` 버튼을 누른다.
6. 브라우저 Network에서
   `POST /api/vca/{artifactId}/runs/{assessmentRunId}/pottery-inspection` 요청이
   발생하고, 이 요청 body에도 `{"material":"도자기"}`가 포함되는지 확인한다.
7. Spring 로그 또는 pottery-inspection-ai 로그에서 `POST /inspect?n_calls=1&use_vlm_pattern=true`
   호출이 발생했는지 확인한다.
8. 보고서 응답에서 기존 VCA `summary`, `findings`, `recommendations`, `images`가
   유지되고, 도자기 유물에는 `potteryInspection.moduleVersion`, `summary`,
   `humanReviewRecommended`, `detail`과 `potteryInspectionStatus.status=COMPLETED`가
   포함되는지 확인한다.
9. pottery-inspection-ai가 실패하는 경우에도 VCA 보고서는 유지되고,
   `potteryInspectionStatus.status=FAILED`, `retryable=true`와 재시도 버튼이
   표시되는지 확인한다.
10. 재질을 `청동`, `목재`처럼 비도자기로 둔 유물도 같은 순서로 실행한다.
   이 경우 VCA 보고서는 생성되어야 하지만 `potteryInspection`은 비어 있어야 한다.
11. 새 분석 실행, 이미지 업로드, 이미지 삭제, run 선택 변경 시 이전 중간 처리
   결과가 화면에서 즉시 사라지고, 완료된 run 보고서를 다시 열 때 해당 run의
   중간 결과만 표시되는지 확인한다.
