import "./ProgressNavigator.css";
import { useNavigate } from "react-router-dom";
import { flowRoutes } from "../../../data/flowData";

function ProgressNavigator({ approvedFlow, currentStep }) {
  const navigate = useNavigate();

  // 기본 공정
  const defaultFlow = [
    { id: 1, name: "처리 전 조사" },
    { id: 2, name: "해체" },
    { id: 3, name: "세척" },
    { id: 4, name: "강화 처리" },
    { id: 5, name: "접합" },
    { id: 6, name: "복원" },
    { id: 7, name: "색 맞춤" },
    { id: 8, name: "처리 후 기록" },
  ];

  // AI Flow가 있으면 사용, 없으면 기본 Flow 사용
  const steps =
    approvedFlow && approvedFlow.length > 0
      ? approvedFlow
      : defaultFlow;

  const handleStepClick = (step) => {
    const path = flowRoutes[step.name];

    if (!path) return;

    navigate(path, {
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