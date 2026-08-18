import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDisassembly } from "../../context/useDisassembly";
import { sanitizeGuideFlow } from "../../data/flowData";
import ModulePageHeader from "../../components/common/ModulePageHeader/ModulePageHeader";
import { getArtifactRoute } from "../../utils/artifactRoutes";
import { getLatestTaskByArtifact } from "../../services/conservationGuideApi";
import { restoreGuideTaskContext } from "../../utils/guideTaskRecovery";

import "./GuideResultPage.css";
import "./FlowRecommendationPage.css";

function StepList({ steps }) {
  if (!steps?.length)
    return <p className="guide-result-modal-empty">기록된 절차가 없습니다.</p>;

  return (
    <ol className="guide-result-modal-steps">
      {steps.map((step) => (
        <li key={step.id || step.order}>
          <strong>{step.label}</strong>
          {step.tools_used?.length > 0 && (
            <span className="guide-result-modal-tools">
              사용: {step.tools_used.join(", ")}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

// 작업 후 기록(메모/사진)을 보여주는 공통 상세 내용.
function postRecordDetail(record) {
  if (!record || (!record.memo && !record.photos?.length)) return null;

  return (
    <>
      {record.memo && <p>{record.memo}</p>}
      {record.photos?.length > 0 && (
        <ul className="guide-result-modal-list">
          {record.photos.map((url) => (
            <li key={url}>{url}</li>
          ))}
        </ul>
      )}
    </>
  );
}

// 단계 이름 -> 이 단계 안의 세부 단계 목록(실제 페이지 제목, 완료 여부,
// 클릭 시 보여줄 상세 내용)을 만드는 함수.
// ctx는 useDisassembly()가 반환하는 DisassemblyContext 전체.
function buildStageDetails(name, ctx) {
  switch (name) {
    case "해체":
      return [
        {
          label: "해체 전 조사",
          done: ctx.completed?.checklist,
          detail: (
            <ul className="guide-result-modal-list">
              {(ctx.checklist ?? []).map((item) => (
                <li
                  key={item.id}
                  className={
                    ctx.checklistSelection?.includes(item.id) ? "checked" : ""
                  }
                >
                  {ctx.checklistSelection?.includes(item.id) ? "✓" : "○"}{" "}
                  {item.label}
                </li>
              ))}
            </ul>
          ),
        },
        {
          label: "해체 도구 선택",
          done: ctx.completed?.tool,
          detail: ctx.selectedTools?.length > 0 && (
            <ul className="guide-result-modal-list">
              {ctx.selectedTools.map((toolName) => (
                <li key={toolName} className="checked">
                  {toolName}
                </li>
              ))}
            </ul>
          ),
        },
        {
          label: "해체",
          done: ctx.completed?.method,
          detail: <StepList steps={ctx.disassemblyMethod?.steps} />,
        },
        {
          label: "작업 후 기록",
          done: ctx.completed?.post,
          detail: postRecordDetail(ctx.postRecords?.disassembly),
        },
      ];
    case "세척":
      return [
        {
          label: "세척법 선택",
          done: ctx.completed?.cleaningMethod,
          detail: (
            <>
              {ctx.cleaningMethod?.ai_analysis?.relic_condition_summary && (
                <p>{ctx.cleaningMethod.ai_analysis.relic_condition_summary}</p>
              )}
              {ctx.cleaningMethod?.ai_analysis?.contamination_summary && (
                <p>{ctx.cleaningMethod.ai_analysis.contamination_summary}</p>
              )}
              {ctx.cleaningMethod?.ai_analysis?.reason && (
                <p>{ctx.cleaningMethod.ai_analysis.reason}</p>
              )}
            </>
          ),
        },
        {
          label: "세척",
          done: ctx.completed?.cleaningStep,
          detail: <StepList steps={ctx.cleaningGuide?.steps} />,
        },
        {
          label: "건조",
          done: ctx.completed?.cleaningDryingStep,
          detail: <StepList steps={ctx.dryingGuide?.steps} />,
        },
        {
          label: "작업 후 기록",
          done: ctx.completed?.cleaningPost,
          detail: postRecordDetail(ctx.postRecords?.cleaning),
        },
      ];
    case "강화":
      return [
        {
          label: "강화제",
          done: ctx.completed?.strengtheningMaterial,
          detail: ctx.strengtheningRecommendation?.reason && (
            <p>{ctx.strengtheningRecommendation.reason}</p>
          ),
        },
        {
          label: "습윤 효과 테스트",
          done: ctx.completed?.strengtheningWetting,
          detail: ctx.colorChangeAnalysis && (
            <ul className="guide-result-modal-list">
              {[
                ["색조 변화", ctx.colorChangeAnalysis.hue_shift],
                ["명도 변화", ctx.colorChangeAnalysis.brightness_change],
                ["채도 변화", ctx.colorChangeAnalysis.saturation_change],
                ["광택 변화", ctx.colorChangeAnalysis.gloss_change],
                ["백화 현상", ctx.colorChangeAnalysis.blanching],
              ].map(
                ([label, metric]) =>
                  metric && (
                    <li key={label}>
                      <strong>{label}</strong> ({metric.severity}):{" "}
                      {metric.description}
                    </li>
                  ),
              )}
            </ul>
          ),
        },
        {
          label: "강화",
          done: ctx.completed?.strengtheningMethod,
          detail: <StepList steps={ctx.strengtheningGuide?.steps} />,
        },
        {
          label: "작업 후 기록",
          done: ctx.completed?.strengtheningPost,
          detail: postRecordDetail(ctx.postRecords?.strengthening),
        },
      ];
    case "접합":
      return [
        {
          label: "접합제",
          done: ctx.completed?.bondingMaterial,
          detail: ctx.bondingAdhesive?.reason && (
            <p>{ctx.bondingAdhesive.reason}</p>
          ),
        },
        {
          label: "임시접합 검증",
          done: ctx.completed?.bondingWork,
          detail: ctx.bondingTempAnalysis?.description && (
            <p>{ctx.bondingTempAnalysis.description}</p>
          ),
        },
        {
          label: "접합",
          done: ctx.completed?.bondingMethod,
          detail: <StepList steps={ctx.bondingGuide?.steps} />,
        },
        {
          label: "작업 후 기록",
          done: ctx.completed?.bondingPost,
          detail: postRecordDetail(ctx.postRecords?.bonding),
        },
      ];
    case "복원":
      return [
        {
          label: "복원제",
          done: ctx.completed?.restorationMaterial,
          detail: ctx.restorationMaterial?.reason && (
            <p style={{ whiteSpace: "pre-line" }}>
              {ctx.restorationMaterial.reason}
            </p>
          ),
        },
        {
          label: "복원",
          done: ctx.completed?.restorationMethod,
          detail: <StepList steps={ctx.restorationGuide?.steps} />,
        },
        {
          label: "마감처리",
          done: ctx.completed?.restorationFinishing,
          detail: <StepList steps={ctx.restorationFinishingGuide?.steps} />,
        },
        {
          label: "작업 후 기록",
          done: ctx.completed?.restorationPost,
          detail: postRecordDetail(ctx.postRecords?.restoration),
        },
      ];
    default:
      return [];
  }
}

function GuideResultPage() {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);

  const ctx = useDisassembly();
  const { taskId, approvedFlow } = ctx;

  const [activeDetail, setActiveDetail] = useState(null);
  const [recovering, setRecovering] = useState(true);
  const [recoveryError, setRecoveryError] = useState("");

  useEffect(() => {
    if (!artifactId || (taskId && approvedFlow?.length)) return undefined;

    let cancelled = false;

    getLatestTaskByArtifact(artifactId)
      .then((task) => {
        if (cancelled || !task) return;
        restoreGuideTaskContext(task, artifactId, ctx);
      })
      .catch((error) => {
        if (!cancelled)
          setRecoveryError(
            error.message || "복원 가이드 결과를 불러오지 못했습니다.",
          );
      })
      .finally(() => {
        if (!cancelled) setRecovering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artifactId, taskId, approvedFlow?.length, ctx]);

  const guideFlow = sanitizeGuideFlow(approvedFlow);
  const hasSessionData = Boolean(taskId) && guideFlow.length > 0;

  return (
    <div className="flow-page guide-result-page">
      <div className="guide-container">
        <ModulePageHeader
          artifactId={artifactId}
          currentLabel="복원 가이드 결과"
          eyebrow="INDEPENDENT GUIDE MODULE"
          title="복원 가이드 결과"
          description="진행한 보존처리 단계와 세부 단계별 선택값을 순서대로 확인합니다."
          tone="bronze"
        />
      </div>

      <div className="guide-result-container">
        {recovering ? (
          <div className="guide-result-notice">
            <strong>저장된 복원 가이드 결과를 불러오는 중입니다.</strong>
          </div>
        ) : hasSessionData ? (
          <div className="guide-result-flow">
            {guideFlow.map((step, index) => {
              const details = buildStageDetails(step.name, ctx).filter(
                (detail) => detail.label !== "작업 후 기록" || detail.done,
              );

              return (
                <div className="flow-step guide-result-step" key={step.id}>
                  <section className="guide-result-card">
                    <div className="guide-result-card-header">
                      <h2>{step.name}</h2>
                    </div>

                    <ul className="guide-result-substeps">
                      {details.map((detail) => {
                        const clickable = Boolean(detail.detail);

                        return (
                          <li key={detail.label}>
                            <span
                              className={`guide-result-substep-mark ${
                                detail.done ? "done" : ""
                              }`}
                              aria-hidden="true"
                            >
                              {detail.done ? "✓" : ""}
                            </span>
                            <button
                              type="button"
                              className={`guide-result-substep-body ${
                                clickable ? "clickable" : ""
                              }`}
                              disabled={!clickable}
                              onClick={() =>
                                setActiveDetail({
                                  stage: step.name,
                                  label: detail.label,
                                  body: detail.detail,
                                })
                              }
                            >
                              <span className="guide-result-substep-label">
                                {detail.label}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>

                  {index !== guideFlow.length - 1 && (
                    <div className="arrow">↓</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="guide-result-notice">
            <strong>저장된 복원 가이드 결과를 찾지 못했습니다.</strong>
            <p>
              {recoveryError ||
                "이 유물에 완료된 복원 가이드 작업이 있는지 확인한 뒤 워크스페이스에서 다시 진입해주세요."}
            </p>
          </div>
        )}
      </div>

      <div className="guide-result-actions">
        <div>
          <strong>복원 가이드 작업이 완료되었습니다.</strong>
          <span>
            유물 워크스페이스로 돌아가 다른 분석 결과를 확인하거나 최종 보고서를
            진행할 수 있습니다.
          </span>
        </div>
        <button
          type="button"
          className="guide-result-workspace-button"
          onClick={() => navigate(getArtifactRoute(artifactId))}
        >
          유물 워크스페이스로 돌아가기
        </button>
      </div>

      {activeDetail && (
        <div
          className="guide-result-modal-backdrop"
          role="presentation"
          onMouseDown={() => setActiveDetail(null)}
        >
          <div
            className="guide-result-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="guide-result-modal-close"
              onClick={() => setActiveDetail(null)}
              aria-label="닫기"
            >
              ×
            </button>
            <span className="guide-result-modal-stage">
              {activeDetail.stage}
            </span>
            <h3>{activeDetail.label}</h3>
            <div className="guide-result-modal-body">{activeDetail.body}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuideResultPage;
