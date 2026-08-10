import { useRef, useState } from "react";
import useObjectUrl from "../../hooks/useObjectUrl";

/**
 * 원본 이미지 위에 탐지 박스를 겹쳐 표시한다.
 *
 * SVG를 사용하는 이유
 * - viewBox로 원본 좌표계를 그대로 쓸 수 있어
 *   좌표 변환 계산이 필요 없다
 * - 확대해도 선이 깨지지 않는다
 * - 각 박스에 이벤트를 붙이기 쉽다
 *
 * AI가 반환한 bbox는 원본 이미지 픽셀 좌표이므로
 * viewBox를 원본 크기로 두면 그대로 그릴 수 있다.
 */
export default function ImageViewer({ file, regions, selectedId, onSelect }) {
  const url = useObjectUrl(file);
  const [loadedImage, setLoadedImage] = useState(null);
  const imgRef = useRef(null);

  function handleLoad(e) {
    setLoadedImage({
      url,
      width: e.target.naturalWidth,
      height: e.target.naturalHeight,
    });
  }

  const size = loadedImage?.url === url ? loadedImage : null;

  if (!url) {
    return <div className="viewer-empty">이미지를 선택하세요</div>;
  }

  return (
    <div className="viewer">
      <div className="viewer-inner">
        <img
          ref={imgRef}
          src={url}
          alt=""
          onLoad={handleLoad}
          className="viewer-img"
        />

        {size && (
          <svg
            className="viewer-svg"
            viewBox={`0 0 ${size.width} ${size.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {regions.map((r) => (
              <BoxShape
                key={r.regionId}
                region={r}
                imageWidth={size.width}
                selected={r.regionId === selectedId}
                onSelect={onSelect}
              />
            ))}
          </svg>
        )}
      </div>

      {size && (
        <div className="viewer-meta">
          {size.width} x {size.height} px | 영역 {regions.length}건
        </div>
      )}
    </div>
  );
}

/**
 * 신뢰도별 색상.
 *
 * 색상은 AI 탐지 점수이며 손상 심각도가 아니다.
 */
function colorOf(confidence) {
  if (confidence == null) return "#ff2d2d";
  if (confidence < 0.2) return "#ffd400";
  if (confidence < 0.4) return "#ff9500";
  return "#ff2d2d";
}

function BoxShape({ region, imageWidth, selected, onSelect }) {
  const { x1, y1, x2, y2 } = region.bbox;

  const color = colorOf(region.confidence);

  // 이미지 크기에 비례해 선 굵기와 글자 크기를 정한다.
  // 5000px 원본에서 1px 선은 보이지 않는다.
  const stroke = Math.max(2, imageWidth / 500);
  const fontSize = Math.max(12, imageWidth / 70);

  return (
    <g
      className="cursor-pointer"
      onClick={() => onSelect(region.regionId)}
    >
      <rect
        x={x1}
        y={y1}
        width={x2 - x1}
        height={y2 - y1}
        fill={selected ? color : "none"}
        fillOpacity={selected ? 0.2 : 0}
        stroke={color}
        strokeWidth={selected ? stroke * 2 : stroke}
      />

      <rect
        x={x1}
        y={y1 - fontSize * 1.4}
        width={fontSize * 6}
        height={fontSize * 1.4}
        fill="rgba(0,0,0,0.75)"
      />

      <text
        x={x1 + fontSize * 0.3}
        y={y1 - fontSize * 0.35}
        fill="#fff"
        fontSize={fontSize}
        fontFamily="monospace"
      >
        {region.regionId} {region.confidence != null ? region.confidence.toFixed(2) : ""}
      </text>
    </g>
  );
}
