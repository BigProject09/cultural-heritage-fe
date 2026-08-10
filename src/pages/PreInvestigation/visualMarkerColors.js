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
// 배지가 서로 겹쳐서 읽을 수 없게 된다. bbox 좌상단을 그대로 기본 위치로
// 쓰면 마스킹 채색 영역과 겹치는 경우가 많아서, 모서리에서 대각선
// 바깥쪽(margin)으로 밀어낸 지점을 기본 위치로 삼는다 - BboxMarker가
// 배지와 원래 모서리 사이에 점선 리더 라인을 그려주므로 어디를 가리키는지는
// 여전히 명확하다. 그 지점부터 주변 8방향 후보를 순서대로 시도해 이미
// 배치된 다른 배지와 겹치지 않는 자리를 고르고, size가 있으면 사진 밖으로
// 나가지 않게 좌표를 안쪽으로 접어 넣는다.
export function placeMarkerBadges(boxes, badgeRadius, size) {
  const placed = [];
  const step = badgeRadius * 2.2;
  const margin = badgeRadius * 1.6;
  const offsets = [
    [-margin, -margin],
    [-margin + step, -margin], [-margin, -margin + step], [-margin + step, -margin + step],
    [-margin - step, -margin], [-margin, -margin - step], [-margin - step, -margin - step],
    [-margin + step * 2, -margin], [-margin, -margin + step * 2],
  ];
  const minDistance = badgeRadius * 2.1;

  function clampToImage(point) {
    if (!size) return point;
    return {
      x: Math.min(Math.max(point.x, badgeRadius), size.width - badgeRadius),
      y: Math.min(Math.max(point.y, badgeRadius), size.height - badgeRadius),
    };
  }

  return boxes.map(({ xMin, yMin }) => {
    const spot = offsets
      .map(([dx, dy]) => ({ x: xMin + dx, y: yMin + dy }))
      .find((candidate) => placed.every((other) =>
        Math.hypot(other.x - candidate.x, other.y - candidate.y) >= minDistance))
      || { x: xMin - margin, y: yMin - margin };
    const clamped = clampToImage(spot);
    placed.push(clamped);
    return clamped;
  });
}
