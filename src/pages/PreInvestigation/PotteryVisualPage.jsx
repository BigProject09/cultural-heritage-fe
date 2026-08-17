import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./PotteryVisualPage.css";
import { useDisassembly } from "../../context/useDisassembly";
import {
  createInspectionJob,
  getLatestInspectionJob,
  pollInspectionJob,
  MultipleObjectsDetectedError,
} from "../../services/potteryInspectionApi";
import { uploadPhoto } from "../../services/photoUploadApi";
import {
  parseInspectionSections,
  compareEra,
} from "../../utils/inspectionText";
import {
  MODULE_STATUS,
  getWorkspaceProject,
  markWorkspaceModule,
  selectWorkspaceProject,
} from "../../data/workspaceProjects";
import { getArtifactRoute } from "../../utils/artifactRoutes";
import ModulePageHeader from "../../components/common/ModulePageHeader/ModulePageHeader";

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
  return POTTERY_MATERIAL_KEYWORDS.some((keyword) =>
    material.includes(keyword),
  );
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
    reader.onerror = () =>
      reject(reader.error || new Error("이미지 인코딩 실패"));
    reader.readAsDataURL(blob);
  });
}

// 합성한 마스킹 사진을 새로고침 후에도 쓸 수 있게 보관하는 키.
// FinalReportPage.jsx가 같은 문자열로 읽어간다(페이지끼리 import하지 않기 위해 상수만 맞춤).
const ANNOTATED_IMAGE_STORAGE_KEY = "voraAnnotatedInspectionImageV1";
// S3 업로드가 성공했을 때, 그 URL도 같은 방식으로 보관하는 키.
const ANNOTATED_IMAGE_URL_STORAGE_KEY = "voraAnnotatedInspectionImageUrlV1";

