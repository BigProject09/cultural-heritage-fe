import "./FlowRecommendationPage.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function FlowRecommendationPage() {
  const navigate = useNavigate();

  const [steps, setSteps] = useState([
    { id: 1, name: "처리 전 조사", active: true },
    { id: 2, name: "해체", active: false },
    { id: 3, name: "세척", active: true },
    { id: 4, name: "강화 처리", active: true },
    { id: 5, name: "접합", active: true },
    { id: 6, name: "복원", active: true },
    { id: 7, name: "색 맞춤", active: false },
    { id: 8, name: "처리 후 기록", active: true },
  ]);

  const aiFlow = [
    "처리 전 조사",
    "세척",
    "강화 처리",
    "접합",
    "복원",
    "처리 후 기록",
  ];

  const toggleStep = (id) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id
          ? { ...step, active: !step.active }
          : step
      )
    );
  };

  // ⭐ 사용자가 최종 승인한 Flow
  const approvedFlow = steps.filter((step) => step.active);

  // ⭐ 다음 버튼
  const handleNext = () => {
    navigate("/pre-investigation", {
      state: {
        approvedFlow,
      },
    });
  };

  return (
    <div className="flow-page">

      {/* Header */}
      <div className="top-bar">

        <button
          className="nav-btn"
          onClick={() => navigate("/artifact-register")}
        >
          ← 이전
        </button>

        <div
          className="logo"
          onClick={() => navigate("/")}
        >
          VORA
        </div>

        <button
          className="nav-btn"
          onClick={handleNext}
        >
          Flow 결정 →
        </button>

      </div>

      <div className="flow-container">

        {/* Flow 수정 */}
        <div className="flow-box">

          <h2>Flow 수정</h2>

          {steps.map((step, index) => (

            <div
              key={step.id}
              className="flow-step"
            >

              <button
                className={
                  step.active
                    ? "step-btn active"
                    : "step-btn inactive"
                }
                onClick={() => toggleStep(step.id)}
              >
                {step.name}
              </button>

              {index !== steps.length - 1 && (
                <div className="arrow">
                  ↓
                </div>
              )}

            </div>

          ))}

        </div>

        {/* 추천 Flow */}
        <div className="flow-box">

          <h2>추천 Flow</h2>

          {aiFlow.map((step, index) => (

            <div
              key={index}
              className="flow-step"
            >

              <div className="ai-step">

                {step}

              </div>

              {index !== aiFlow.length - 1 && (
                <div className="arrow">
                  ↓
                </div>
              )}

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

export default FlowRecommendationPage;