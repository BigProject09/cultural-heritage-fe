// 영문 allowlist 값(severity, conceptFamily 등)을 한국어 라벨로 바꿔
// 보여주고, 원문은 title 툴팁으로만 노출한다. VisualReport, VisualCandidateOverlay,
// VisualFindingDetailPage에서 공통으로 쓴다.
export default function KoreanLabel({ original, labelMap, fallback }) {
  if (!original) return fallback ?? null;
  // labelMap 키 대소문자가 통일돼 있지 않다 (SEVERITY_LABELS는 대문자,
  // CONCEPT_FAMILY_LABELS는 소문자) - 둘 다 그대로 시도한다.
  const korean = labelMap[original] || labelMap[original.toLowerCase()];
  if (!korean) return <span>{original}</span>;
  return (
    <span className="visual-vca-original-hint" title={`원문: ${original}`}>
      {korean}
    </span>
  );
}
