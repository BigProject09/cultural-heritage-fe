// 영문 allowlist 값(severity, conceptFamily 등)을 한국어 라벨로 바꿔
// 보여주고, 원문은 title 툴팁으로만 노출한다. VisualReport, VisualCandidateOverlay,
// VisualFindingDetailPage에서 공통으로 쓴다.
export default function KoreanLabel({ original, labelMap, fallback }) {
  if (!original) return fallback ?? null;
  // 백엔드 계약상 original은 항상 문자열이지만, 잘못된 응답이 와도 페이지
  // 전체가 죽지 않도록 문자열로 강제 변환해둔다 - 그렇지 않으면 아래
  // toLowerCase() 호출이 문자열이 아닌 값에서 그냥 죽어버린다.
  const originalText = String(original);
  // labelMap 키 대소문자가 통일돼 있지 않다 (SEVERITY_LABELS는 대문자,
  // CONCEPT_FAMILY_LABELS는 소문자) - 둘 다 그대로 시도한다.
  const korean =
    labelMap[originalText] || labelMap[originalText.toLowerCase()];
  if (!korean) return <span>{originalText}</span>;
  return (
    <span className="visual-vca-original-hint" title={`원문: ${originalText}`}>
      {korean}
    </span>
  );
}
