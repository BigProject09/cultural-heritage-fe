import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MODULE_STATUS,
  markWorkspaceModule,
} from "../../data/workspaceProjects";
import { getArtifactRoute } from "../../utils/artifactRoutes";
import VisualReport from "./VisualReport";
import { useVisualInvestigation } from "./useVisualInvestigation";
import { isPotteryMaterial } from "./visualVcaLabels";
import SystemInfoFooter from "../../components/common/SystemInfoFooter";
import "./VcaVisualPage.css";

const IMAGE_TYPES = "image/png,image/jpeg,image/webp";
const RUN_STATUS_LABELS = {
  QUEUED: "분석 대기",
  RUNNING: "분석 중",
  COMPLETED: "분석 완료",
  FAILED: "분석 실패",
};
const RUN_STATUS_HELP = {
  QUEUED: "분석 작업이 접수되어 순서를 기다리고 있습니다.",
  RUNNING:
    "등록 이미지를 바탕으로 특이점 후보와 권고 초안을 생성하고 있습니다.",
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
  "anomaly_grouping",
  "prompt_generating",
  "mask_refining",
  "report_trace_assembly",
  "report_generating",
];
const STAGE_LABELS = {
  preprocessing: "이미지 전처리",
  rough_masking: "특이점 후보 탐지",
  visual_cue_generation: "시각 단서 분석",
  rag: "문헌 근거 검색",
  anomaly_grouping: "특이점 후보 취합",
  prompt_generating: "정밀 분석 준비",
  mask_refining: "특이점 영역 정밀화",
  report_trace_assembly: "보고서 근거 조립",
  report_generating: "보고서 생성",
};
const STAGE_STATUS_LABELS = {
  pending: "대기",
  running: "진행 중",
  completed: "완료",
  failed: "실패",
  skipped: "건너뜀",
};

// pottery-inspection-ai(별도 FastAPI, analyze_pottery())는 VCA 엔진과 달리
// 단계별 진행 상황을 보고하지 않는 단일 동기 호출이라, run.stages 같은 실제
// per-stage 신호가 없다 - 그래서 이 목록은 "실제로 어떤 순서로 계산되는지"를
// pottery_analyzer.py의 analyze_pottery() 흐름 그대로 옮긴 고정 체크리스트이고,
// 상태는 개별 단계가 아니라 도자기 검사 전체 상태(POTTERY_STAGE_STATUS 참고)를
// 모든 항목에 동일하게 적용한다 - 실제로는 없는 단계별 진행률을 있는 것처럼
// 보여주지 않기 위함이다.
const POTTERY_STAGE_ORDER = [
  "detection",
  "completeness",
  "glaze",
  "era",
  "era_evidence",
  "pattern",
  "condition_review",
];
const POTTERY_STAGE_LABELS = {
  detection: "유물 영역 탐지",
  completeness: "완전성·파편 판별",
  glaze: "유약·광택 분석",
  era: "시대 판정",
  era_evidence: "시대 판정 근거 확인",
  pattern: "문양 인식",
  condition_review: "문양 상태 검토",
};

function statusLabel(status) {
  return RUN_STATUS_LABELS[status] || status || "상태 확인 필요";
}

// run.stages는 서버가 이미 거쳐 간 단계만 채워 보내므로, 아직 보고되지
// 않은 단계는 STAGE_ORDER를 기준으로 직접 채워 넣는다. currentStage와
// 이름이 같은 단계만 "진행 중"으로 보고, 나머지는 "대기"로 둔다.
function stageChecklist(run) {
  const known = new Map(
    (run?.stages || []).map((stage) => [stage.name, stage]),
  );
  return STAGE_ORDER.map((name) => {
    const found = known.get(name);
    if (found) return found;
    if (name === run?.currentStage) return { name, status: "running" };
    return { name, status: "pending" };
  });
}

