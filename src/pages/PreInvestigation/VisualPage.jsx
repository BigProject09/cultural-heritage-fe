import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MODULE_STATUS,
  markWorkspaceModule,
} from "../../data/workspaceProjects";
import { getArtifactRoute } from "../../utils/artifactRoutes";
import VisualReport from "./VisualReport";
import { useVisualInvestigation } from "./useVisualInvestigation";
import "./VisualPage.css";

const IMAGE_TYPES = "image/png,image/jpeg,image/webp";
const RUN_STATUS_LABELS = {
  QUEUED: "분석 대기",
  RUNNING: "분석 중",
  COMPLETED: "분석 완료",
  FAILED: "분석 실패",
};
const RUN_STATUS_HELP = {
  QUEUED: "분석 작업이 접수되어 순서를 기다리고 있습니다.",
  RUNNING: "등록 이미지를 바탕으로 특이점 후보와 권고 초안을 생성하고 있습니다.",
  COMPLETED: "분석이 완료되어 보고서를 불러오는 중이거나 표시할 수 있습니다.",
  FAILED: "분석 작업이 실패했습니다. 이미지를 확인한 뒤 다시 시작하세요.",
};
const RUN_STATUS_PROGRESS = {
  QUEUED: 20,
  RUNNING: 65,
  COMPLETED: 100,
  FAILED: 100,
};
const STAGE_ORDER = [
  "preprocessing",
  "rough_masking",
  "visual_cue_generation",
  "rag",
  "prompt_generating",
  "mask_refining",
  "anomaly_grouping",
  "report_generating",
];
const STAGE_LABELS = {
  preprocessing: "이미지 전처리",
  rough_masking: "특이점 후보 탐지",
  visual_cue_generation: "시각 단서 분석",
  rag: "문헌 근거 검색",
  prompt_generating: "정밀 분석 준비",
  mask_refining: "특이점 영역 정밀화",
  anomaly_grouping: "특이점 후보 취합",
  report_generating: "보고서 생성",
};
const STAGE_STATUS_LABELS = {
  pending: "대기",
  running: "진행 중",
  completed: "완료",
  failed: "실패",
  skipped: "건너뜀",
};

function statusLabel(status) {
  return RUN_STATUS_LABELS[status] || status || "상태 확인 필요";
}

// run.stages는 서버가 이미 거쳐 간 단계만 채워 보내므로, 아직 보고되지
// 않은 단계는 STAGE_ORDER를 기준으로 직접 채워 넣는다. currentStage와
// 이름이 같은 단계만 "진행 중"으로 보고, 나머지는 "대기"로 둔다.
function stageChecklist(run) {
  const known = new Map((run?.stages || []).map((stage) => [stage.name, stage]));
  return STAGE_ORDER.map((name) => {
    const found = known.get(name);
    if (found) return found;
    if (name === run?.currentStage) return { name, status: "running" };
    return { name, status: "pending" };
  });
}