function PotteryVisualPage() {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);

  const { visualResult, setVisualResult } = useDisassembly();
  const resultIsCurrent =
    !!visualResult && visualResult.__artifactId === artifactId;

  // 등록 직후 잠깐은 로컬 저장값으로 먼저 보여주고, 워크스페이스 조회가
  // 끝나면(아래 useEffect) 서버 최신값으로 갱신한다.
  // 여기 image는 등록 시 첨부한 "예시 사진"일 뿐, 육안조사 분석 대상이
  // 아니다 - 조사용 사진은 이 화면에서 사용자가 별도로 새로 올린다.
  const [artifactInfo, setArtifactInfo] = useState(() =>
    readStoredArtifactInfo(),
  );

  // restoring | idle | loading | done | error | unsupported
  const [status, setStatus] = useState("restoring");
  const [errorMessage, setErrorMessage] = useState("");
  const [multiObjectPrompt, setMultiObjectPrompt] = useState(null);
  const [imageSize, setImageSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadDragging, setIsUploadDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollAbortRef = useRef(null);
  const previewObjectUrlRef = useRef(null);

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

  // 페이지를 벗어나면 브라우저 폴링만 중단한다. 실제 분석 상태는 Spring/RDS와
  // FastAPI에 남아 있고, Spring 서버 폴러가 완료 결과를 계속 저장한다.
  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  const applyCompletedJob = (job) => {
    if (!job?.result) {
      throw new Error("완료된 문양 기반 상태 조사 작업에 분석 결과가 없습니다.");
    }

    if (job.photoUrl) {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      setInspectionPhotoUrl(job.photoUrl);
    }
    setVisualResult({
      ...job.result,
      __artifactId: artifactId,
      __photoUrl: job.photoUrl || null,
      __assessmentRunId: job.assessmentRunId,
    });
    setStatus("done");
  };

  /** 새 사진으로 서버 영속 육안조사 job을 시작하고 완료될 때까지 폴링한다. */
  const runInspection = async (
    file,
    { treatAsSingleArtifact = false } = {},
  ) => {
    setStatus("loading");
    setErrorMessage("");
    setMultiObjectPrompt(null);

    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;

    try {
      const created = await createInspectionJob(file, {
        artifactId,
        treatAsSingleArtifact,
      });

      // SPA 이동 중에도 짧은 접수 POST 자체는 끝까지 보내고, 화면을 이미
      // 벗어났다면 이후 UI 갱신/브라우저 폴링만 중단한다.
      if (controller.signal.aborted) return;

      if (created.photoUrl) {
        if (previewObjectUrlRef.current) {
          URL.revokeObjectURL(previewObjectUrlRef.current);
          previewObjectUrlRef.current = null;
        }
        setInspectionPhotoUrl(created.photoUrl);
      }

      const completed =
        created.status === "done"
          ? created
          : await pollInspectionJob(artifactId, created.assessmentRunId, {
              signal: controller.signal,
            });

      applyCompletedJob(completed);
    } catch (error) {
      if (error?.name === "AbortError") return;

      if (error instanceof MultipleObjectsDetectedError) {
        setMultiObjectPrompt({
          file,
          message: error.message,
          detectedRegionCount: error.detectedRegionCount,
          photoUrl: error.photoUrl || null,
        });
        if (error.photoUrl) {
          setInspectionPhotoUrl(error.photoUrl);
        }
        setStatus("idle");
        return;
      }

      setErrorMessage(
        error?.message ||
          "분석 요청 중 오류가 발생했습니다. 다시 시도해주세요.",
      );
      setStatus("error");
    }
  };

  /** "하나의 유물이 깨진 조각들이에요" 확인 후 새 서버 run으로 재분석한다. */
  const handleConfirmSingleArtifact = async () => {
    if (!multiObjectPrompt?.file) {
      setMultiObjectPrompt(null);
      fileInputRef.current?.click();
      return;
    }

    const { file } = multiObjectPrompt;
    setMultiObjectPrompt(null);
    await runInspection(file, { treatAsSingleArtifact: true });
  };

  /** "서로 다른 유물이에요" - 재촬영을 안내하고 에러 상태로 보여준다. */
  const handleRejectSingleArtifact = () => {
    if (!multiObjectPrompt) return;
    setErrorMessage(multiObjectPrompt.message);
    setMultiObjectPrompt(null);
    setStatus("error");
  };

  // 재진입은 브라우저 저장소가 아니라 artifactId -> assessment_run(RDS)로 복원한다.
  useEffect(() => {
    if (!artifactId) {
      setStatus("idle");
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();
    pollAbortRef.current?.abort();
    pollAbortRef.current = controller;

    const restore = async () => {
      setStatus("restoring");
      setErrorMessage("");

      try {
        const latest = await getLatestInspectionJob(artifactId, {
          signal: controller.signal,
        });
        if (cancelled) return;

        if (!latest) {
          setStatus("idle");
          return;
        }

        if (latest.photoUrl) {
          setInspectionPhotoUrl(latest.photoUrl);
        }

        if (latest.status === "done") {
          applyCompletedJob(latest);
          return;
        }

        setStatus("loading");
        const completed = await pollInspectionJob(
          artifactId,
          latest.assessmentRunId,
          { signal: controller.signal },
        );
        if (cancelled) return;
        applyCompletedJob(completed);
      } catch (error) {
        if (cancelled || error?.name === "AbortError") return;

        if (error instanceof MultipleObjectsDetectedError) {
          if (error.photoUrl) setInspectionPhotoUrl(error.photoUrl);
          setErrorMessage(
            `${error.message} 다시 분석하려면 사진을 선택해주세요.`,
          );
          setStatus("error");
          return;
        }

        console.error("기존 문양 기반 상태 조사 작업 복원 실패:", error);
        setErrorMessage(`기존 문양 기반 상태 조사 작업 복원 실패: ${error.message}`);
        setStatus("error");
      }
    };

    void restore();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // artifactId가 바뀔 때만 해당 유물의 서버 작업을 새로 복원한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactId]);

  const selectInspectionFile = (file) => {
    if (!file || status === "loading" || status === "restoring") return;

    if (!file.type?.startsWith("image/")) {
      setErrorMessage("이미지 파일을 선택해 주세요.");
      setStatus("error");
      return;
    }

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = previewUrl;

    setInspectionPhotoUrl(previewUrl);
    setImageSize(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setVisualResult(null);

    void runInspection(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) selectInspectionFile(file);

    // 같은 파일을 다시 선택해도 change 이벤트가 발생하도록 값을 비워둔다.
    e.target.value = "";
  };

  const handleUploadDrop = (e) => {
    e.preventDefault();
    setIsUploadDragging(false);

    if (status === "loading" || status === "restoring") return;

    const file = Array.from(e.dataTransfer.files || []).find((item) =>
      item.type?.startsWith("image/"),
    );

    if (!file) {
      setErrorMessage("이미지 파일을 끌어다 놓아 주세요.");
      setStatus("error");
      return;
    }

    selectInspectionFile(file);
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
          const blob = await compositeAnnotatedPhoto(
            imgRef.current,
            visiblePatterns,
          );
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
        window.alert(`문양 기반 상태 조사 저장 실패: ${error.message}`);
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
    (p) =>
      (p.agreement_count ?? 0) >= minAgreement && p.decision !== "판정보류",
  );

  const eraComparison = resultIsCurrent
    ? compareEra(artifactInfo.period, visualResult?.detail?.era?.prediction)
    : null;

  const sections = resultIsCurrent
    ? parseInspectionSections(visualResult.inspection_text)
    : [];

  const statusLabel =
    status === "restoring"
      ? "기존 분석 확인 중"
      : status === "loading"
        ? "분석 중"
        : status === "done"
          ? "AI 분석 완료"
          : "AI 분석 초안";

  return (
    <div className="visual-page">
      <div className="visual-container">
        <ModulePageHeader
          artifactId={artifactId}
          currentLabel="문양 기반 상태 조사"
          eyebrow="AI PATTERN ANALYSIS"
          title="문양 기반 상태 조사"
          description="토기·도자기 사진의 문양과 형태적 특징을 AI로 분석해 육안조사 초안을 만듭니다."
          tone="blue"
          rightContent={<span className="visual-status">{statusLabel}</span>}
        />

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
            <small
              style={{
                display: "block",
                marginTop: "4px",
                color: isPottery ? "#4b6b57" : "#9b3a32",
                fontWeight: 700,
              }}
            >
              {isPottery ? "문양 분석 지원" : "문양 분석 미지원"}
            </small>
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
              이 재질은 문양 기반 육안 상태 조사 대상이 아닙니다. 현재는
              <strong style={{ color: "#c2410c" }}>
                {" "}
                연질토기·경질토기·도자기류
              </strong>
              만 지원합니다.
            </p>
          </section>
        ) : (
          <>
            <section className="photo-card">
              <div className="photo-upload-guide">
                <h3 className="photo-upload-title">문양 분석용 사진</h3>
                <p className="photo-upload-target">
                  분석 대상: 연질토기 · 경질토기 · 도자기류
                </p>
                <p className="photo-upload-emphasis">
                  ※ 문양과 표면이 선명하게 보이도록 유물 1점을 크게 촬영한
                  사진을 업로드해 주세요.
                </p>
                <p className="photo-upload-help">
                  축척자·색상표·라벨·손 등 유물 외 물체는 가능하면 화면에서
                  제외해 주세요.
                </p>
              </div>

              {!inspectionPhotoUrl ? (
                <div
                  className={`visual-photo-upload ${isUploadDragging ? "dragging" : ""} ${
                    status === "loading" || status === "restoring"
                      ? "disabled"
                      : ""
                  }`}
                  role="button"
                  tabIndex={
                    status === "loading" || status === "restoring" ? -1 : 0
                  }
                  aria-disabled={status === "loading" || status === "restoring"}
                  aria-label="문양 분석용 사진 업로드"
                  onClick={() => {
                    if (status !== "loading" && status !== "restoring") {
                      fileInputRef.current?.click();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      status !== "loading" &&
                      status !== "restoring" &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    if (status !== "loading" && status !== "restoring") {
                      setIsUploadDragging(true);
                    }
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setIsUploadDragging(false)}
                  onDrop={handleUploadDrop}
                >
                  <span className="visual-upload-icon" aria-hidden="true">
                    ↑
                  </span>
                  <strong>이미지를 끌어다 놓으세요</strong>
                  <p>또는 클릭하여 파일 선택</p>
                  <small>PNG, JPG, WEBP 권장 · 파일당 최대 20MB 권장</small>
                </div>
              ) : (
                <div className="photo-replace-row">
                  <span>선택한 사진</span>
                  <button
                    type="button"
                    className="photo-replace-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={status === "loading" || status === "restoring"}
                  >
                    사진 변경
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                className="visual-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={status === "loading" || status === "restoring"}
              />

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
                    className={`photo-frame ${isUploadDragging ? "dragging-file" : ""}`}
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      if (status !== "loading" && status !== "restoring") {
                        setIsUploadDragging(true);
                      }
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={() => setIsUploadDragging(false)}
                    onDrop={handleUploadDrop}
                    style={{
                      cursor:
                        zoom > 1
                          ? isDragging
                            ? "grabbing"
                            : "grab"
                          : "default",
                    }}
                  >
                    <div
                      className="photo-zoom-layer"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transition: isDragging
                          ? "none"
                          : "transform 0.15s ease",
                      }}
                    >
                      <img
                        ref={imgRef}
                        src={inspectionPhotoUrl}
                        alt="문양 분석용으로 새로 올린 사진"
                        onLoad={handleImageLoad}
                        draggable={false}
                      />
                      {(status === "loading" || status === "restoring") && (
                        <div className="photo-loading-overlay">
                          <span className="spinner" aria-hidden="true" />
                          <p>
                            {status === "restoring"
                              ? "기존 문양 기반 상태 조사 작업을 확인 중이에요…"
                              : "AI가 문양과 형태적 특징을 분석 중이에요…"}
                          </p>
                        </div>
                      )}
                      {imageSize && (
                        <svg
                          className="pattern-svg"
                          viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                          preserveAspectRatio="xMidYMid meet"
                        >
                          {(() => {
                            const scale = Math.max(
                              imageSize.width,
                              imageSize.height,
                            );
                            const strokeWidth = Math.max(scale / 350, 2);
                            const fontSize = Math.max(scale / 45, 16);

                            return visiblePatterns.map((pattern, idx) => {
                              const box = pattern.bbox_percent;
                              if (!box) return null;
                              const x = (box.x1 / 100) * imageSize.width;
                              const y = (box.y1 / 100) * imageSize.height;
                              const w =
                                ((box.x2 - box.x1) / 100) * imageSize.width;
                              const h =
                                ((box.y2 - box.y1) / 100) * imageSize.height;
                              const label =
                                pattern.display_name || pattern.pattern_name;
                              const labelY = Math.max(
                                y - fontSize * 0.4,
                                fontSize,
                              );

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
                                    style={{
                                      fontSize,
                                      strokeWidth: fontSize / 5,
                                    }}
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
                </>
              )}
            </section>
          </>
        )}

        {status === "error" && (
          <section className="visual-notice visual-notice--error">
            <p>{errorMessage}</p>
            <button className="retry-btn" onClick={handleRetry}>
              다시 시도
            </button>
          </section>
        )}

        {multiObjectPrompt && (
          <section className="visual-notice visual-notice--confirm">
            <div className="visual-notice-heading">
              <p>
                이 사진에서 서로 떨어진 조각이{" "}
                {multiObjectPrompt.detectedRegionCount}개 감지됐어요.
              </p>
              <span
                className="visual-notice-info"
                title={multiObjectPrompt.message}
              >
                !
              </span>
            </div>
            <p className="visual-notice-question">
              하나의 유물이 깨진 조각들인가요, 서로 다른 유물인가요?
            </p>
            <div className="visual-notice-actions">
              <button
                className="retry-btn retry-btn--primary"
                onClick={handleConfirmSingleArtifact}
              >
                하나의 유물이에요
              </button>
              <button
                className="retry-btn retry-btn--secondary"
                onClick={handleRejectSingleArtifact}
              >
                다른 유물이에요
              </button>
            </div>
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
            ) : status === "loading" || status === "restoring" ? (
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
                          <rect
                            x="23"
                            y="6"
                            width="14"
                            height="5"
                            rx="2"
                            fill="#c2760f"
                          />
                          <rect
                            x="25"
                            y="10"
                            width="10"
                            height="9"
                            rx="3"
                            fill="#c2760f"
                          />
                          <ellipse
                            cx="30"
                            cy="30"
                            rx="14"
                            ry="16"
                            fill="#c2760f"
                          />
                          <ellipse
                            cx="24"
                            cy="22"
                            rx="3.5"
                            ry="5"
                            fill="#ffffff"
                            opacity="0.35"
                          />
                          <circle
                            cx="20"
                            cy="32"
                            r="2.6"
                            fill="#f4a4a4"
                            opacity="0.7"
                          />
                          <circle
                            cx="40"
                            cy="32"
                            r="2.6"
                            fill="#f4a4a4"
                            opacity="0.7"
                          />
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
                  {status === "restoring"
                    ? "기존 문양 기반 상태 조사 작업과 저장된 결과를 서버에서 불러오고 있어요."
                    : "분석에는 1분 이상 걸릴 수 있어요. 화면을 벗어나도 서버 분석은 계속되며, 다시 들어오면 진행 중인 작업을 이어서 확인합니다."}
                </p>
              </div>
            ) : (
              <p className="status-note">
                {isPottery
                  ? "문양 분석용 사진을 올리면 문양 기반 상태 조사가 시작됩니다."
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
          <p>완료하면 현재 유물의 문양 기반 상태 조사 결과가 저장됩니다.</p>
          <button
            className="complete-btn"
            onClick={handleComplete}
            disabled={status === "loading" || status === "restoring"}
          >
            문양 기반 상태 조사 완료
          </button>
        </footer>
      </div>
    </div>
  );
}

export default PotteryVisualPage;
