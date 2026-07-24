import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./JoiningMethodPage.css";

function JoiningMethodPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      joiningMethod: true,
    }));

    navigate("/joining");
  };

  return (
    <div className="joining-method-page">

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

      <div className="method-container">

        <div className="page-header">
          <h1>🤖 AI 추천 접합 방법</h1>

          <p>
            AI가 유물의 파손 상태를 분석하여 가장 적합한 접합 방법을 추천했습니다.
          </p>
        </div>

        <div className="info-card">

          <h2>AI 추천 결과</h2>

          <div className="info-item">
            <strong>추천 방법</strong>
            <span>Paraloid B72를 이용한 접합</span>
          </div>

          <div className="info-item">
            <strong>적용 부위</strong>
            <span>파손 단면 및 균열 부위</span>
          </div>

          <div className="info-item">
            <strong>추천 이유</strong>

            <p>
              안정성이 높고 재처리가 가능하며 도자기 접합에 가장 많이 사용됩니다.
            </p>

          </div>

        </div>

        <div className="info-card">

          <h2>접합 절차</h2>

          <ol>
            <li>파손 단면 세척</li>
            <li>접합제 도포</li>
            <li>위치 맞춤</li>
            <li>고정 및 압착</li>
            <li>충분한 자연 건조</li>
          </ol>

        </div>

        <div className="warning-box">

          <strong>주의사항</strong>

          <p>
            접합제가 외부로 흘러나오지 않도록 하고,
            조각 위치를 정확하게 맞춘 후 충분히 건조합니다.
          </p>

        </div>

      </div>

    </div>
  );
}

export default JoiningMethodPage;