// pottery-inspection-ai에는 개별 단계 신호가 없으므로, 도자기 검사 전체
// 상태(potteryInspectionStatus.status) + 지금 도자기 검사가 실행 중인지
// (working === "pottery")만으로 모든 단계에 공통 상태 하나를 매긴다.
function potteryStageStatus(potteryInspectionStatus, working) {
  if (working === "pottery") return "running";
  const status = potteryInspectionStatus?.status;
  if (status === "COMPLETED") return "completed";
  if (status === "FAILED") return "failed";
  return "pending";
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

// progressPercent는 "전체 진행률"이 아니라 "지금 실행 중인 스테이지 자체의
// 0~100%"다 - 스테이지가 바뀌면 서버가 이 값을 다시 채워서, 스테이지 전환마다
// 프로그레스 바가 자동으로 0%부터 다시 시작한다. rough_masking/mask_refining
// 처럼 계측되는 스테이지가 아니면 서버가 null을 보내는데, 그 경우 8단계 전체
// 비율로 대신 계산하면 "이번 스테이지 진행률"이라는 의미와 어긋나므로 상태값
// 기반 대략값으로만 폴백한다.
function runProgress(run) {
  if (!run) return 0;
  if (Number.isFinite(run.progressPercent)) return run.progressPercent;
  return RUN_STATUS_PROGRESS[run.status] || 0;
}

// 육안 상태 조사(VCA) 메인 페이지 - 라우트 /artifacts/:artifactId/visual/vca.
// PreInvestigationPage의 "육안 상태 조사" 버튼으로 진입한다. 상태/액션은
// 대부분 useVisualInvestigation 훅에 있고, 이 컴포넌트는 화면 조립만 한다.
//
// 레이아웃/스타일은 origin/main의 VisualPage(도자기 전용 구버전) 기본 틀을
// 그대로 가져오고(breadcrumb → header → artifact-summary → pane들 → footer,
// VisualPage.css 참고), 우리 VCA v2 파이프라인에 필요한 pane(다중 이미지
// 업로드, 분석 진행 상태/스테이지, 조사 보고서)만 그 위에 얹었다.
export default function VcaVisualPage() {
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
      setCompletionError(
        `육안 조사 완료 상태 저장 실패: ${completionFailure.message}`,
      );
    }
  }

  if (loading) {
    return (
      <main
        className="visual-page visual-vca-page visual-state"
        aria-live="polite"
      >
        VCA 조사 정보를 불러오는 중입니다.
      </main>
    );
  }

  if (error) {
    const notReady = error.status === 404 || error.status === 409;
    return (
      <main className="visual-page visual-vca-page visual-state" role="alert">
        <span className="visual-eyebrow">VCA CONNECTION</span>
        <h1>
          {notReady ? "육안 조사 준비 중" : "조사 정보를 불러오지 못했습니다"}
        </h1>
        <p>
          {notReady
            ? "이 유물의 VCA 조사 데이터가 아직 준비되지 않았습니다. 잠시 후 다시 시도하세요."
            : error.message}
        </p>
        <button
          type="button"
          className="visual-primary-button"
          onClick={loadArtifact}
        >
          다시 시도
        </button>
      </main>
    );
  }

  return (
    <main className="visual-page visual-vca-page">
      <div className="visual-vca-container">
        <nav className="visual-breadcrumb" aria-label="현재 위치">
          <button
            type="button"
            onClick={() => navigate(getArtifactRoute(artifactId))}
          >
            유물 워크스페이스
          </button>
          <span aria-hidden="true">/</span>
          <strong>육안 상태 조사</strong>
        </nav>

        <header className="visual-header">
          <div>
            <span className="visual-eyebrow">VISUAL CONDITION ANALYSIS</span>
            <h1 className="visual-title">육안 상태 조사</h1>
            <p>
              등록 이미지를 바탕으로 AI 초안을 검토하고 조사 기록을 준비합니다.
            </p>
          </div>
          <span className="visual-status">
            {isMock ? "육안 조사" : statusLabel(artifact.status)}
          </span>
        </header>

        <section
          className="visual-artifact-summary"
          aria-label="조사 대상 요약"
        >
          <div>
            <span>조사 대상</span>
            <strong>
              {workspaceArtifact.name ||
                artifact.displayName ||
                "유물 정보 없음"}
            </strong>
          </div>
          <div>
            <span>관리번호</span>
            <strong>{artifact.artifactId || artifactId}</strong>
          </div>
          <div>
            <span>재질</span>
            <strong>{workspaceArtifact.material || "정보 없음"}</strong>
          </div>
          <div>
            <span>등록 이미지</span>
            <strong>{uploadedImages.length}장</strong>
          </div>
        </section>

        <div className="visual-vca-layout">
          {/* STEP 01: 조사 이미지 - main의 photo-card 틀에 다중 업로드 그리드만 얹는다 */}
          <section
            className="photo-card visual-vca-layout-main"
            aria-labelledby="visual-images-title"
          >
            <div className="photo-upload-row">
              <div>
                <h3 className="photo-upload-title" id="visual-images-title">
                  조사 이미지
                </h3>
                <p className="status-note">
                  원본 이미지는 변경되지 않으며, 업로드 후 분석 실행에
                  사용됩니다.
                </p>
              </div>
              <label className="photo-upload-btn" aria-disabled={pageBusy}>
                {working === "upload" ? "업로드 중" : "파일 선택 및 업로드"}
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
              </label>
            </div>
            {uploadedImages.length === 0 ? (
              <p className="visual-vca-empty">
                등록된 이미지가 없습니다. 분석을 시작하려면 이미지를
                업로드하세요.
              </p>
            ) : (
              <ul className="visual-vca-image-grid">
                {uploadedImages.map((image) => (
                  <li key={image.imageId}>
                    {image.imageUrl ? (
                      <img
                        src={image.imageUrl}
                        alt={`${image.fileName || "조사"} 이미지`}
                      />
                    ) : (
                      <div
                        className="visual-vca-image-placeholder"
                        aria-label={`${image.fileName || "조사"} 이미지 미리보기 준비 중`}
                      >
                        PREVIEW
                      </div>
                    )}
                    <div>
                      <strong>{image.fileName || "등록 이미지"}</strong>
                      <button
                        type="button"
                        onClick={() => removeImage(image.imageId)}
                        disabled={working === `delete-${image.imageId}`}
                      >
                        {working === `delete-${image.imageId}`
                          ? "삭제 중"
                          : "삭제"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* STEP 02: AI 분석 실행 - main에 없던 pane. result-card 틀에 진행 상태/스테이지를 얹는다 */}
          <aside
            className="result-card visual-vca-layout-aside"
            aria-labelledby="visual-run-title"
          >
            <div className="visual-section-heading">
              <div>
                <span>AI 분석 실행</span>
                <h2 id="visual-run-title">분석 상태</h2>
              </div>
            </div>
            <p className="status-note">
              분석 상태는 실제 VCA API에서 주기적으로 갱신합니다. 진행 중인
              분석은 언제든 중지할 수 있습니다.
            </p>
            <div
              className="visual-vca-status-panel"
              role="status"
              aria-live="polite"
            >
              <span
                className={`visual-vca-status-state ${selectedRun?.status?.toLowerCase() || "idle"}`}
              >
                {selectedRun ? statusLabel(selectedRun.status) : "분석 전"}
              </span>
              <strong>
                {selectedRun?.currentStage ||
                  RUN_STATUS_HELP[selectedRun?.status] ||
                  "이미지를 등록한 뒤 분석을 시작하세요."}
              </strong>
              <div
                className="visual-vca-progress"
                aria-label="분석 진행률"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progressValue}
                role="progressbar"
              >
                <span style={{ width: `${progressValue}%` }} />
              </div>
              <ol className="visual-vca-stage-list">
                <li className="visual-vca-stage-group">범용 분석</li>
                {stageChecklist(selectedRun).map((stage) => (
                  <li
                    key={stage.name}
                    className={`visual-vca-stage-item ${stage.status}`}
                  >
                    <span className="visual-vca-stage-name">
                      {STAGE_LABELS[stage.name] || stage.name}
                    </span>
                    <span className="visual-vca-stage-status">
                      {STAGE_STATUS_LABELS[stage.status] || stage.status}
                    </span>
                  </li>
                ))}
                {isPotteryMaterial(workspaceArtifact.material) && (
                  <>
                    <li className="visual-vca-stage-group">도자기 특화 분석</li>
                    {POTTERY_STAGE_ORDER.map((name) => {
                      const status = potteryStageStatus(
                        report?.potteryInspectionStatus,
                        working,
                      );
                      return (
                        <li
                          key={name}
                          className={`visual-vca-stage-item ${status}`}
                        >
                          <span className="visual-vca-stage-name">
                            {POTTERY_STAGE_LABELS[name]}
                          </span>
                          <span className="visual-vca-stage-status">
                            {STAGE_STATUS_LABELS[status]}
                          </span>
                        </li>
                      );
                    })}
                  </>
                )}
              </ol>
              <dl className="visual-vca-status-meta">
                <div>
                  <dt>접수 시간</dt>
                  <dd>
                    {selectedRun
                      ? formatDate(selectedRun.createdAt)
                      : "대기 중"}
                  </dd>
                </div>
                <div>
                  <dt>이미지 수</dt>
                  <dd>{selectedRun?.imageCount || uploadedImages.length}장</dd>
                </div>
                <div>
                  <dt>완료 시간</dt>
                  <dd>
                    {selectedRun?.completedAt
                      ? formatDate(selectedRun.completedAt)
                      : "미완료"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="visual-vca-status-actions">
              {runIsActive ? (
                <button
                  type="button"
                  className="visual-primary-button"
                  onClick={cancelRun}
                  disabled={working === "cancel"}
                >
                  {working === "cancel" ? "중지 중" : "분석 중지"}
                </button>
              ) : artifact.resumableRunId ? (
                <>
                  <button
                    type="button"
                    className="visual-primary-button"
                    onClick={() => startRun({ resume: true })}
                    disabled={!canStartRun}
                  >
                    {runRequestPending ? "분석 접수 중" : "이어서 분석 시작"}
                  </button>
                  <button
                    type="button"
                    className="visual-secondary-button"
                    onClick={() => startRun({ resume: false })}
                    disabled={!canStartRun}
                  >
                    {runRequestPending ? "분석 접수 중" : "새로 분석 시작"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="visual-primary-button"
                  onClick={() => startRun()}
                  disabled={!canStartRun}
                >
                  {runRequestPending ? "분석 접수 중" : "분석 시작"}
                </button>
              )}
            </div>
          </aside>
        </div>

        {notice && (
          <p className="visual-notice" role="status" aria-live="polite">
            {notice}
          </p>
        )}
        {completionError && (
          <p className="visual-notice visual-notice--error" role="alert">
            {completionError}
          </p>
        )}

        {/* STEP 03: 조사 보고서 - main의 result-layout(result-card + review-card) 틀 재사용 */}
        <div className="visual-result-layout">
          <section
            className="result-card"
            aria-labelledby="visual-report-title"
          >
            <div className="visual-section-heading">
              <div>
                <span>조사 보고서</span>
                <h2 id="visual-report-title">AI 분석 결과</h2>
              </div>
              {selectedRun && (
                <span className="review-badge">
                  {statusLabel(selectedRun.status)}
                </span>
              )}
            </div>
            {report ? (
              <VisualReport
                artifactId={artifactId}
                runId={reportRunId}
                report={report}
                pdfJob={pdfJob}
                working={working}
                onPdfJob={handlePdfJob}
              />
            ) : (
              <p className="status-note">
                {selectedRun?.status === "COMPLETED"
                  ? "완료된 분석 보고서를 불러오고 있습니다. 잠시 후 자동으로 표시됩니다."
                  : selectedRun
                    ? "분석이 완료되면 보고서가 자동으로 표시됩니다."
                    : "이미지를 등록하고 분석을 시작하면 보고서를 불러올 수 있습니다."}
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
              <li>특이점 위치·문양명은 AI 1차 판단이며 조사자 검토 필요</li>
              <li>등록 시대와 AI 재분석이 다르면 재확인 권장</li>
              <li>등록 사진 기준으로 뒷면·내부 결손은 확인 불가</li>
            </ul>
          </aside>
        </div>

        <footer className="complete-area">
          <p>
            보고서를 확인한 뒤 완료하면 현재 유물의 육안 조사 상태가 저장됩니다.
          </p>
          <button
            type="button"
            className="complete-btn"
            onClick={handleComplete}
            disabled={!canComplete}
          >
            육안 조사 완료
          </button>
        </footer>
      </div>
      <SystemInfoFooter />
    </main>
  );
}
