# 복원 가이드 Flow 수정 적용

이 폴더의 `src`를 기존 프론트엔드 프로젝트 루트에 덮어쓴 뒤, 아래의
구 복원 가이드 보고서 파일을 Git에서 삭제합니다.

```bash
git rm \
  src/pages/PostRecord/PostRecordPage.jsx \
  src/pages/PostRecord/PostRecordPage.css \
  src/pages/PostRecord/ReportPage.jsx \
  src/pages/PostRecord/ReportPage.css \
  src/pages/PostRecord/ReportCompletePage.jsx \
  src/pages/PostRecord/ReportCompletePage.css
```

검증:

```bash
npm run lint
npm run build
```

변경 결과:

- 복원 가이드 Flow: 해체 → 세척 → 강화 → 접합 → 복원
- 처리 후 기록과 복원 가이드 전용 보고서 생성 단계 제거
- 선택한 마지막 공정 완료 시 복원 가이드 모듈을 완료 처리
- 완료 후 유물 프로젝트 상세로 이동
- 통합 보고서는 프로젝트 상세의 최종 보고서에서만 생성
