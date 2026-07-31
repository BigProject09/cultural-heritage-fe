import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./VisualPage.css";
import { useDisassembly } from "../../context/useDisassembly";
import { inspectPottery } from "../../services/potteryInspectionApi";
import { parseInspectionSections, compareEra } from "../../utils/inspectionText";

// 실제 등록 화면(ArtifactRegisterPage.jsx) 재질 드롭다운 값 기준.
// "도토기"라는 옵션은 없음 - 연질토기/경질토기 두 개가 도자기 계열이다.
// 드롭다운 옵션이 바뀌면 이 목록도 같이 바꿔야 한다.
const POTTERY_MATERIALS = ["연질토기", "경질토기"];

function readStoredArtifactInfo() {
  try {
    return JSON.parse(localStorage.getItem("artifactInfo")) || {};
  } catch {
    return {};
  }
}

function VisualPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const approvedFlow = location.state?.approvedFlow;

  const { setPreInvestigation, visualResult, setVisualResult } =
    useDisassembly();

  // idle | loading | done | error | unsupported
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [imageSize, setImageSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const artifactInfo = readStoredArtifactInfo();
  const isPottery = POTTERY_MATERIALS.includes(artifactInfo.material);
  const imgRef = useRef(null);

  // 지금 화면에 뜬 유물이랑 context에 남아있는 visualResult가 정말 같은
  // 건인지 판단하는 단일 기준. 이 값 하나로 "결과 화면 표시 여부"랑
  // "사진 위 박스 표시 여부"를 둘 다 결정해야, 둘 중 하나만 최신화되고
  // 나머지가 예전 유물 결과를 계속 그리는 일이 없다.
  const resultIsCurrent =
    !!visualResult && visualResult.__artifactId === artifactInfo.artifactId;

  const runInspection = async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      // 등록 화면이 사진을 data URL로 저장해두므로(새로고침해도 안 사라짐),
      // 다시 업로드 가능한 형태(Blob)로 복원해서 보낸다.
      const blob = await fetch(artifactInfo.image).then((res) => res.blob());
      const data = await inspectPottery(blob);
      setVisualResult({ ...data, __artifactId: artifactInfo.artifactId });
      setStatus("done");
    } catch (err) {
      setErrorMessage(
        err.message || "분석 요청 중 오류가 발생했습니다. 다시 시도해주세요.",
      );
      setStatus("error");
    }
  };

  useEffect(() => {
    // 재질 체크를 가장 먼저 한다 - 이전에 다른 유물(연질토기 등)을 분석해서
    // context의 visualResult가 남아있는 상태로 새 유물(철 등)을 등록해도,
    // 예전 결과를 잘못 보여주면 안 되기 때문이다.
    if (!isPottery) {
      setStatus("unsupported");
      return;
    }
    // 캐시된 결과가 있어도, 그게 지금 유물과 같은 artifactId일 때만 재사용한다.
    if (resultIsCurrent) {
      setStatus("done");
      return;
    }
    if (!artifactInfo?.image) {
      setErrorMessage(
        "등록된 유물 사진을 찾을 수 없습니다. 유물 등록을 다시 진행해주세요.",
      );
      setStatus("error");
      return;
    }
    runInspection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplete = () => {
    setPreInvestigation((prev) => ({ ...prev, visual: true }));
    navigate("/pre-investigation", { state: { approvedFlow } });
  };

  const handleImageLoad = (e) => {
    setImageSize({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight,
    });
  };

  const ZOOM_STEP = 0.5;
  const ZOOM_MAX = 3;

  const handleZoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  const handleZoomOut = () =>
    setZoom((z) => {
      const next = Math.max(z - ZOOM_STEP, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e) => {
    if (zoom === 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };
  const handlePointerUp = () => setIsDragging(false);

  // AI가 "N회 이상 위치 합의되고 판정보류가 아닌 문양만 기본 화면에 표시"하라고
  // 응답의 display_policy로 알려주는 내용을 그대로 반영한 필터.
  // resultIsCurrent가 false면(다른 유물의 예전 결과) patternInfo를 아예 null로
  // 둬서, 사진 위 박스가 엉뚱한 유물 위에 남아있는 일이 없게 한다.
  const patternInfo = resultIsCurrent
    ? visualResult?.detail?.pattern_era_color
    : null;
  const minAgreement = patternInfo?.min_agreement_used ?? 2;
  const visiblePatterns = (patternInfo?.patterns || []).filter(
    (p) => (p.agreement_count ?? 0) >= minAgreement && p.decision !== "판정보류",
  );

  const eraComparison = resultIsCurrent
    ? compareEra(artifactInfo.period, visualResult?.detail?.era?.prediction)
    : null;

  const sections = resultIsCurrent
    ? parseInspectionSections(visualResult.inspection_text)
    : [];

  return (
    <div className="visual-page">
      <div className="visual-container">
        <nav className="visual-breadcrumb" aria-label="현재 위치">
          <button type="button" onClick={() => navigate(-1)}>
            처리 전 조사
          </button>
          <span>/</span>
          <strong>육안 상태 조사</strong>
        </nav>

        <header className="visual-header">
          <div className="visual-heading">
            <span className="visual-eyebrow">PRE-INVESTIGATION</span>
            <h1 className="visual-title">육안 상태 조사</h1>
            <p>사진 한 장으로 형태·유약·시대·문양을 함께 분석합니다.</p>
          </div>
        </header>

        <section className="visual-artifact-summary">
          <div className="visual-artifact-identity">
            <span className="visual-artifact-mark" aria-hidden="true">
              VI
            </span>
            <div>
              <span>분석 대상 유물</span>
              <strong>{artifactInfo.name || "유물 정보 없음"}</strong>
            </div>
          </div>
          <div className="visual-artifact-data">
            <span>관리번호</span>
            <strong>{artifactInfo.artifactId || "정보 없음"}</strong>
          </div>
          <div className="visual-artifact-data">
            <span>재질</span>
            <strong>{artifactInfo.material || "정보 없음"}</strong>
          </div>
          <div className="visual-artifact-data">
            <span>등록 시대</span>
            <strong>{artifactInfo.period || "정보 없음"}</strong>
          </div>
        </section>

        {artifactInfo.image && (
          <div className="photo-card">
            <div className="photo-toolbar">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom === 1}
                aria-label="축소"
              >
                −
              </button>
              <span className="photo-zoom-level">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom === ZOOM_MAX}
                aria-label="확대"
              >
                ＋
              </button>
              {zoom > 1 && (
                <button
                  type="button"
                  className="photo-zoom-reset"
                  onClick={handleZoomReset}
                >
                  원래 크기
                </button>
              )}
            </div>
            <div
              className="photo-frame"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
            >
              <div
                className="photo-zoom-layer"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isDragging ? "none" : "transform 0.15s ease",
                }}
              >
                <img
                  ref={imgRef}
                  src={artifactInfo.image}
                  alt="등록한 유물 사진"
                  onLoad={handleImageLoad}
                  draggable={false}
                />
                {status === "loading" && (
                  <div className="photo-loading-overlay">
                    <span className="spinner" aria-hidden="true" />
                    <p>AI가 분석 중이에요…</p>
                  </div>
                )}
                {imageSize && (
                <svg
                  className="pattern-svg"
                  viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {(() => {
                    // 박스 두께/글자 크기는 CSS 고정값이 아니라 이미지 실제
                    // 해상도에 비례해서 계산한다 - 안 그러면 사진 해상도에
                    // 따라 선이 지나치게 얇거나 두껍게 보인다.
                    const scale = Math.max(imageSize.width, imageSize.height);
                    const strokeWidth = Math.max(scale / 350, 2);
                    const fontSize = Math.max(scale / 45, 16);

                    return visiblePatterns.map((pattern, idx) => {
                      const box = pattern.bbox_percent;
                      if (!box) return null;
                      const x = (box.x1 / 100) * imageSize.width;
                      const y = (box.y1 / 100) * imageSize.height;
                      const w = ((box.x2 - box.x1) / 100) * imageSize.width;
                      const h = ((box.y2 - box.y1) / 100) * imageSize.height;
                      const label =
                        pattern.display_name || pattern.pattern_name;
                      const labelY = Math.max(y - fontSize * 0.4, fontSize);

                      return (
                        <g key={pattern.key || idx}>
                          <rect
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            className="pattern-rect"
                            style={{ strokeWidth }}
                          />
                          <text
                            x={x}
                            y={labelY}
                            className="pattern-label-bg"
                            style={{ fontSize, strokeWidth: fontSize / 5 }}
                          >
                            {label}
                          </text>
                          <text
                            x={x}
                            y={labelY}
                            className="pattern-label"
                            style={{ fontSize }}
                          >
                            {label}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              )}
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="visual-section">
            <p className="error-text">{errorMessage}</p>
            <button className="retry-btn" onClick={runInspection}>
              다시 시도
            </button>
          </div>
        )}

        {status === "unsupported" && (
          <div className="visual-section">
            <p>
              현재는 연질토기·경질토기(도자기류)만 AI 육안조사를 지원합니다.
              다른 재질은 준비 중입니다.
            </p>
          </div>
        )}

        {status === "done" && resultIsCurrent && (
          <div className="visual-section">
            <div className="result-card-header">
              <h2>AI 분석 결과</h2>
              {visualResult.human_review_recommended && (
                <span className="review-badge">
                  ⚠ 전문가 검토를 권장합니다
                </span>
              )}
            </div>

            {eraComparison && (
              <div
                className={`era-compare ${
                  eraComparison.match ? "match" : "mismatch"
                }`}
              >
                <span>등록 시대: {artifactInfo.period}</span>
                <span>→</span>
                <span>
                  AI 재분석: {visualResult.detail.era.prediction}
                  {typeof visualResult.detail.era.score === "number" &&
                    ` (${Math.round(visualResult.detail.era.score * 100)}%)`}
                </span>
                <span className="era-compare-tag">
                  {eraComparison.match ? "일치" : "불일치 · 검토 권장"}
                </span>
              </div>
            )}

            <div className="inspection-sections">
              {sections.map((section, idx) => (
                <div className="inspection-section" key={idx}>
                  {section.title && (
                    <h3 className="visual-result-heading">
                      {section.title}
                      {section.caveat && (
                        <span
                          className="caveat-icon"
                          data-tooltip={section.caveat}
                        >
                          !
                        </span>
                      )}
                    </h3>
                  )}
                  <p className="section-body">{section.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="complete-area">
          <button
            className="complete-btn"
            onClick={handleComplete}
            disabled={status === "loading"}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}

export default VisualPage;
