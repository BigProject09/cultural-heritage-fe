// 사진 한 장에 특이점이 여러 개 찍히면 전부 같은 빨간색이라 겹쳐 보였다 -
// 번호별로 순환하는 팔레트를 둬서 인접한 박스/배지를 색으로 구분한다.
const MARKER_COLORS = [
  "#dc2626", // red
  "#ea580c", // orange
  "#0d9488", // teal
  "#2563eb", // blue
  "#7c3aed", // violet
  "#db2777", // pink
  "#65a30d", // lime
  "#0891b2", // cyan
];

// 특이점 번호(1부터)를 팔레트 색상으로 순환 매핑한다. VisualCandidateOverlay,
// VisualFindingDetailPage, VisualBboxFigure의 마커/배지 색상에 쓴다.
export function markerColorForNumber(number) {
  const index = ((number - 1) % MARKER_COLORS.length + MARKER_COLORS.length) % MARKER_COLORS.length;
  return MARKER_COLORS[index];
}

// 사진 원본 해상도에 비례한 배지 반지름 - 고해상도 사진에서 너무 작게
// 보이거나 저해상도 사진에서 과하게 커지는 것을 막는다.
export function badgeRadiusFor(size) {
  return size ? Math.max(10, Math.min(size.width, size.height) * 0.018) : 14;
}

export function hexWithAlpha(hex, alpha) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 여러 특이점의 bbox 모서리가 같은 사진 안에서 가까이 붙어 있으면 번호
// 배지가 서로 겹쳐서 읽을 수 없게 된다. bbox 좌상단을 기본 위치로 시도하고,
// 이미 배치된 배지와 반지름*2 이상 떨어지지 않으면 주변 8방향 후보를
// 순서대로 시도해 겹치지 않는 자리를 고른다.
export function placeMarkerBadges(boxes, badgeRadius) {
  const placed = [];
  const step = badgeRadius * 2.2;
  const offsets = [
    [0, 0],
    [step, 0], [0, step], [step, step],
    [-step, 0], [0, -step], [-step, -step],
    [step * 2, 0], [0, step * 2],
  ];
  const minDistance = badgeRadius * 2.1;

  return boxes.map(({ xMin, yMin }) => {
    const spot = offsets
      .map(([dx, dy]) => ({ x: xMin + dx, y: yMin + dy }))
      .find((candidate) => placed.every((other) =>
        Math.hypot(other.x - candidate.x, other.y - candidate.y) >= minDistance))
      || { x: xMin, y: yMin };
    placed.push(spot);
    return spot;
  });
}
