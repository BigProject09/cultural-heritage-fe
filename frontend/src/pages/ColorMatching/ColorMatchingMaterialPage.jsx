import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./ColorMatchingMaterialPage.css";

function ColorMatchingMaterialPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      colorMatchingMaterial: true,
    }));

    navigate(-1);
  };

  return (
    <div className="method-page">
      <div className="method-container">

        <h1>색 맞춤 재료 선택</h1>

        <div className="content-box">
          <h2>AI 추천 재료</h2>

          <p>
            • AI가 분석한 결과를 바탕으로 적합한 안료와 재료를 추천합니다.
          </p>

          <p>
            • 유물의 재질과 기존 색상에 맞는 재료를 선택합니다.
          </p>

          <p>
            • 선택한 재료의 특성과 사용 시 주의사항을 확인합니다.
          </p>
        </div>

        <button
          className="complete-btn"
          onClick={handleComplete}
        >
          선택 완료
        </button>

      </div>
    </div>
  );
}

export default ColorMatchingMaterialPage;