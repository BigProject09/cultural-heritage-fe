# 최신 프론트엔드 파일 맵

기준일: 2026-08-03

현재 구조의 기준은 `artifactId`다. 복원 가이드, X-RAY, 육안 조사는
독립적으로 실행하며 세 기능의 `DONE` 여부는 최종 통합 보고서에서만
검사한다.

## 최상위 설정

- `.env.example`: 로컬 실행용 환경변수 예시
- `.env.mock`: 백엔드 없는 Mock 실행용 환경변수
- `.gitignore`: 의존성, 빌드 결과, 로컬 환경변수 제외
- `README.md`: 전체 서비스 흐름, 설치, 환경변수, 협업 및 Tailwind 사용 규칙
- `eslint.config.js`: ESLint 설정
- `index.html`: Vite HTML 진입점
- `package.json`, `package-lock.json`: 패키지와 실행 스크립트
- `vite.config.js`: React, Tailwind CSS v4, 개발 프록시 설정

실제 `.env`, `node_modules`, `dist`, `.git`은 전달용 압축본에서 제외한다.

## 앱 진입점과 전역 스타일

- `src/main.jsx`: React 진입점, `index.css` 로드
- `src/App.jsx`: 전체 라우트와 Provider 연결
- `src/index.css`: Tailwind v4 진입점, `@theme`, base 스타일
- `src/styles/HeritageWorkflow.css`: 복원 공정 공통 화면 스타일

## 공통 컴포넌트

### 진행 표시

- `src/components/common/ProgressNavigator/ProgressNavigator.jsx`
- `src/components/common/ProgressNavigator/ProgressNavigator.css`
- `src/components/common/StepSidebar/StepSidebar.jsx`
- `src/components/common/StepSidebar/StepSidebar.css`

`StepSidebar` 두 파일은 현재 라우트에서 사용하지 않는 보관 코드다.

### artifactId 라우팅

- `src/components/routing/ArtifactRouteSync.jsx`: URL의 유물 정보 재조회
- `src/components/routing/LegacyArtifactRedirect.jsx`: 구 URL을 새 URL로 이동

### 유물 워크스페이스

- `src/components/workspace/ArtifactThumb.jsx`
- `src/components/workspace/HeritageHeader.jsx`
- `src/components/workspace/HeritagePage.jsx`
- `src/components/workspace/HeritagePage.css`
- `src/components/workspace/WorkspaceChrome.css`

### X-RAY

- `src/components/xray/ImageViewer.jsx`
- `src/components/xray/ReportPanel.jsx`
- `src/components/xray/StitchEditor.jsx`
- `src/components/xray/StitchEditor.css`
- `src/components/xray/TaskProgress.jsx`
- `src/components/xray/TaskProgress.css`

## Context, 데이터, Hook

- `src/context/DisassemblyContext.jsx`: 복원 가이드 실행 상태
- `src/context/disassemblyContextValue.js`: Context 객체
- `src/context/useDisassembly.js`: Context 사용 Hook
- `src/data/boardData.js`: 게시판 Mock 데이터
- `src/data/flowData.js`: 공정명과 라우트 키
- `src/data/noticeData.js`: 공지사항 Mock 데이터
- `src/data/workspaceProjects.js`: 유물 CRUD, 기능 상태, local/API 모드
- `src/data/localArtifactAssets.js`: S3 연동 전 대표 이미지 IndexedDB 저장·조회·정리
- `src/hooks/useObjectUrl.js`: 업로드 파일 미리보기 URL 관리

## 페이지

### 홈, 등록, 프로젝트

- `src/pages/Home/HomePage.jsx`
- `src/pages/Home/HomePage.css`
- `src/pages/ArtifactRegister/ArtifactRegisterPage.jsx`
- `src/pages/ArtifactRegister/ArtifactRegisterPage.css`
- `src/pages/WorkList/WorkListPage.jsx`
- `src/pages/WorkList/WorkListPage.css`
- `src/pages/ProjectDetail/ProjectDetailPage.jsx`
- `src/pages/ProjectDetail/ProjectDetailPage.css`

