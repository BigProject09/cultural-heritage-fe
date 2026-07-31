# artifactId 워크스페이스 API 계약

프론트의 `src/data/workspaceProjects.js`가 사용하는 Spring API 계약이다.
기본 주소는 `VITE_API_BASE_URL=http://localhost:8080`, 기본 경로는
`VITE_ARTIFACTS_API_PATH=/api/artifacts`다.

현재 AWS·S3 연동 전 로컬 테스트에서는
`VITE_ARTIFACT_STORAGE_MODE=local`을 사용하므로 아래 API를 호출하지
않는다. Spring 구현이 완료된 뒤 `VITE_ARTIFACT_STORAGE_MODE=api`로
전환하면 이 계약이 활성화된다.

## 엔드포인트

| Method | Path | 용도 |
| --- | --- | --- |
| `GET` | `/api/artifacts` | 로그인 사용자의 유물 프로젝트 목록 |
| `GET` | `/api/artifacts/{artifactId}` | 유물과 GUIDE/XRAY/VISUAL 상태 상세 |
| `POST` | `/api/artifacts` | 신규 유물 등록 및 서버 `artifactId` 발급 |
| `PATCH` | `/api/artifacts/{artifactId}` | 유물 기본 정보 수정 |
| `PATCH` | `/api/artifacts/{artifactId}/modules/{moduleType}` | 기능 상태 저장 |
| `POST` | `/api/artifacts/{artifactId}/files/presign` | 대표 이미지 S3 PUT URL 발급 |
| `POST` | `/api/artifacts/{artifactId}/files/{fileId}/complete` | S3 업로드 검증 및 완료 |
| `DELETE` | `/api/artifacts/{artifactId}` | 프로젝트와 연결된 모듈 결과·파일 메타데이터 삭제 |

`moduleType`은 `GUIDE`, `XRAY`, `VISUAL` 중 하나다. 세 기능은 서로
독립적으로 실행한다. 기능 상태는 `NOT_STARTED`, `IN_PROGRESS`,
`REVIEW_REQUIRED`, `DONE`, `NEEDS_UPDATE`, `FAILED` 중 하나다.
`NEEDS_UPDATE`는 해당 기능 자체의 저장 형식·버전이 바뀌어 다시 확인해야
할 때만 사용하며, 다른 기능의 완료 여부 때문에 설정하지 않는다.

## 목록·상세 응답

목록은 배열 또는 Spring Page의 `content` 배열을 지원한다. 상세 응답 예시는
다음과 같다.

```json
{
  "artifactId": "ART-2026-0042",
  "name": "청동 숟가락 파편",
  "material": "청동",
  "era": "조선시대",
  "conditionSummary": "다수 파편 및 표면 부식",
  "weight": "320g",
  "bondingArea": "보통",
  "treatmentPurpose": "연구용",
  "imageUrl": "https://cdn.example.com/artifacts/ART-2026-0042/color.png",
  "updatedAt": "2026-07-30T06:00:00Z",
  "modules": [
    { "moduleType": "GUIDE", "status": "DONE", "revision": 1 },
    { "moduleType": "XRAY", "status": "IN_PROGRESS", "revision": 0 },
    { "moduleType": "VISUAL", "status": "NOT_STARTED", "revision": 0 }
  ]
}
```

## 신규 등록 요청

```json
{
  "name": "청동 숟가락 파편",
  "material": "청동",
  "era": "조선시대",
  "conditionSummary": "다수 파편 및 표면 부식",
  "weight": "320g",
  "bondingArea": "보통",
  "treatmentPurpose": "연구용",
  "initialModuleType": "XRAY"
}
```

`POST /api/artifacts` 응답에는 서버가 발급한 `artifactId`와 초기화된 세
기능 상태가 반드시 포함되어야 한다.

## 기능 상태 변경

```json
{
  "status": "DONE"
}
```

가능하면 변경된 전체 유물을 `artifact` 필드에 담아 응답한다. 없으면
프론트가 상세 API를 한 번 더 호출한다. GUIDE, XRAY, VISUAL 중 하나의
상태가 바뀌어도 다른 기능의 상태는 변경하지 않는다.

최종 통합 보고서 생성 가능 여부만 아래 조건으로 판단한다.

```text
GUIDE == DONE
XRAY == DONE
VISUAL == DONE
```

## 대표 이미지 업로드

1. 신규 유물을 먼저 등록해 `artifactId`를 발급받는다.
2. Presigned URL을 요청한다.
3. 브라우저가 응답의 `requiredHeaders`와 `Content-Type`으로 S3에 PUT한다.
4. PUT 응답의 ETag와 파일 크기로 완료 API를 호출한다.
5. 상세 조회의 `imageUrl` 또는 `COLOR_ORIGINAL` 파일 URL로 대표 이미지를
   반환한다.

Presign 요청:

```json
{
  "moduleType": "XRAY",
  "fileRole": "COLOR_ORIGINAL",
  "originalFileName": "artifact-front.png",
  "contentType": "image/png",
  "sizeBytes": 2458721
}
```

완료 요청:

```json
{
  "sizeBytes": 2458721,
  "etag": "\"abc123\""
}
```

## 프로젝트 삭제

`DELETE /api/artifacts/{artifactId}`는 성공 시 `204 No Content`를 권장한다.
백엔드는 해당 유물의 GUIDE/XRAY/VISUAL 결과, 작업 레코드, 파일
메타데이터를 한 트랜잭션에서 삭제하고 S3 객체도 함께 정리해야 한다.
권한이 없거나 프로젝트가 없으면 각각 `403`, `404`를 반환한다.

로컬 모드에서는 프론트가 프로젝트 메타데이터, IndexedDB 대표 이미지,
해당 `artifactId`로 생성한 로컬 보고서를 함께 삭제한다.

## 인증과 오류

`accessToken` 또는 `loginUser.accessToken`이 있으면 프론트가
`Authorization: Bearer ...` 헤더를 보낸다. 오류 응답은 아래처럼
`message`를 포함하는 형식을 권장한다.

```json
{
  "code": "ARTIFACT_NOT_FOUND",
  "message": "유물 프로젝트를 찾을 수 없습니다."
}
```
