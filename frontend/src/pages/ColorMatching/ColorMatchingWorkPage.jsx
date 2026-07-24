import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./ColorMatchingWorkPage.css";

function ColorMatchingWorkPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      colorMatchingWork: true,
    }));

    navigate(-1);
  };

  return (
    <div className="method-page">
      <div className="method-container">

        <h1>색 맞춤 작업 수행</h1>

        <div className="content-box">
          <h2>AI 작업 가이드</h2>

          <p>
            • AI가 추천한 색상과 안료를 사용하여 색 맞춤 작업을 진행합니다.
          </p>

          <p>
            • 원형과의 색상 차이를 최소화하도록 단계적으로 작업합니다.
          </p>

          <p>
            • 작업 완료 후 결과를 확인하고 보정이 필요한 부분을 점검합니다.
          </p>
        </div>

        <button
          className="complete-btn"
          onClick={handleComplete}
        >
          작업 완료
        </button>

      </div>
    </div>
  );
}

export default ColorMatchingWorkPage;