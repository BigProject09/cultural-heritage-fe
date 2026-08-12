import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./VisualPage.css";
import { useDisassembly } from "../../context/useDisassembly";
import { inspectPottery } from "../../services/potteryInspectionApi";
import { uploadPhoto } from "../../services/photoUploadApi";
import {
  getOrCreateAssessmentRun,
  savePotteryInspectionResult,
} from "../../services/vcaApi";
import { parseInspectionSections, compareEra } from "../../utils/inspectionText";
import {
  MODULE_STATUS,
  getWorkspaceProject,
  markWorkspaceModule,
  selectWorkspaceProject,
} from "../../data/workspaceProjects";
import { getArtifactRoute } from "../../utils/artifactRoutes";

const POTTERY_MATERIAL_KEYWORDS = [
  "연질토기",
  "경질토기",
  "도자기",
  "백자",
  "청자",
  "분청사기",
  "옹기",
];

function isPotteryMaterial(material) {
  if (!material) return false;
  return POTTERY_MATERIAL_KEYWORDS.some((keyword) => material.includes(keyword));
}

function readStoredArtifactInfo() {
  try {
    return JSON.parse(localStorage.getItem("artifactInfo")) || {};
  } catch {
    return {};
  }
}

/**
 * 화면에 <svg>로 실시간으로만 그려주던 문양 박스/라벨을, 실제 사진 위에
 * 합성해서 PNG Blob으로 만든다. 이 SVG 오버레이는 렌더링 중에만 존재하는
 * 가상의 레이어라서, 이렇게 캔버스로 "구워내지" 않으면 최종보고서 docx에도
 * 절대 반영되지 않는다.
 *
 * VisualPage.css의 .pattern-rect/.pattern-label 색상과 동일하게 그린다.
 */
function compositeAnnotatedPhoto(imageEl, patterns) {
  const canvas = document.createElement("canvas");
  canvas.width = imageEl.naturalWidth;
  canvas.height = imageEl.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageEl, 0, 0, canvas.width, canvas.height);

  const scale = Math.max(canvas.width, canvas.height);
  const strokeWidth = Math.max(scale / 350, 2);
  const fontSize = Math.max(scale / 45, 16);

  patterns.forEach((pattern) => {
    const box = pattern.bbox_percent;
    if (!box) return;

    const x = (box.x1 / 100) * canvas.width;
    const y = (box.y1 / 100) * canvas.height;
    const w = ((box.x2 - box.x1) / 100) * canvas.width;
    const h = ((box.y2 - box.y1) / 100) * canvas.height;
    const label = pattern.display_name || pattern.pattern_name || "";
    const labelY = Math.max(y - fontSize * 0.4, fontSize);

    ctx.fillStyle = "rgba(245, 159, 0, 0.12)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#f59f00";
    ctx.lineWidth = strokeWidth;
    ctx.strokeRect(x, y, w, h);

    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.lineWidth = fontSize / 5;
    ctx.strokeStyle = "#191f28";
    ctx.strokeText(label, x, labelY);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x, labelY);
  });

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Blob을 report-ai가 받는 순수 base64 문자열(data: 접두사 없음)로 바꾼다. */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = String(reader.result).split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("이미지 인코딩 실패"));
    reader.readAsDataURL(blob);
  });
}

// 합성한 마스킹 사진을 새로고침 후에도 쓸 수 있게 보관하는 키.
// FinalReportPage.jsx가 같은 문자열로 읽어간다(페이지끼리 import하지 않기 위해 상수만 맞춤).
const ANNOTATED_IMAGE_STORAGE_KEY = "voraAnnotatedInspectionImageV1";
// S3 업로드가 성공했을 때, 그 URL도 같은 방식으로 보관하는 키.
const ANNOTATED_IMAGE_URL_STORAGE_KEY = "voraAnnotatedInspectionImageUrlV1";

