import "./VisualPage.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useDisassembly } from "../../context/useDisassembly";

function VisualPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const approvedFlow = location.state?.approvedFlow || [];

  const { setPreInvestigation } = useDisassembly();

  const handleComplete = () => {
    setPreInvestigation((prev) => ({
      ...prev,
      visual: true,
    }));

    navigate("/pre-investigation", {
      state: {
        approvedFlow,
      },
    });
  };

  return (
    <div className="visual-page">
      <div className="visual-container">
        <h1 className="visual-title">🔍 육안 상태 조사</h1>

        <div className="result-card">
          <h2>AI 분석 결과</h2>

          <div className="result-item">
            <span className="result-label">표면 균열</span>
            <span className="result-value">경미</span>
          </div>

          <div className="result-item">
            <span className="result-label">오염도</span>
            <span className="result-value">보통</span>
          </div>

          <div className="result-item">
            <span className="result-label">결손 여부</span>
            <span className="result-value">없음</span>
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

export default VisualPage;