### 회원과 마이페이지

- `src/pages/Auth/LoginPage.jsx`
- `src/pages/Auth/LoginPage.css`
- `src/pages/Auth/SignUpPage.jsx`
- `src/pages/Auth/SignUpPage.css`
- `src/pages/MyPage/MyPage.jsx`
- `src/pages/MyPage/MyPage.css`
- `src/pages/MyPage/ProfilePage.jsx`
- `src/pages/MyPage/ProfilePage.css`
- `src/pages/MyPage/ActivityPage.jsx`
- `src/pages/MyPage/ActivityPage.css`
- `src/pages/MyPage/ProjectPage.jsx`
- `src/pages/MyPage/ProjectPage.css`
- `src/pages/MyPage/MyReportPage.jsx`
- `src/pages/MyPage/MyReportPage.css`
- `src/pages/MyPage/MyReportDetailPage.jsx`
- `src/pages/MyPage/AccountPages.css`

### 공지와 게시판

- `src/pages/Notice/NoticePage.jsx`
- `src/pages/Notice/NoticePage.css`
- `src/pages/Board/BoardPage.jsx`
- `src/pages/Board/BoardPage.css`
- `src/pages/Board/BoardDetailPage.jsx`
- `src/pages/Board/BoardDetailPage.css`

### 독립 기능

- `src/pages/FlowRecommendationPage/FlowRecommendationPage.jsx`
- `src/pages/FlowRecommendationPage/FlowRecommendationPage.css`
- `src/pages/PreInvestigation/XrayPage.jsx`
- `src/pages/PreInvestigation/XrayPage.css`
- `src/pages/PreInvestigation/VisualPage.jsx`
- `src/pages/PreInvestigation/VisualPage.css`
- `src/pages/FinalReport/FinalReportPage.jsx`
- `src/pages/FinalReport/FinalReportPage.css`
- `src/pages/PreInvestigation/PreInvestigationPage.jsx`
- `src/pages/PreInvestigation/PreInvestigationPage.css`

`PreInvestigationPage.jsx`와 `PreInvestigationPage.css`는 기존 선행조사 허브로,
새 라우트에서는 사용하지 않는 보관 코드다.

### 해체

- `src/pages/Disassembly/DisassemblyPage.jsx`
- `src/pages/Disassembly/DisassemblyPage.css`
- `src/pages/Disassembly/DisassemblyChecklistPage.jsx`
- `src/pages/Disassembly/DisassemblyChecklistPage.css`
- `src/pages/Disassembly/DisassemblyToolPage.jsx`
- `src/pages/Disassembly/DisassemblyToolPage.css`
- `src/pages/Disassembly/DisassemblyMethodPage.jsx`
- `src/pages/Disassembly/DisassemblyMethodPage.css`

### 세척

- `src/pages/Cleaning/CleaningPage.jsx`
- `src/pages/Cleaning/CleaningPage.css`
- `src/pages/Cleaning/CleaningMethodSelectPage.jsx`
- `src/pages/Cleaning/CleaningMethodSelectPage.css`
- `src/pages/Cleaning/CleaningStepPage.jsx`
- `src/pages/Cleaning/CleaningStepPage.css`
- `src/pages/Cleaning/CleaningDryingStepPage.jsx`
- `src/pages/Cleaning/CleaningDryingStepPage.css`

### 강화

- `src/pages/Strengthening/StrengtheningPage.jsx`
- `src/pages/Strengthening/StrengtheningPage.css`
- `src/pages/Strengthening/StrengtheningMaterialPage.jsx`
- `src/pages/Strengthening/StrengtheningMaterialPage.css`
- `src/pages/Strengthening/StrengtheningMethodPage.jsx`
- `src/pages/Strengthening/StrengtheningMethodPage.css`
- `src/pages/Strengthening/StrengtheningWettingPage.jsx`
- `src/pages/Strengthening/StrengtheningWettingPage.css`

