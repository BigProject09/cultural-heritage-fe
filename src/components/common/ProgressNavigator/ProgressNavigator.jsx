import "./ProgressNavigator.css";
import {
  DEFAULT_GUIDE_FLOW,
  sanitizeGuideFlow,
} from "../../../data/flowData";

function ProgressNavigator({ approvedFlow, currentStep }) {
  const selectedSteps = sanitizeGuideFlow(approvedFlow);
  const steps = selectedSteps.length > 0 ? selectedSteps : DEFAULT_GUIDE_FLOW;
  const currentIndex = steps.findIndex((step) => step.name === currentStep);

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
    </aside>
  );
}

export default ProgressNavigator;
