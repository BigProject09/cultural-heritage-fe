// 사진 + bbox 표시는 오버레이 목록(VisualCandidateOverlay, 여러 개·클릭·호버)과
// 특이점 상세 페이지(VisualFindingDetailPage, 하나·정적 강조)에서 각각 따로
// 구현돼 있었다. 실제로 다른 부분은 마커 상호작용뿐이고 figure/frame/svg
// viewBox/이미지 로드 처리는 완전히 같아서 여기로 합쳤다.
import { hexWithAlpha } from "./visualMarkerColors";

// 이미지 + 그 위에 겹치는 SVG 오버레이 레이어를 그린다. size가 아직 없으면
// (이미지 로드 전) SVG는 생략한다. children으로 받은 BboxMarker들이
// 실제 박스/배지를 그린다. VisualCandidateOverlay, VisualFindingDetailPage에서 쓴다.
export function BboxFigure({ image, size, onImageLoad, children }) {
  return (
    <figure className="visual-vca-overlay-figure">
      <div className="visual-vca-overlay-frame">
        <img
          src={image.downloadUrl}
          alt={`${image.fileName || "분석 대상"} 이미지`}
          onLoad={onImageLoad}
        />
        {size && (
          <svg
            className="visual-vca-overlay-svg"
            viewBox={`0 0 ${size.width} ${size.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {children}
          </svg>
        )}
      </div>
      <figcaption>{image.fileName || "분석 대상 이미지"}</figcaption>
    </figure>
  );
}

// polygon(마스크 윤곽선을 벡터화한 좌표 배열, [{x,y}, ...])이 있으면 실제
// 세그멘테이션 모양을, 없으면(예전 리포트 등) bbox 사각형을 그린다. 배지
// 위치는 항상 bbox 기준으로 유지한다 - placeMarkerBadges의 겹침 회피 계산이
// 사각형을 전제로 하고 있어, 임의의 폴리곤 점보다 안정적이다.
function ShapeOutline({ bbox, polygon, color, fillAlpha }) {
  if (polygon && polygon.length >= 3) {
    return (
      <polygon
        points={polygon.map((point) => `${point.x},${point.y}`).join(" ")}
        className="visual-vca-overlay-box"
        style={{ stroke: color, fill: hexWithAlpha(color, fillAlpha) }}
      />
    );
  }
  const { xMin, yMin, xMax, yMax } = bbox;
  return (
    <rect
      x={xMin}
      y={yMin}
      width={xMax - xMin}
      height={yMax - yMin}
      className="visual-vca-overlay-box"
      style={{ stroke: color, fill: hexWithAlpha(color, fillAlpha) }}
    />
  );
}

// interactive=false면 정적 강조용(상세 페이지의 단일 특이점): 클릭/호버 없이
// 번호 배지가 달린 모양만 그린다.
export function BboxMarker({
  bbox,
  polygon,
  number,
  color,
  badgeRadius,
  badge,
  fillAlpha = 0.14,
  interactive = false,
  onClick,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}) {
  const { xMin, yMin } = bbox;
  const badgeSpot = badge || { x: xMin, y: yMin };
  const isBadgeOffset = badgeSpot.x !== xMin || badgeSpot.y !== yMin;

  return (
    <g
      className={interactive ? "visual-vca-overlay-marker" : undefined}
      onClick={interactive ? onClick : undefined}
      onMouseEnter={interactive ? onMouseEnter : undefined}
      onMouseMove={interactive ? onMouseMove : undefined}
      onMouseLeave={interactive ? onMouseLeave : undefined}
    >
      <ShapeOutline bbox={bbox} polygon={polygon} color={color} fillAlpha={fillAlpha} />
      {isBadgeOffset && (
        <line
          x1={xMin}
          y1={yMin}
          x2={badgeSpot.x}
          y2={badgeSpot.y}
          className="visual-vca-overlay-leader"
          style={{ stroke: color }}
        />
      )}
      <circle cx={badgeSpot.x} cy={badgeSpot.y} r={badgeRadius} className="visual-vca-overlay-badge" style={{ fill: color }} />
      <text
        x={badgeSpot.x}
        y={badgeSpot.y}
        className="visual-vca-overlay-badge-text"
        style={{ fontSize: badgeRadius * 1.15 }}
      >
        {number}
      </text>
    </g>
  );
}
