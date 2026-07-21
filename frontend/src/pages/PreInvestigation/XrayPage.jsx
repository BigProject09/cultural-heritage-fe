import "./XrayPage.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

function XrayPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const approvedFlow = location.state?.approvedFlow || [];

  const { setPreInvestigation } = useDisassembly();

  const handleComplete = () => {
    setPreInvestigation((prev) => ({
      ...prev,
      xray: true,
    }));

    navigate("/pre-investigation", {
      state: {
        approvedFlow,
      },
    });
  };

  return (
  <div className="xray-page">
    <div className="xray-container">
      <h1 className="xray-title">🩻 X-RAY 분석</h1>

      <div className="result-card">
        <h2>AI 분석 결과</h2>

        <div className="result-item">
          <span className="result-label">내부 균열</span>
          <span className="result-value">없음</span>
        </div>

        <div className="result-item">
          <span className="result-label">내부 공극</span>
          <span className="result-value">2개 발견</span>
        </div>

        <div className="result-item">
          <span className="result-label">구조 안정성</span>
          <span className="result-value">양호</span>
        </div>
      </div>

      <div className="complete-area">
        <button className="complete-btn" onClick={handleComplete}>
          완료
        </button>
      </div>
    </div>
  </div>
);
}

export default XrayPage;