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
  "biological growth": "생물학적 오염",
  "surface loss": "결손",
  flaking: "박리",
  "stain discoloration": "변색",
  "hole or pit": "구멍·천공",
  deformation: "변형",
  "adhesive residue": "접착제 잔류물",
  "visual anomaly": "시각적 이상",
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