### 접합

- `src/pages/Bonding/BondingPage.jsx`
- `src/pages/Bonding/BondingPage.css`
- `src/pages/Bonding/BondingMethodPage.jsx`
- `src/pages/Bonding/BondingMethodPage.css`
- `src/pages/Bonding/BondingMaterialPage.jsx`
- `src/pages/Bonding/BondingMaterialPage.css`
- `src/pages/Bonding/BondingWorkPage.jsx`
- `src/pages/Bonding/BondingWorkPage.css`

### 복원

- `src/pages/Restoration/RestorationPage.jsx`
- `src/pages/Restoration/RestorationPage.css`
- `src/pages/Restoration/RestorationMethodPage.jsx`
- `src/pages/Restoration/RestorationMethodPage.css`
- `src/pages/Restoration/RestorationMaterialPage.jsx`
- `src/pages/Restoration/RestorationMaterialPage.css`

### 최종 통합 보고서

- `src/pages/FinalReport/FinalReportPage.jsx`
- `src/pages/FinalReport/FinalReportPage.css`

복원 가이드 내부의 `처리 후 기록`과 별도 보고서 화면은 삭제했다. 복원
가이드는 `해체 → 세척 → 강화 → 접합 → 복원`에서 끝나며, GUIDE·X-RAY·
VISUAL 결과를 취합하는 보고서는 프로젝트 상세의 `FinalReportPage`에서만
생성한다.

## 서비스와 유틸리티

- `src/services/api.js`: 공통 Axios 인스턴스
- `src/services/conservationGuideApi.js`: 복원 가이드 start/resume와 mock 분기
- `src/services/conservationGuideMock.js`: 화면 진행용 복원 가이드 mock 데이터
- `src/services/photoUploadApi.js`: 공정 사진 업로드
- `src/services/stitchGeometry.js`: X-RAY 수동 배치 좌표 변환
- `src/services/xrayApi.js`: 결합, 탐지, 문안 API
- `src/utils/applyInterrupt.js`: LangGraph interrupt 응답 반영
- `src/utils/artifactRoutes.js`: artifactId 기반 URL 생성
- `src/utils/flowNavigation.js`: 승인 Flow의 이전·다음 공정 이동
- `src/utils/myReports.js`: 내 보고서 로컬 저장

## 문서와 정적 파일

- `docs/local-test-api-status.md`: 로컬/API 모드와 현재 연동 상태
- `docs/workspace-api-contract.md`: Spring 유물 워크스페이스 API 계약
- `docs/latest-file-map.md`: 이 파일
- `public/favicon.svg`: 브라우저 파비콘
- `public/icons.svg`: 현재 미사용 정적 아이콘
- `src/assets/hero.png`: 현재 미사용 이미지
- `src/assets/react.svg`: Vite 초기 템플릿 잔여 파일
- `src/assets/vite.svg`: Vite 초기 템플릿 잔여 파일

## 현재 완료 범위

- `artifactId`가 모든 기능 URL에 유지됨
- 복원 가이드, X-RAY, 육안 조사 독립 실행
- 구 URL 자동 이동
- 새로고침 시 URL의 `artifactId`로 유물 정보 복구
- 세 기능이 모두 `DONE`일 때만 최종 보고서 활성화
- Tailwind CSS v4 `@theme`로 공통 토큰 관리
- 모든 컴포넌트 CSS가 `src/index.css`의 테마 참조

## 아직 백엔드 연동이 필요한 범위

- X-RAY 상세 결과 영구 저장
- 육안 조사 실제 판정 데이터 저장
- 복원 가이드 Context의 서버 저장과 새로고침 복구
- 세 상세 결과를 취합하는 최종 보고서 API
- 실제 PPT 생성과 다운로드
