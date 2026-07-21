import "./CleaningPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import { useDisassembly } from "../../context/DisassemblyContext";
import { moveToNextStep } from "../../utils/flowNavigation";

function CleaningPage() {
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

  const { cleaning, setCleaning } = useDisassembly();

  const handlePrevious = () => {
    navigate("/pre-investigation", {
      state: {
        approvedFlow,
      },
    });
  };

  const handleNext = () => {
    if (
      !cleaning.mission1 ||
      !cleaning.mission2 ||
      !cleaning.mission3
    ) {
      alert("세척 미션을 모두 완료하세요.");
      return;
    }

    moveToNextStep(
      navigate,
      approvedFlow,
      "세척"
    );
  };

  const completeMission1 = () => {
    setCleaning((prev) => ({
      ...prev,
      mission1: true,
    }));
  };

  const completeMission2 = () => {
    setCleaning((prev) => ({
      ...prev,
      mission2: true,
    }));
  };

  const completeMission3 = () => {
    setCleaning((prev) => ({
      ...prev,
      mission3: true,
    }));
  };

  return (
    <div className="cleaning-page">
      <ProgressNavigator
        approvedFlow={approvedFlow}
        currentStep="세척"
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
        <h1 className="cleaning-title">🧼 세척</h1>

        <section className="mission-card">
          <button
            className={`mission-btn ${
              cleaning.mission1 ? "completed" : ""
            }`}
            onClick={completeMission1}
          >
            <div className="mission-icon">
              {cleaning.mission1 ? "✅" : "①"}
            </div>

            <h3>
              {cleaning.mission1
                ? "AI 추천 세척 방법 확인 완료"
                : "AI 추천 세척 방법 확인"}
            </h3>

            <p>
              AI가 추천한 세척 순서와 주의사항을 확인합니다.
            </p>
          </button>

          <button
            className={`mission-btn ${
              cleaning.mission2 ? "completed" : ""
            }`}
            onClick={completeMission2}
          >
            <div className="mission-icon">
              {cleaning.mission2 ? "✅" : "②"}
            </div>

            <h3>
              {cleaning.mission2
                ? "세척 도구 선택 완료"
                : "세척 도구 선택"}
            </h3>

            <p>
              유물에 적합한 세척 도구를 선택합니다.
            </p>
          </button>

          <button
            className={`mission-btn ${
              cleaning.mission3 ? "completed" : ""
            }`}
            onClick={completeMission3}
          >
            <div className="mission-icon">
              {cleaning.mission3 ? "✅" : "③"}
            </div>

            <h3>
              {cleaning.mission3
                ? "세척 작업 완료"
                : "세척 작업 수행"}
            </h3>

            <p>
              세척 작업을 진행하고 결과를 확인합니다.
            </p>
          </button>
        </section>
      </div>
    </div>
  );
}

export default CleaningPage;