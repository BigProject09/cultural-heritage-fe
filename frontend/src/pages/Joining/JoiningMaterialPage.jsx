import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./JoiningMaterialPage.css";

function JoiningMaterialPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      joiningMaterial: true,
    }));

    navigate("/joining");
  };

  return (
    <div className="joining-material-page">

      <div className="detail-header">

        <button
          className="nav-btn"
          onClick={() => navigate("/joining")}
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
          <h1>🧪 AI 추천 접합제</h1>

          <p>
            AI가 유물 재질과 파손 상태를 분석하여 적합한 접합제를 추천했습니다.
          </p>
        </div>

        <div className="info-card">

          <h2>AI 추천 결과</h2>

          <div className="info-item">
            <strong>추천 접합제</strong>
            <span>Paraloid B72 ⭐</span>
          </div>

          <div className="info-item">
            <strong>희석 방법</strong>
            <span>아세톤 희석 후 사용</span>
          </div>

          <div className="info-item">
            <strong>추천 이유</strong>

            <p>
              접착력이 우수하고 안정성이 높으며, 재처리가 가능한 접합제입니다.
            </p>

          </div>

        </div>

        <div className="info-card">

          <h2>사용 가능한 접합제</h2>

          <ul>
            <li>✔ Paraloid B72 (추천)</li>
            <li>✔ Epoxy Resin</li>
            <li>✔ Acrylic Resin</li>
            <li>✔ Cellulose Adhesive</li>
          </ul>

        </div>

        <div className="warning-box">

          <strong>주의사항</strong>

          <p>
            접합제는 필요한 양만 사용하며,
            외부로 흘러나오지 않도록 주의합니다.
          </p>

        </div>

      </div>

    </div>
  );
}

export default JoiningMaterialPage;