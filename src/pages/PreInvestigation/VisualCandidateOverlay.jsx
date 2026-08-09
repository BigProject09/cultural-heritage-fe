import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONCEPT_FAMILY_LABELS, SEVERITY_LABELS } from "./visualVcaLabels";
import { badgeRadiusFor, markerColorForNumber, placeMarkerBadges } from "./visualMarkerColors";
import { BboxFigure, BboxMarker } from "./VisualBboxFigure";
import KoreanLabel from "./KoreanLabel";

// 이미지 한 장 + 그 위의 bbox 마커 전부 + 호버 팝업을 그린다.
// VisualCandidateOverlay가 downloadUrl이 있는 이미지마다 하나씩 렌더링한다.
function ImageOverlay({ image, findings, findingNumbers, onSelectFinding }) {
  const [size, setSize] = useState(null);
  const [hover, setHover] = useState(null);

  function handleLoad(event) {
    setSize({ width: event.target.naturalWidth, height: event.target.naturalHeight });
  }

  function handleEnter(finding, event) {
    setHover({ finding, x: event.clientX, y: event.clientY });
  }

  function handleMove(event) {
    setHover((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
  }

  function handleLeave() {
    setHover(null);
  }

  const withBbox = findings.filter((finding) => finding.bbox);
  const badgeRadius = badgeRadiusFor(size);
  const badgePositions = placeMarkerBadges(withBbox.map((finding) => finding.bbox), badgeRadius);
  const hoveredFindingId = hover?.finding.findingId;

  return (
    <>
      <BboxFigure image={image} size={size} onImageLoad={handleLoad}>
        {withBbox.map((finding, index) => {
          const number = findingNumbers.get(finding.findingId) ?? index + 1;
          const isHovered = finding.findingId === hoveredFindingId;
          return (
            <BboxMarker
              key={finding.findingId || index}
              bbox={finding.bbox}
              polygons={finding.polygons}
              number={number}
              color={markerColorForNumber(number)}
              badgeRadius={badgeRadius}
              badge={badgePositions[index]}
              fillAlpha={isHovered ? 0.32 : 0.14}
              interactive
              onClick={() => onSelectFinding(finding.findingId)}
              onMouseEnter={(event) => handleEnter(finding, event)}
              onMouseMove={handleMove}
              onMouseLeave={handleLeave}
            />
          );
        })}
      </BboxFigure>
      {hover && (
        <div
          className="visual-vca-finding-popup"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <strong
            className="visual-vca-finding-popup-number"
            style={{ background: markerColorForNumber(findingNumbers.get(hover.finding.findingId)) }}
          >
            {findingNumbers.get(hover.finding.findingId)}
          </strong>
          <strong>
            <KoreanLabel original={hover.finding.severity} labelMap={SEVERITY_LABELS} fallback="관찰" />
          </strong>
          <span>
            <KoreanLabel
              original={hover.finding.conceptFamily}
              labelMap={CONCEPT_FAMILY_LABELS}
              fallback="관찰 항목"
            />
          </span>
          <p>{hover.finding.description || "세부 설명이 없습니다."}</p>
        </div>
      )}
    </>
  );
}

// 조사 보고서 상단의 "특이점 위치" 섹션 - 등록 이미지마다 특이점 bbox를
// 겹쳐 그린다. VisualReport에서 렌더링하며, images가 비어 있으면 아무것도
// 그리지 않는다.
export default function VisualCandidateOverlay({ images, findings, artifactId, runId }) {
  const navigate = useNavigate();
  if (!images || images.length === 0) return null;

  const allFindings = findings || [];
  // 번호는 report.findings 배열 순서(index+1)로만 정한다. VisualReport의
  // 목록, 이 오버레이 배지, 상세 페이지가 모두 같은 규칙을 각자
  // 계산하므로, findings를 정렬하거나 필터링하면 세 곳의 번호가 어긋난다.
  const findingNumbers = new Map(allFindings.map((finding, index) => [finding.findingId, index + 1]));

  function handleSelectFinding(findingId) {
    if (!findingId || !artifactId || !runId) return;
    navigate(
      `/artifacts/${encodeURIComponent(artifactId)}/visual/findings/${encodeURIComponent(runId)}/${encodeURIComponent(findingId)}`,
    );
  }

  return (
    <section className="visual-vca-overlay" aria-labelledby="visual-overlay-title">
      <h3 id="visual-overlay-title">특이점 위치</h3>
      <p>사진 위 번호는 아래 "육안 조사 결과" 목록의 번호와 같습니다. 마우스를 올리면 설명이, 클릭하면 상세 페이지가 나타납니다.</p>
      <div className="visual-vca-overlay-grid">
        {images.map((image) => (
          image.downloadUrl ? (
            <ImageOverlay
              key={image.imageId || image.downloadUrl}
              image={image}
              onSelectFinding={handleSelectFinding}
              findingNumbers={findingNumbers}
              findings={allFindings.filter(
                (finding) => finding.imageId === image.imageId,
              )}
            />
          ) : (
            <div
              key={image.imageId || image.fileName}
              className="visual-vca-image-placeholder"
              aria-label={`${image.fileName || "분석 참고"} 이미지 미리보기 준비 중`}
            >
              PREVIEW
            </div>
          )
        ))}
      </div>
    </section>
  );
}
