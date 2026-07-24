import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./ColorMatchingMethodPage.css";

function ColorMatchingMethodPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      colorMatchingMethod: true,
    }));

    navigate(-1);
  };

  return (
    <div className="method-page">
      <div className="method-container">

        <h1>AI 추천 색 맞춤 방법 확인</h1>

        <div className="content-box">
          <h2>AI 추천 결과</h2>

          <p>
            • AI가 원래 유물의 색상과 가장 유사한 색상을 분석하여 추천합니다.
          </p>

          <p>
            • 원형을 최대한 유지할 수 있는 색 맞춤 방법을 안내합니다.
          </p>

          <p>
            • 작업 시 주의사항과 예상 결과를 제공합니다.
          </p>
        </div>

        <button
          className="complete-btn"
          onClick={handleComplete}
        >
          확인 완료
        </button>

      </div>
    </div>
  );
}

export default ColorMatchingMethodPage;