function formatDate(value) {
  if (!value) return "시간 정보 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// progressPercent가 없는 run도 있어, stages 배열의 완료 비율로 대신
// 추정하고, 그마저 없으면 상태값만으로 대략적인 값을 쓴다.
function runProgress(run) {
  if (!run) return 0;
  if (Number.isFinite(run.progressPercent)) return run.progressPercent;
  if (Array.isArray(run.stages) && run.stages.length > 0) {
    const finished = run.stages.filter(
      (stage) => stage.status === "completed" || stage.status === "skipped",
    ).length;
    return Math.round((finished / STAGE_ORDER.length) * 100);
  }
  return RUN_STATUS_PROGRESS[run.status] || 0;
}

// 육안 상태 조사(VCA) 메인 페이지 - 라우트 /artifacts/:artifactId/visual.
// PreInvestigationPage의 "육안 상태 조사" 버튼으로 진입한다. 상태/액션은
// 대부분 useVisualInvestigation 훅에 있고, 이 컴포넌트는 화면 조립만 한다.
export default function VisualPage() {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);
  const fileInputRef = useRef(null);
  const [completionError, setCompletionError] = useState("");
  const investigation = useVisualInvestigation(artifactId);
  const {
    artifact,
    cancelRun,
    error,
    handlePdfJob,
    handlePotteryInspection,
    isMock,
    loadArtifact,
    loading,
    notice,
    pdfJob,
    removeImage,
    report,
    reportRunId,
    runRequestPending,
    runIsActive,
    selectFiles,
    selectedRun,
    startRun,
    uploadedImages,
    working,
    workspaceArtifact,
  } = investigation;
  const canComplete = Boolean(report) && selectedRun?.status === "COMPLETED";
  const pageBusy = Boolean(working) || runRequestPending;
  const canStartRun = uploadedImages.length > 0 && !runIsActive && !pageBusy;
  const progressValue = runProgress(selectedRun);

  // "육안 조사 완료" 버튼 핸들러. 워크스페이스에 완료 상태를 기록하고
  // 유물 워크스페이스로 돌아간다. 보고서를 아직 못 열었으면(canComplete
  // false) 저장을 시도하지 않고 안내만 띄운다.
  async function handleComplete() {
    if (!canComplete) {
      setCompletionError("완료된 분석 보고서를 먼저 열어 확인하세요.");
      return;
    }

    try {
      setCompletionError("");
      await markWorkspaceModule(artifactId, "visual", MODULE_STATUS.DONE);
      navigate(getArtifactRoute(artifactId));
    } catch (completionFailure) {
      setCompletionError(`육안 조사 완료 상태 저장 실패: ${completionFailure.message}`);
    }
  }

  if (loading) {
    return (
      <main className="visual-page visual-vca-page visual-state" aria-live="polite">
        VCA 조사 정보를 불러오는 중입니다.
      </main>
    );
  }

  if (error) {
    const notReady = error.status === 404 || error.status === 409;
    return (
      <main className="visual-page visual-vca-page visual-state" role="alert">
        <span className="visual-vca-kicker">VCA CONNECTION</span>
        <h1>{notReady ? "육안 조사 준비 중" : "조사 정보를 불러오지 못했습니다"}</h1>
        <p>
          {notReady
            ? "이 유물의 VCA 조사 데이터가 아직 준비되지 않았습니다. 잠시 후 다시 시도하세요."
            : error.message}
        </p>
        <button type="button" className="visual-primary-button" onClick={loadArtifact}>
          다시 시도
        </button>
      </main>
    );
  }

  return (
    <main className="visual-page visual-vca-page">
      <div className="visual-container visual-vca-container">
        <nav className="visual-vca-breadcrumb" aria-label="현재 위치">
          <button type="button" onClick={() => navigate(-1)}>
            유물 워크스페이스
          </button>
          <span aria-hidden="true">/</span>
          <strong>육안 상태 조사</strong>
        </nav>

        <header className="visual-vca-header">
          <div>
            <span className="visual-vca-kicker">VISUAL CONDITION ANALYSIS</span>
            <h1>육안 상태 조사</h1>
            <p>등록 이미지를 바탕으로 AI 초안을 검토하고 조사 기록을 준비합니다.</p>
          </div>
          <span className="visual-vca-status">
            {isMock ? "육안 조사" : statusLabel(artifact.status)}
          </span>
        </header>

        <section className="visual-vca-summary" aria-label="조사 대상 요약">
          <div><span>조사 대상</span><strong>{workspaceArtifact.name || artifact.displayName || "유물 정보 없음"}</strong></div>
          <div><span>관리번호</span><strong>{artifact.artifactId || artifactId}</strong></div>
          <div><span>재질</span><strong>{workspaceArtifact.material || "정보 없음"}</strong></div>
          <div><span>등록 이미지</span><strong>{uploadedImages.length}장</strong></div>
        </section>

        <div className="visual-vca-layout">
          <section className="visual-vca-card" aria-labelledby="visual-images-title">
            <div className="visual-vca-heading">
              <div>
                <span className="visual-vca-kicker">STEP 01</span>
                <h2 id="visual-images-title">조사 이미지</h2>
                <p>원본 이미지는 변경되지 않으며, 업로드 후 분석 실행에 사용됩니다.</p>
              </div>
              <span className="visual-vca-count">{uploadedImages.length}장 등록</span>
            </div>
            <input
              ref={fileInputRef}
              className="visual-vca-hidden"
              type="file"
              accept={IMAGE_TYPES}
              multiple
              aria-label="조사 이미지 파일 선택"
              onChange={selectFiles}
              disabled={pageBusy}
            />
            <div className="visual-vca-upload">
              <div>
                <strong>이미지를 선택하면 바로 등록됩니다</strong>
                <p>PNG, JPG, WEBP 형식을 지원하며 선택 즉시 VCA 서버로 업로드합니다.</p>
              </div>
              <div className="visual-vca-actions">
                <button
                  type="button"
                  className="visual-secondary-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pageBusy}
                >
                  {working === "upload" ? "업로드 중" : "파일 선택 및 업로드"}
                </button>
              </div>
            </div>
            {uploadedImages.length === 0 ? (
              <p className="visual-vca-empty">등록된 이미지가 없습니다. 분석을 시작하려면 이미지를 업로드하세요.</p>
            ) : (
              <ul className="visual-vca-image-grid">
                {uploadedImages.map((image) => (
                  <li key={image.imageId}>
                    {image.imageUrl ? (
                      <img src={image.imageUrl} alt={`${image.fileName || "조사"} 이미지`} />
                    ) : (
                      <div className="visual-vca-image-placeholder" aria-label={`${image.fileName || "조사"} 이미지 미리보기 준비 중`}>
                        PREVIEW
                      </div>
                    )}
                    <div>
                      <strong>{image.fileName || "등록 이미지"}</strong>
                      <button type="button" onClick={() => removeImage(image.imageId)} disabled={working === `delete-${image.imageId}`}>
                        {working === `delete-${image.imageId}` ? "삭제 중" : "삭제"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="visual-vca-review" aria-labelledby="visual-run-title">
            <span className="visual-vca-kicker">STEP 02</span>
            <h2 id="visual-run-title">AI 분석 실행</h2>
            <p>분석 상태는 실제 VCA API에서 주기적으로 갱신합니다. 진행 중인 분석은 언제든 중지할 수 있습니다.</p>
            <div className="visual-vca-status-panel" role="status" aria-live="polite">
              <span className={`visual-vca-status-state ${selectedRun?.status?.toLowerCase() || "idle"}`}>
                {selectedRun ? statusLabel(selectedRun.status) : "분석 전"}
              </span>
              <strong>{selectedRun?.currentStage || RUN_STATUS_HELP[selectedRun?.status] || "이미지를 등록한 뒤 분석을 시작하세요."}</strong>
              <div className="visual-vca-progress" aria-label="분석 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressValue} role="progressbar">
                <span style={{ width: `${progressValue}%` }} />
              </div>
              <ol className="visual-vca-stage-list">
                {stageChecklist(selectedRun).map((stage) => (
                  <li key={stage.name} className={`visual-vca-stage-item ${stage.status}`}>
                    <span className="visual-vca-stage-name">{STAGE_LABELS[stage.name] || stage.name}</span>
                    <span className="visual-vca-stage-status">{STAGE_STATUS_LABELS[stage.status] || stage.status}</span>
                  </li>
                ))}
              </ol>
              {selectedRun?.status === "FAILED" && selectedRun?.failureReason && (
                <p className="visual-vca-stage-failure">{selectedRun.failureReason}</p>
              )}
              <dl className="visual-vca-status-meta">
                <div>
                  <dt>접수 시간</dt>
                  <dd>{selectedRun ? formatDate(selectedRun.createdAt) : "대기 중"}</dd>
                </div>
                <div>
                  <dt>이미지 수</dt>
                  <dd>{selectedRun?.imageCount || uploadedImages.length}장</dd>
                </div>
                <div>
                  <dt>완료 시간</dt>
                  <dd>{selectedRun?.completedAt ? formatDate(selectedRun.completedAt) : "미완료"}</dd>
                </div>
              </dl>
            </div>
            <div className="visual-vca-status-actions">
              {runIsActive ? (
                <button type="button" className="visual-primary-button" onClick={cancelRun} disabled={working === "cancel"}>
                  {working === "cancel" ? "중지 중" : "분석 중지"}
                </button>
              ) : (
                <button type="button" className="visual-primary-button" onClick={startRun} disabled={!canStartRun}>
                  {runRequestPending ? "분석 접수 중" : "분석 시작"}
                </button>
              )}
            </div>
          </aside>
        </div>

        {notice && <p className="visual-vca-notice" role="status" aria-live="polite">{notice}</p>}
        {completionError && <p className="visual-vca-notice" role="alert">{completionError}</p>}

        <section className="visual-vca-card visual-vca-report" aria-labelledby="visual-report-title">
          <div className="visual-vca-heading">
            <div>
              <span className="visual-vca-kicker">STEP 03</span>
              <h2 id="visual-report-title">조사 보고서</h2>
              <p>AI가 생성한 결과는 검토 자료이며, 최종 판단은 전문가가 수행합니다.</p>
            </div>
            {selectedRun && <span className="visual-vca-count">{statusLabel(selectedRun.status)}</span>}
          </div>
          {report ? (
            <VisualReport
              artifactId={artifactId}
              runId={reportRunId}
              report={report}
              pdfJob={pdfJob}
              working={working}
              artifactMaterial={workspaceArtifact.material}
              onPotteryInspection={handlePotteryInspection}
              onPdfJob={handlePdfJob}
            />
          ) : (
            <div className="visual-vca-empty">
              <p>
                {selectedRun?.status === "COMPLETED"
                  ? "완료된 분석 보고서를 불러오고 있습니다. 잠시 후 자동으로 표시됩니다."
                  : selectedRun
                    ? "분석이 완료되면 보고서가 자동으로 표시됩니다."
                    : "이미지를 등록하고 분석을 시작하면 보고서를 불러올 수 있습니다."}
              </p>
            </div>
          )}
        </section>

        <footer className="visual-vca-complete">
          <p>보고서를 확인한 뒤 완료하면 현재 유물의 육안 조사 상태가 저장됩니다.</p>
          <button type="button" className="visual-primary-button" onClick={handleComplete} disabled={!canComplete}>
            육안 조사 완료
          </button>
        </footer>
      </div>
    </main>
  );
}
