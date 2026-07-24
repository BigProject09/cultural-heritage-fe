import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./ColorMatchingPostPage.css";

function ColorMatchingPostPage() {
  const navigate = useNavigate();

  const { setCompleted } = useDisassembly();

  const handleComplete = () => {
    setCompleted((prev) => ({
      ...prev,
      colorMatchingPost: true,
    }));

    navigate(-1);
  };

  return (
    <div className="method-page">
      <div className="method-container">

        <h1>작업 후 기록</h1>

        <div className="content-box">
          <h2>색 맞춤 작업 기록</h2>

          <p>
            • 색 맞춤 완료 사진을 등록합니다.
          </p>

          <p>
            • 사용한 안료와 재료, 작업 내용을 기록합니다.
          </p>

          <p>
            • 색상 보정 결과와 특이사항을 작성합니다.
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

export default ColorMatchingPostPage;