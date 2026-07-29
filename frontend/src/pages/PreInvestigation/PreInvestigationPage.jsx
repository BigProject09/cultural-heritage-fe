import "./PreInvestigationPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import { useDisassembly } from "../../context/DisassemblyContext";
import { moveToNextStep } from "../../utils/flowNavigation";
function PreInvestigationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { preInvestigation } = useDisassembly();

  const approvedFlow = location.state?.approvedFlow || [
    { id: 1, name: "처리 전 조사" },
    { id: 2, name: "세척" },
    { id: 3, name: "강화 처리" },
    { id: 4, name: "접합" },
    { id: 5, name: "복원" },
    { id: 6, name: "처리 후 기록" },
  ];

  const artifact = JSON.parse(localStorage.getItem("artifactInfo"));

  const handlePrevious = () => {
    navigate("/flow-recommendation");
  };

  const handleNext = () => {
    if (!preInvestigation.xray || !preInvestigation.visual) {
      alert("처리 전 조사를 먼저 완료하세요.");
      return;
    }

    moveToNextStep(navigate, approvedFlow, "처리 전 조사");
  };

  const handleXray = () => {
    navigate("/pre-investigation/xray", {
      state: {
        approvedFlow,
      },
    });
  };

  const handleVisual = () => {
    navigate("/pre-investigation/visual", {
      state: {
        approvedFlow,
      },
    });
  };

  return (
    <div className="pre-page">
      {/* 진행 단계 */}
      <ProgressNavigator
        approvedFlow={approvedFlow}
        currentStep="처리 전 조사"
      />

      {/* 이전 / 다음 */}
      <div className="navigation">
        <button className="nav-btn" onClick={handlePrevious}>
          ← 이전
        </button>

        <button className="nav-btn" onClick={handleNext}>
          다음 →
        </button>
      </div>

      {/* 본문 */}
      <div className="content">
        {/* 기본 정보 */}
        <section className="info-card">
          <h2>기본 정보</h2>

          <div className="info-grid">
            <div className="info-item">
              <span>유물명</span>
              <p>{artifact.name}</p>
            </div>

            <div className="info-item">
              <span>재질</span>
              <p>{artifact.material}</p>
            </div>

            <div className="info-item">
              <span>크기</span>
              <p>
                가로 {artifact?.width || "-"}cm · 세로 {artifact?.height || "-"}
                cm · 높이 {artifact?.depth || "-"}cm
              </p>
            </div>

            <div className="info-item">
              <span>출토 위치</span>
              <p>-</p>
            </div>

            <div className="info-item">
              <span>토양 정보</span>
              <p>
                pH {artifact?.soilPH || "-"} · Cl- {artifact?.soilCL || "-"}
              </p>
            </div>

            <div className="info-item">
              <span>측정 장비</span>
              <p>{artifact?.device || "-"}</p>
            </div>
          </div>
        </section>

        {/* 분석 영역 */}
        <section className="analysis-card">
          <button
            className={`analysis-btn ${preInvestigation.xray ? "completed" : ""}`}
            onClick={handleXray}
          >
            <div className="icon">{preInvestigation.xray ? "✅" : "🩻"}</div>

            <h3>{preInvestigation.xray ? "X-RAY 분석 완료" : "X-RAY 분석"}</h3>

            <p>
              {preInvestigation.xray
                ? "AI 분석을 완료했습니다."
                : "내부 균열 및 손상 분석"}
            </p>
          </button>

          <button
            className={`analysis-btn ${
              preInvestigation.visual ? "completed" : ""
            }`}
            onClick={handleVisual}
          >
            <div className="icon">{preInvestigation.visual ? "✅" : "🔍"}</div>

            <h3>
              {preInvestigation.visual
                ? "육안 상태 조사 완료"
                : "육안 상태 조사"}
            </h3>

            <p>
              {preInvestigation.visual
                ? "AI 분석을 완료했습니다."
                : "표면 손상 및 오염 조사"}
            </p>
          </button>
        </section>
      </div>
    </div>
  );
}

export default PreInvestigationPage;
