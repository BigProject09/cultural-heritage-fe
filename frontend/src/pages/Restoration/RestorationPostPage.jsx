import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./RestorationPostPage.css";

function RestorationPostPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      restorationPost: true,
    }));

    navigate(-1);
  };

  return (
    <div className="method-page">
      <div className="method-container">

        <h1>작업 후 기록</h1>

        <div className="content-box">
          <h2>복원 작업 기록</h2>

          <p>
            • 복원 완료 사진을 등록합니다.
          </p>

          <p>
            • 사용한 재료와 작업 내용을 기록합니다.
          </p>

          <p>
            • 특이사항과 추가 보존 관리 사항을 작성합니다.
          </p>
        </div>

        <button
          className="complete-btn"
          onClick={handleComplete}
        >
          기록 완료
        </button>

      </div>
    </div>
  );
}

export default RestorationPostPage;