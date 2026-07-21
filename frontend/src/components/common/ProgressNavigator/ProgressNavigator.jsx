import "./ProgressNavigator.css";
import { useNavigate } from "react-router-dom";
import { flowRoutes } from "../../../data/flowData";

function ProgressNavigator({ approvedFlow, currentStep }) {
  const navigate = useNavigate();

  const handleStepClick = (step) => {
    const path = flowRoutes[step.name];

    if (!path) return;

    navigate(path, {
      state: {
        approvedFlow,
      },
    });
  };

  return (
    <div className="progress-wrapper">
      {approvedFlow.map((step, index) => (
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

          {index !== approvedFlow.length - 1 && (
            <div className="progress-line"></div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ProgressNavigator;