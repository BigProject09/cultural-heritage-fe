import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./RestorationMaterialPage.css";

function RestorationMaterialPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      restorationMaterial: true,
    }));

    navigate(-1);
  };

  return (
    <div className="method-page">
      <div className="method-container">

        <h1>복원 재료 선택</h1>

        <div className="content-box">
          <h2>AI 추천 재료</h2>

          <p>
            • 유물의 재질과 손상 상태에 적합한 복원 재료를 추천합니다.
          </p>

          <p>
            • 사용 가능한 접착제와 충전재를 비교하여 제공합니다.
          </p>

          <p>
            • 복원 후 안정성과 보존성을 고려한 재료를 안내합니다.
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

export default RestorationMaterialPage;