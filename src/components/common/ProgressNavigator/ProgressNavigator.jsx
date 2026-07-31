import "./ProgressNavigator.css";
import { useNavigate, useParams } from "react-router-dom";
import {
  DEFAULT_GUIDE_FLOW,
  flowRoutes,
  sanitizeGuideFlow,
} from "../../../data/flowData";
import { getActiveArtifactId } from "../../../data/workspaceProjects";
import { getArtifactWorkflowRoute } from "../../../utils/artifactRoutes";

function ProgressNavigator({ approvedFlow, currentStep }) {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId } = useParams();
  const artifactId = routeArtifactId
    ? decodeURIComponent(routeArtifactId)
    : getActiveArtifactId();

  // AI Flow가 있으면 사용, 없으면 기본 Flow 사용
  const selectedSteps = sanitizeGuideFlow(approvedFlow);
  const steps =
    selectedSteps.length > 0 ? selectedSteps : DEFAULT_GUIDE_FLOW;

  const handleStepClick = (step) => {
    const stepKey = flowRoutes[step.name];

    if (!stepKey) return;

    navigate(getArtifactWorkflowRoute(artifactId, stepKey), {
      state: {
        approvedFlow: steps,
      },
    });
  };

  return (
    <div className="progress-wrapper">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className="progress-item"
          onClick={() => handleStepClick(step)}
        >
          <div
            className={`progress-circle ${
              currentStep === step.name ? "active" : ""
            }`}
          >
            {index + 1}
          </div>

          <span
            className={`progress-title ${
              currentStep === step.name ? "active" : ""
            }`}
          >
            {step.name}
          </span>

          {index !== steps.length - 1 && (
            <div className="progress-line"></div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ProgressNavigator;
