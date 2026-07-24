import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./JoiningWorkPage.css";

function JoiningWorkPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      joiningWork: true,
    }));

    navigate("/joining");
  };

  return (
    <div className="joining-work-page">

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

      <div className="work-container">

        <div className="page-header">
          <h1>🛠️ 접합 작업 수행</h1>

          <p>
            AI가 추천한 접합 절차를 따라 작업을 진행합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>1단계. 파손면 확인</h2>

          <p>
            파손 단면을 확인하고 이물질을 제거합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>2단계. 접합제 도포</h2>

          <p>
            AI가 추천한 접합제를 필요한 양만 도포합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>3단계. 위치 맞춤</h2>

          <p>
            파손 조각의 위치를 정확하게 맞춘 후 압착합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>4단계. 자연 건조</h2>

          <p>
            접합이 완료될 때까지 충분히 자연 건조합니다.
          </p>
        </div>

        <div className="warning-box">

          <strong>⚠ 작업 시 주의사항</strong>

          <ul>
            <li>접합제는 과도하게 사용하지 않습니다.</li>
            <li>조각 위치를 정확하게 맞춥니다.</li>
            <li>압착 중 움직이지 않도록 고정합니다.</li>
            <li>완전히 건조될 때까지 충격을 주지 않습니다.</li>
          </ul>

        </div>

      </div>

    </div>
  );
}

export default JoiningWorkPage;