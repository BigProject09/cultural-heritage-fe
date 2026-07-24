import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./StrengtheningMethodPage.css";

function StrengtheningMethodPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      strengtheningMethod: true,
    }));

    navigate("/strengthening");
  };

  return (
    <div className="strengthening-method-page">

      {/* 상단 */}
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

      <div className="method-container">

        <div className="page-header">
          <h1>🧪 AI 추천 강화 방법</h1>

          <p>
            AI가 유물의 재질과 손상 상태를 분석하여
            가장 적합한 강화 처리 방법을 추천했습니다.
          </p>
        </div>

        {/* AI 추천 */}
        <div className="info-card">

          <h2>AI 추천 결과</h2>

          <div className="info-item">
            <strong>추천 강화 부위</strong>
            <span>유약층 손상 부위</span>
          </div>

          <div className="info-item">
            <strong>추천 방법</strong>
            <span>분무법</span>
          </div>

          <div className="info-item">
            <strong>보조 방법</strong>
            <span>침지법</span>
          </div>

          <div className="info-item">
            <strong>추천 이유</strong>

            <p>
              손상 범위가 국소적이며 유약층의 안정성이 요구되어
              분무법을 우선 권장합니다.
              손상이 넓은 경우에는 침지법을 함께 사용할 수 있습니다.
            </p>

          </div>

        </div>

        {/* 강화 처리 부위 */}
        <div className="info-card">

          <h2>강화 처리 부위 확인</h2>

          <ul>
            <li>✔ 유약층 손상 부위</li>
            <li>✔ 문양 손상 부위</li>
            <li>✔ 균열이 진행되는 영역</li>
          </ul>

          <div className="warning-box">
            <strong>주의사항</strong>

            <p>
              형태 유지가 어려운 부위에만
              선택적으로 강화 처리를 진행합니다.
            </p>
          </div>

        </div>

        {/* 강화 처리 방법 */}
        <div className="info-card">

          <h2>강화 처리 방법</h2>

          <ul>
            <li>✔ 분무법 (AI 추천)</li>
            <li>✔ 침지법</li>
          </ul>

          <div className="warning-box">
            <strong>AI 분석 결과</strong>

            <p>
              현재 유물은 손상이 국소적으로 발생하여
              분무법이 가장 적합한 방법으로 분석되었습니다.
            </p>
          </div>

        </div>

        {/* 주의사항 */}
        <div className="info-card">

          <h2>강화 처리 시 주의사항</h2>

          <ul>
            <li>✔ 침투성이 우수한 강화제를 사용합니다.</li>
            <li>✔ 환경 변화에 안정적인 강화제를 선택합니다.</li>
            <li>✔ 처리 후 색상 변화를 반드시 확인합니다.</li>
            <li>✔ 표면에 강화제가 남지 않도록 작업합니다.</li>
            <li>✔ 강화 후 상온에서 2일 이상 자연 건조합니다.</li>
          </ul>

        </div>

      </div>

    </div>
  );
}

export default StrengtheningMethodPage;