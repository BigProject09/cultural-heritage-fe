import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./RestorationWorkPage.css";

function RestorationWorkPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      restorationWork: true,
    }));

    navigate(-1);
  };

  return (
    <div className="method-page">
      <div className="method-container">

        <h1>복원 작업 수행</h1>

        <div className="content-box">
          <h2>AI 작업 가이드</h2>

          <p>
            • AI가 안내하는 순서에 따라 복원 작업을 진행합니다.
          </p>

          <p>
            • 손상 부위를 단계적으로 복원하고 원형을 최대한 유지합니다.
          </p>

          <p>
            • 작업 중 주의사항과 완료 여부를 확인합니다.
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

export default RestorationWorkPage;