function VisualPage() {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);

  const { visualResult, setVisualResult } = useDisassembly();
  const resultIsCurrent = !!visualResult && visualResult.__artifactId === artifactId;

  // 등록 직후 잠깐은 로컬 저장값으로 먼저 보여주고, 워크스페이스 조회가
  // 끝나면(아래 useEffect) 서버 최신값으로 갱신한다.
  // 여기 image는 등록 시 첨부한 "예시 사진"일 뿐, 육안조사 분석 대상이
  // 아니다 - 조사용 사진은 이 화면에서 사용자가 별도로 새로 올린다.
  const [artifactInfo, setArtifactInfo] = useState(() => readStoredArtifactInfo());

  // idle | uploading | done | error | unsupported
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadWarning, setUploadWarning] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  const [imageSize, setImageSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // 사용자가 이 화면에서 새로 고른 육안조사용 사진(즉시 미리보기용 로컬 object URL).
  // S3 업로드가 끝난 뒤의 실제 URL은 visualResult.__photoUrl로 그대로
  // 흘려보내므로, 여기서 별도 state로 다시 들고 있지 않는다.
  const [inspectionPhotoUrl, setInspectionPhotoUrl] = useState(null);

  const isPottery = isPotteryMaterial(artifactInfo.material);

  // 워크스페이스에서 유물 정보(이름·재질·시대·예시 사진 등)를 가져온다.
  useEffect(() => {
    if (!artifactId) return undefined;

    const controller = new AbortController();
    getWorkspaceProject(artifactId, { signal: controller.signal })
      .then((project) => {
        setArtifactInfo(selectWorkspaceProject(project));
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          window.alert(`유물 정보 조회 실패: ${error.message}`);
        }
      });

    return () => controller.abort();
  }, [artifactId]);

  // 컴포넌트가 사라질 때 로컬 미리보기용 object URL을 정리한다(메모리 누수 방지).
  useEffect(() => {
    return () => {
      if (inspectionPhotoUrl) URL.revokeObjectURL(inspectionPhotoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const runInspection = async (file) => {
    setStatus("loading");
    setErrorMessage("");
    setUploadWarning(false);
    setSaveWarning(false);

    // S3 업로드와 AI 분석은 서로 의존하지 않으므로 동시에 진행한다.
    // 업로드가 실패해도 분석 자체는 보여줄 수 있어야 하므로(반대도 마찬가지),
    // Promise.all 대신 allSettled로 각각 따로 처리한다.
    const [analysisSettled, uploadSettled] = await Promise.allSettled([
      inspectPottery(file),
      uploadPhoto(file),
    ]);

    if (analysisSettled.status === "rejected") {
      setErrorMessage(
        analysisSettled.reason?.message ||
          "분석 요청 중 오류가 발생했습니다. 다시 시도해주세요.",
      );
      setStatus("error");
      return;
    }

    const uploadedUrl =
      uploadSettled.status === "fulfilled" ? uploadSettled.value : null;
    if (uploadSettled.status === "rejected") {
      console.error("사진 S3 업로드 실패:", uploadSettled.reason);
      setUploadWarning(true);
    }

    setVisualResult({
      ...analysisSettled.value,
      __artifactId: artifactId,
      __photoUrl: uploadedUrl,
    });
    setStatus("done");

    // 분석 결과를 DB(VCA 실행 + 육안조사 결과)에 저장한다. 저장이 실패해도
    // 화면에 이미 보여준 분석 결과는 그대로 유효하므로 상태를 되돌리지 않고
    // 경고만 띄운다 - 위 사진 업로드 실패 처리와 같은 방식이다.
    try {
      const run = await getOrCreateAssessmentRun(artifactId);
      await savePotteryInspectionResult(artifactId, run.id, analysisSettled.value);
    } catch (saveError) {
      console.error("육안조사 결과 저장 실패:", saveError);
      setSaveWarning(true);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (inspectionPhotoUrl) URL.revokeObjectURL(inspectionPhotoUrl);
    const previewUrl = URL.createObjectURL(file);

    setInspectionPhotoUrl(previewUrl);
    setImageSize(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setVisualResult(null);

    void runInspection(file);

    // 같은 파일을 다시 선택해도 change 이벤트가 발생하도록 값을 비워둔다.
    e.target.value = "";
  };

  const handleRetry = () => {
    fileInputRef.current?.click();
  };

  const handleComplete = async () => {
    if (artifactId) {
      // 문양 박스(마스킹)가 화면에 떠 있으면 사진 위에 합성해서 base64로
      // 들고 있는다. 최종보고서 docx를 만들 때 이 값을 그대로 실어 보낸다.
      // 서버 업로드를 안 하므로 실패할 일이 거의 없지만, 실패해도 완료
      // 처리 자체는 막지 않는다.
      if (resultIsCurrent && imgRef.current && visiblePatterns.length > 0) {
        try {
          const blob = await compositeAnnotatedPhoto(imgRef.current, visiblePatterns);
          const annotatedImageBase64 = await blobToBase64(blob);

          // AWS(S3)가 설정돼 있으면 원본 사진처럼 S3에 올려서 세션이 끝나도
          // (다른 사람/다른 브라우저에서도) 재사용 가능한 URL로 남긴다.
          // 자격증명이 없는 로컬 환경 등에서 업로드가 실패하면 base64로
          // 대체한다 - 이번 세션/이번 보고서 다운로드는 그래도 되게 하기 위함.
          let annotatedPhotoUrl = null;
          try {
            // handleComplete는 버튼 클릭으로만 실행되는 이벤트 핸들러라
            // 렌더링 중에는 절대 호출되지 않는다 - Date.now()는 파일명
            // 유일성만 위한 것이라 여기서는 안전하다.
            // eslint-disable-next-line react-hooks/purity
            const file = new File([blob], `annotated-${Date.now()}.png`, {
              type: "image/png",
            });
            annotatedPhotoUrl = await uploadPhoto(file);
          } catch (uploadError) {
            console.warn(
              "마스킹 사진 S3 업로드 실패 - base64로 대체합니다:",
              uploadError,
            );
          }

          setVisualResult((prev) =>
            prev
              ? {
                  ...prev,
                  __annotatedImageBase64: annotatedImageBase64,
                  __annotatedPhotoUrl: annotatedPhotoUrl,
                }
              : prev,
          );

          // Context(메모리)에만 두면 새로고침 한 번에 사라져서 보고서에
          // 사진이 빠진다. 같은 탭 안에서는 살아남도록 sessionStorage에도
          // 같이 넣어둔다(용량 초과 시 조용히 실패해도 메모리 쪽은 유효).
          try {
            sessionStorage.setItem(
              `${ANNOTATED_IMAGE_STORAGE_KEY}:${artifactId}`,
              annotatedImageBase64,
            );
            if (annotatedPhotoUrl) {
              sessionStorage.setItem(
                `${ANNOTATED_IMAGE_URL_STORAGE_KEY}:${artifactId}`,
                annotatedPhotoUrl,
              );
            }
          } catch (storageError) {
            console.error("마스킹 사진 임시 저장 실패:", storageError);
          }
        } catch (compositeError) {
          console.error("마스킹 사진 합성 실패:", compositeError);
        }
      }

      try {
        await markWorkspaceModule(artifactId, "visual", MODULE_STATUS.DONE);
      } catch (error) {
        window.alert(`육안 조사 상태 저장 실패: ${error.message}`);
        return;
      }
    }

    navigate(getArtifactRoute(artifactId));
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

  const statusLabel =
    status === "loading"
      ? "분석 중"
      : status === "done"
        ? "AI 분석 완료"
        : "AI 분석 초안";

  return (
    <div className="visual-page">
      <div className="visual-container">
        <nav className="visual-breadcrumb" aria-label="현재 위치">
          <button type="button" onClick={() => navigate(-1)}>
            유물 워크스페이스
          </button>
          <span>/</span>
          <strong>육안 상태 조사</strong>
        </nav>

        <header className="visual-header">
          <div>
            <span className="visual-eyebrow">INDEPENDENT VISUAL MODULE</span>
            <h1 className="visual-title">육안 상태 조사</h1>
            <p>육안조사용 사진을 새로 올리면 형태·유약·시대·문양을 함께 분석합니다.</p>
          </div>
          <span className="visual-status">{statusLabel}</span>
        </header>

        <section className="visual-artifact-summary">
          <div>
            <span>조사 대상</span>
            <strong>{artifactInfo.name || "유물 정보 없음"}</strong>
          </div>
          <div>
            <span>관리번호</span>
            <strong>{artifactInfo.artifactId || "정보 없음"}</strong>
          </div>
          <div>
            <span>재질</span>
            <strong>{artifactInfo.material || "정보 없음"}</strong>
          </div>
          <div>
            <span>시대</span>
            <strong>
              {artifactInfo.period || artifactInfo.era || "정보 없음"}
            </strong>
          </div>
        </section>

        {!isPottery ? (
          <section className="visual-notice">
            <p>
              현재는 연질토기·경질토기(도자기류)만 AI 육안조사를 지원합니다.
              다른 재질은 준비 중입니다.
            </p>
          </section>
        ) : (
          <section className="photo-card">
            <div className="photo-upload-row">
              <div>
                <h3 className="photo-upload-title">육안조사용 사진</h3>
              </div>
              <label className="photo-upload-btn">
                {inspectionPhotoUrl ? "다른 사진 선택" : "사진 선택"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  hidden
                />
              </label>
            </div>

            {inspectionPhotoUrl && (
              <>
                <div className="photo-toolbar">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom === 1}
                    aria-label="축소"
                  >
                    −
                  </button>
                  <span className="photo-zoom-level">
                    {Math.round(zoom * 100)}%
                  </span>
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
                  style={{
                    cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                  }}
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
                      src={inspectionPhotoUrl}
                      alt="육안조사용으로 새로 올린 사진"
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
                {uploadWarning && (
                  <p className="photo-upload-warning">
                    ⚠ 분석은 완료됐지만, 사진을 S3에 저장하는 데는 실패했습니다.
                    새로고침하면 이 사진을 다시 불러올 수 없으니 참고해주세요.
                  </p>
                )}
                {saveWarning && (
                  <p className="photo-upload-warning">
                    ⚠ 분석은 완료됐지만, 결과를 DB에 저장하는 데는 실패했습니다.
                    새로고침하면 이 결과가 사라질 수 있으니 참고해주세요.
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {status === "error" && (
          <section className="visual-notice visual-notice--error">
            <p>{errorMessage}</p>
            <button className="retry-btn" onClick={handleRetry}>
              다시 시도
            </button>
          </section>
        )}

        <div className="visual-result-layout">
          <section className="result-card">
            <div className="visual-section-heading">
              <div>
                <span>ANALYSIS 01</span>
                <h2>AI 분석 결과</h2>
              </div>
              {visualResult?.human_review_recommended && (
                <small className="review-badge">⚠ 전문가 검토 권장</small>
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

            {resultIsCurrent ? (
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
            ) : status === "loading" ? (
              <div className="pottery-loading">
                <div className="pottery-track">
                  <div className="pottery-runner">
                    <div className="pottery-flip">
                      <div className="pottery-bounce">
                        <svg
                          viewBox="0 0 60 60"
                          className="pottery-figure"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <rect x="23" y="6" width="14" height="5" rx="2" fill="#c2760f" />
                          <rect x="25" y="10" width="10" height="9" rx="3" fill="#c2760f" />
                          <ellipse cx="30" cy="30" rx="14" ry="16" fill="#c2760f" />
                          <ellipse
                            cx="24"
                            cy="22"
                            rx="3.5"
                            ry="5"
                            fill="#ffffff"
                            opacity="0.35"
                          />
                          <circle cx="20" cy="32" r="2.6" fill="#f4a4a4" opacity="0.7" />
                          <circle cx="40" cy="32" r="2.6" fill="#f4a4a4" opacity="0.7" />
                          <circle cx="24" cy="27" r="2.6" fill="#2b1608" />
                          <circle cx="36" cy="27" r="2.6" fill="#2b1608" />
                          <circle cx="24.8" cy="26.2" r="0.8" fill="#ffffff" />
                          <circle cx="36.8" cy="26.2" r="0.8" fill="#ffffff" />
                          <path
                            d="M27 33 Q30 35.5 33 33"
                            stroke="#2b1608"
                            strokeWidth="1.4"
                            fill="none"
                            strokeLinecap="round"
                          />
                          <rect
                            className="pottery-arm pottery-arm-left"
                            x="14"
                            y="27"
                            width="5"
                            height="10"
                            rx="2.5"
                            fill="#c2760f"
                          />
                          <rect
                            className="pottery-arm pottery-arm-right"
                            x="41"
                            y="27"
                            width="5"
                            height="10"
                            rx="2.5"
                            fill="#c2760f"
                          />
                          <rect
                            className="pottery-leg pottery-leg-left"
                            x="22"
                            y="42"
                            width="5"
                            height="12"
                            rx="2.5"
                            fill="#92400e"
                          />
                          <rect
                            className="pottery-leg pottery-leg-right"
                            x="33"
                            y="42"
                            width="5"
                            height="12"
                            rx="2.5"
                            fill="#92400e"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="status-note">
                  AI가 형태·유약·시대·문양을 하나씩 살펴보고 있어요. 문양까지
                  확인하는 경우 최대 1분 정도 걸릴 수 있어요.
                </p>
              </div>
            ) : (
              <p className="status-note">
                {isPottery
                  ? "육안조사용 사진을 올리면 분석이 시작됩니다."
                  : "아직 분석 결과가 없습니다."}
              </p>
            )}
          </section>

          <aside className="visual-review-card">
            <span className="visual-review-index">REVIEW NOTE</span>
            <h2>전문가 검수 안내</h2>
            <p>
              AI 결과는 조사 초안입니다. 실제 표면 상태와 촬영 조건을 함께
              확인한 뒤 조사 결과를 확정하세요.
            </p>
            <ul>
              <li>문양명은 반복 분석 기준 후보이며 조사자 검토 필요</li>
              <li>등록 시대와 AI 재분석이 다르면 재확인 권장</li>
              <li>단일 사진 기준으로 뒷면·내부 결손은 확인 불가</li>
            </ul>
          </aside>
        </div>

        <footer className="complete-area">
          <p>완료하면 현재 유물의 육안 조사 상태가 저장됩니다.</p>
          <button
            className="complete-btn"
            onClick={handleComplete}
            disabled={status === "loading"}
          >
            육안 조사 완료
          </button>
        </footer>
      </div>
    </div>
  );
}

export default VisualPage;
