import "./StrengtheningPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import { useDisassembly } from "../../context/DisassemblyContext";
import { moveToNextStep } from "../../utils/flowNavigation";

function StrengtheningPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const approvedFlow =
    location.state?.approvedFlow || [
      { id: 1, name: "처리 전 조사" },
      { id: 2, name: "세척" },
      { id: 3, name: "강화 처리" },
      { id: 4, name: "접합" },
      { id: 5, name: "복원" },
      { id: 6, name: "처리 후 기록" },
    ];

  const { strengthening, setStrengthening } = useDisassembly();

  const handlePrevious = () => {
    navigate("/cleaning", {
      state: {
        approvedFlow,
      },
    });
  };

  const handleNext = () => {
    if (
      !strengthening.mission1 ||
      !strengthening.mission2 ||
      !strengthening.mission3
    ) {
      alert("강화 처리 미션을 모두 완료하세요.");
      return;
    }

    moveToNextStep(
      navigate,
      approvedFlow,
      "강화 처리"
    );
  };

  const completeMission1 = () => {
    setStrengthening((prev) => ({
      ...prev,
      mission1: true,
    }));
  };

  const completeMission2 = () => {
    setStrengthening((prev) => ({
      ...prev,
      mission2: true,
    }));
  };

  const completeMission3 = () => {
    setStrengthening((prev) => ({
      ...prev,
      mission3: true,
    }));
  };

  return (
    <div className="cleaning-page">
      <ProgressNavigator
        approvedFlow={approvedFlow}
        currentStep="강화 처리"
      />

      <div className="navigation">
        <button className="nav-btn" onClick={handlePrevious}>
          ← 이전
        </button>

        <button className="nav-btn" onClick={handleNext}>
          다음 →
        </button>
      </div>

      <div className="cleaning-container">
        <h1 className="cleaning-title">🧪 강화 처리</h1>

        <section className="mission-card">

          <button
            className={`mission-btn ${
              strengthening.mission1 ? "completed" : ""
            }`}
            onClick={completeMission1}
          >
            <div className="mission-icon">
              {strengthening.mission1 ? "✅" : "①"}
            </div>

            <h3>
              {strengthening.mission1
                ? "AI 추천 강화 방법 확인 완료"
                : "AI 추천 강화 방법 확인"}
            </h3>

            <p>
              AI가 유물 재질에 적합한 강화 방법을 추천합니다.
            </p>
          </button>

          <button
            className={`mission-btn ${
              strengthening.mission2 ? "completed" : ""
            }`}
            onClick={completeMission2}
          >
            <div className="mission-icon">
              {strengthening.mission2 ? "✅" : "②"}
            </div>

            <h3>
              {strengthening.mission2
                ? "강화제 선택 완료"
                : "강화제 선택"}
            </h3>

            <p>
              AI가 추천한 강화제를 확인하고 적용합니다.
            </p>
          </button>

          <button
            className={`mission-btn ${
              strengthening.mission3 ? "completed" : ""
            }`}
            onClick={completeMission3}
          >
            <div className="mission-icon">
              {strengthening.mission3 ? "✅" : "③"}
            </div>

            <h3>
              {strengthening.mission3
                ? "강화 처리 완료"
                : "강화 처리 수행"}
            </h3>

            <p>
              강화 처리를 수행하고 결과를 확인합니다.
            </p>
          </button>

        </section>
      </div>
    </div>
  );
}

export default StrengtheningPage;