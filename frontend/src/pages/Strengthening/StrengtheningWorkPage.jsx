import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./StrengtheningWorkPage.css";

function StrengtheningWorkPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      strengtheningWork: true,
    }));

    navigate("/strengthening");
  };

  return (
    <div className="strengthening-work-page">

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

      <div className="work-container">

        <div className="page-header">
          <h1>🧪 강화 처리 수행</h1>

          <p>
            AI가 추천한 강화 처리 절차를 안내합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>1단계. 강화 부위 확인</h2>

          <p>
            유약층 손상 부위와 균열 부위를 확인하고
            강화 처리 범위를 지정합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>2단계. 강화제 희석</h2>

          <p>
            Paraloid B72를 아세톤에 희석하여
            작업 준비를 완료합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>3단계. 강화 처리</h2>

          <p>
            AI 추천 결과에 따라
            분무법 또는 침지법으로 강화제를 도포합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>4단계. 자연 건조</h2>

          <p>
            처리 후 상온에서 2일 이상
            충분히 자연 건조합니다.
          </p>
        </div>

        <div className="warning-box">

          <strong>⚠ 작업 시 주의사항</strong>

          <ul>
            <li>환경 변화에 안정적인 강화제를 사용합니다.</li>
            <li>강화제가 표면에 남지 않도록 합니다.</li>
            <li>처리 후 색상 변화를 확인합니다.</li>
            <li>급격한 건조는 피합니다.</li>
          </ul>

        </div>

      </div>

    </div>
  );
}

export default StrengtheningWorkPage;