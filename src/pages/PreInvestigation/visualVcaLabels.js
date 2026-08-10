// vca_v2가 내보내는 category/severity/concept family/descriptor는 영문 고정
// 어휘(allowlist)라서, 화면에는 한국어 라벨을 보여주고 원문은 마우스를 올렸을
// 때 title 툴팁으로만 노출한다.
//
// 한국어 라벨은 즉석 번역이 아니라 RAG 코퍼스에 실제로 들어있는
// `[KSC] 2011_보존과학용어집.pdf`(국립문화재연구소 보존과학 용어집)를
// 근거로 확정했다 - 예: crust -> "피각"[皮殼], pit -> "천공"[穿孔],
// powdery -> "분상"[粉狀, 괴상·토상·분상과 같은 계열의 형태 용어],
// local -> "국부적"(국부부식 등 용어집 표기와 통일), stain discoloration
// -> "변색"[變色]. 용어집에 없는 값(visual anomaly 등 상위 폴백)만
// 안전한 일반 표현으로 남겨뒀다.
export const CATEGORY_LABELS = {
  VCA_ANOMALY: "특이점 관찰",
  VCA_REPORT: "보고 항목",
};

export const SEVERITY_LABELS = {
  INFO: "정보",
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "심각",
};

export const CONCEPT_FAMILY_LABELS = {
  crack: "균열",
  deposit: "침전물",
  corrosion: "부식",
  biological_growth: "생물학적 오염",
  surface_loss: "결손",
  flaking: "박리",
  stain_discoloration: "변색",
  hole_pit: "구멍·천공",
  deformation: "변형",
  adhesive_residue: "접착제 잔류물",
  unknown_visual_anomaly: "시각적 이상",
  // RAG 근거(citations)가 전혀 없는 후보의 백엔드 기본값. 참고 문헌과
  // 매칭이 안 됐을 뿐 AI가 실제로 위치를 탐지한 항목이라, "미분류"로
  // 표시해 근거 문헌이 없는 관찰임을 알린다.
  unknown: "미분류",
};

const DESCRIPTOR_TERM_LABELS = {
  white: "흰색",
  black: "검은색",
  green: "녹색",
  reddish: "적색",
  yellow: "황색",
  gray: "회색",
  line: "선형",
  spot: "반점",
  hole: "구멍",
  pit: "천공",
  crust: "피각",
  powder: "분말",
  flaking: "박리",
  broad: "광범위",
  powdery: "분상",
  crystalline: "결정질",
  rough: "거친",
  layered: "층상",
  smooth: "매끄러운",
  micro: "미세",
  local: "국부적",
  // vca_v2의 허용 서술어(ALLOWED_DESCRIPTOR_TERMS)가 21->32단어로 늘었을 때
  // 여기 매핑을 같이 안 늘려서, 아래 11개는 늘어난 뒤로 계속 원문 영어
  // 그대로 노출되고 있었다.
  irregular: "불규칙한",
  texture: "질감",
  shape: "형태",
  shapes: "형태",
  patch: "반점",
  patchy: "반점형",
  patches: "반점",
  dark: "어두운",
  horizontal: "수평",
  linear: "선형",
  streak: "줄무늬",
  // descriptor 필드는 descriptor_terms뿐 아니라 material_terms/context_terms도
  // 합쳐 담고 있어서(anomaly_grouping의 _candidate_evidence 참고), 이 둘도
  // 같이 매핑해야 한다 - 지금까지 아예 빠져 있었다.
  stone: "석재",
  metal: "금속",
  ceramic: "도자기",
  paint: "채색",
  wood: "목재",
  plaster: "회반죽",
  textile: "직물",
  glass: "유리",
  surface: "표면",
  artifact: "유물",
  area: "부위",
  region: "영역",
  localized: "국부적",
};

// descriptor는 공백으로 구분된 영문 단어 나열이라 단어 단위로
// DESCRIPTOR_TERM_LABELS를 찾아 치환한다. VisualFindingDetailPage에서
// 원문 옆 보조 설명(· 이후)으로 쓴다.
export function translateDescriptor(descriptor) {
  if (!descriptor) return "";
  return descriptor
    .split(/\s+/)
    .map((term) => DESCRIPTOR_TERM_LABELS[term.toLowerCase()] || term)
    .join(" ");
}

// finding이 속한 이미지의 파일명을 찾는다. VisualFindingDetailPage에서
// "대상 이미지" 표시에 쓴다.
export function findingImageLabel(imageId, images) {
  if (!imageId) return null;
  const image = images.find((candidate) => candidate.imageId === imageId);
  return image?.fileName || imageId;
}

// conceptFamily가 "unknown"이고 인용 근거도 없으면, mask_refining의
// passthrough 경로를 탄 후보다 - AI가 이상 부위 자체는 탐지했지만 참고
// 문헌에서 일치하는 근거를 찾지 못했다는 뜻이다. 원문 그대로 내려오는
// "unknown: unknown"을 그대로 보여주면 오류처럼 보이므로 이 경우만
// 안내 문구로 바꾼다. VisualCandidateOverlay, VisualFindingDetailPage에서 쓴다.
export function findingDescription(finding) {
  const hasEvidence = (finding.citations?.length || 0) > 0;
  if (finding.conceptFamily === "unknown" && !hasEvidence) {
    return "AI가 이상 부위로 탐지했지만, 참고 문헌에서 일치하는 근거를 찾지 못했습니다.";
  }
  return finding.description || "세부 설명이 없습니다.";
}
