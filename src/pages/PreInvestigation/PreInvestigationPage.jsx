import "./PreInvestigationPage.css";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import { useDisassembly } from "../../context/useDisassembly";
import { moveToNextStep } from "../../utils/flowNavigation";
function PreInvestigationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    preInvestigation,
    approvedFlow: savedApprovedFlow,
    setApprovedFlow,
  } = useDisassembly();

  // location.state는 하위 페이지(X-ray/육안조사)를 오가며 유실될 수 있어,
  // context에 저장해둔 값을 우선 쓰고 없을 때만 기본 플로우로 대체한다.
  const approvedFlow = location.state?.approvedFlow ||
    savedApprovedFlow || [
      { id: 1, name: "처리 전 조사" },
      { id: 2, name: "해체" },
      { id: 3, name: "세척" },
      { id: 4, name: "강화" },
      { id: 5, name: "접합" },
      { id: 6, name: "복원" },
      { id: 8, name: "처리 후 기록" },
    ];

  useEffect(() => {
    if (location.state?.approvedFlow) {
      setApprovedFlow(location.state.approvedFlow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const artifact = JSON.parse(localStorage.getItem("artifactInfo"));

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
      {/* 다음 (Flow가 이미 시작돼서 이전 단계로 되돌아갈 수 없음) */}
      <div className="navigation">
        <button className="top-bar-logo" onClick={() => navigate("/")}>
          VORA
        </button>

        <button className="nav-btn" onClick={handleNext}>
          다음 →
        </button>
      </div>

      <div className="page-layout">
        {/* 진행 단계 (처리 전 조사 → 해체 → 세척 → ... 이동 바) */}
        <ProgressNavigator
          approvedFlow={approvedFlow}
          currentStep="처리 전 조사"
        />

        <div className="page-main">
          {/* 본문 */}
          <div className="content">
            {/* 기본 정보 */}
            <section className="info-card">
              <div className="info-card-header">
                <h2>유물 정보</h2>

                <button
                  className="edit-btn"
                  onClick={() =>
                    navigate("/artifact-register", {
                      state: { editMode: true },
                    })
                  }
                >
                  ✏ 수정
                </button>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <span>유물명</span>
                  <p>{artifact?.name || "-"}</p>
                </div>

                <div className="info-item">
                  <span>재질</span>
                  <p>{artifact?.material || "-"}</p>
                </div>

                <div className="info-item">
                  <span>시대</span>
                  <p>{artifact?.period || "-"}</p>
                </div>

                <div className="info-item">
                  <span>상태</span>
                  <p>{artifact?.condition || "-"}</p>
                </div>

                <div className="info-item">
                  <span>무게</span>
                  <p>{artifact?.weight || "-"}</p>
                </div>

                <div className="info-item">
                  <span>접합 부위</span>
                  <p>{artifact?.bondingArea || "-"}</p>
                </div>

                <div className="info-item">
                  <span>처리 목적</span>
                  <p>{artifact?.treatmentPurpose || "-"}</p>
                </div>
              </div>
            </section>

            {/* 분석 영역 */}
            <section className="analysis-card">
              <button
                className={`analysis-btn ${preInvestigation.xray ? "completed" : ""}`}
                onClick={handleXray}
              >
                <div className="icon">
                  {preInvestigation.xray ? "✅" : "🩻"}
                </div>

                <h3>
                  {preInvestigation.xray ? "X-RAY 분석 완료" : "X-RAY 분석"}
                </h3>

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
                <div className="icon">
                  {preInvestigation.visual ? "✅" : "🔍"}
                </div>

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
      </div>
    </div>
  );
}

export default PreInvestigationPage;
