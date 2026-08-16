import { useNavigate, useParams } from "react-router-dom";
import "./ProgressNavigator.css";
import {
  DEFAULT_GUIDE_FLOW,
  sanitizeGuideFlow,
} from "../../../data/flowData";
import { useDisassembly } from "../../../context/useDisassembly";
import { getArtifactModuleRoute } from "../../../utils/artifactRoutes";

function ProgressNavigator({ approvedFlow, currentStep }) {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);
  const { resetGuideWorkflow } = useDisassembly();

  const selectedSteps = sanitizeGuideFlow(approvedFlow);
  const steps = selectedSteps.length > 0 ? selectedSteps : DEFAULT_GUIDE_FLOW;
  const currentIndex = steps.findIndex((step) => step.name === currentStep);

  const handleRestartGuide = () => {
    const confirmed = window.confirm(
      "보존처리 단계를 다시 선택하시겠습니까?\n\n현재 진행 중인 복원가이드 상태만 초기화됩니다. 유물 정보와 X-Ray·육안조사 결과는 유지됩니다.",
    );

    if (!confirmed) return;

    resetGuideWorkflow();
    navigate(getArtifactModuleRoute(artifactId, "guide"), {
      replace: true,
      state: { reselectFlow: selectedSteps },
    });
  };

  return (
    <aside className="progress-wrapper" aria-label="복원 가이드 진행도">
      <div className="progress-guide-copy">
        <strong>작업 진행도</strong>
        <span>단계 이동은 각 화면의 이전·다음 버튼을 이용해주세요.</span>
      </div>

      <div className="progress-steps">
        {steps.map((step, index) => {
          const status =
            index < currentIndex
              ? "completed"
              : index === currentIndex
                ? "current"
                : "upcoming";

          const statusText =
            status === "completed"
              ? "완료"
              : status === "current"
                ? "현재 단계"
                : "현재 단계 완료 후 진행 가능";

          return (
            <div
              key={step.id}
              className={`progress-item ${status}`}
              aria-current={status === "current" ? "step" : undefined}
              title={statusText}
            >
              <div className="progress-circle" aria-hidden="true">
                {status === "completed" ? "✓" : index + 1}
              </div>

              <div className="progress-item-copy">
                <span className="progress-title">{step.name}</span>
                <small className="progress-status">{statusText}</small>
              </div>

              {index !== steps.length - 1 && <div className="progress-line" />}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="progress-restart-btn"
        onClick={handleRestartGuide}
      >
        ↻ 보존처리 단계 다시 선택
      </button>
      <p className="progress-restart-copy">
        가이드만 다시 시작하며 유물·X-Ray·육안조사 데이터는 유지됩니다.
      </p>
    </aside>
  );
}

export default ProgressNavigator;
