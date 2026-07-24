import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./StrengtheningMaterialPage.css";

function StrengtheningMaterialPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      strengtheningMaterial: true,
    }));

    navigate("/strengthening");
  };

  return (
    <div className="strengthening-material-page">

      <div className="detail-header">

        <button
          className="nav-btn"
          onClick={() => navigate("/strengthening")}
        >
          ← 이전
        </button>

        <h1 className="vora-logo">
          VORA
        </h1>

        <button
          className="nav-btn"
          onClick={handleComplete}
        >
          완료
        </button>

      </div>

      <div className="material-container">

        <div className="page-header">
          <h1>🧪 AI 추천 강화제</h1>

          <p>
            AI가 유물의 재질과 손상 상태를 분석하여 적합한 강화제를 추천했습니다.
          </p>
        </div>

        <div className="info-card">

          <h2>AI 추천 결과</h2>

          <div className="info-item">
            <strong>추천 강화제</strong>
            <span>Paraloid B72 ⭐</span>
          </div>

          <div className="info-item">
            <strong>희석 방법</strong>
            <span>아세톤 희석 후 사용</span>
          </div>

          <div className="info-item">
            <strong>추천 이유</strong>

            <p>
              침투성이 우수하고 도자기 강화 처리에 가장 많이 사용되는 강화제입니다.
            </p>

          </div>

        </div>

        <div className="info-card">

          <h2>사용 가능한 강화제</h2>

          <ul>
            <li>✔ Paraloid B72 (추천)</li>
            <li>✔ HPC</li>
            <li>✔ 폴리비닐부티랄</li>
            <li>✔ 수용성 Emulsion</li>
          </ul>

        </div>

        <div className="warning-box">

          <strong>주의사항</strong>

          <p>
            강화제는 유물 표면에 과도하게 남지 않도록 사용하며,
            사용 후 충분히 자연 건조합니다.
          </p>

        </div>

      </div>

    </div>
  );
}

export default StrengtheningMaterialPage;