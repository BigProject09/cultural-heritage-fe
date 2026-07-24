import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./CleaningDryingStepPage.css";

function CleaningDryingStepPage() {
  const navigate = useNavigate();

  const {
    taskId,
    setCompleted,
  } = useDisassembly();

  const handleComplete = async () => {
    const request = {
      resume: {
        completed_step_ids: [],
      },
    };

    try {
      const response = await axios.post(
        `http://localhost:8080/tasks/${taskId}/resume`,
        request
      );

      console.log("✅ 백엔드 응답:", response.data);

      setCompleted((prev) => ({
        ...prev,
        cleaningDryingStep: true,
      }));

      navigate("/cleaning-post");
    } catch (error) {
      console.error("❌ 에러:", error);
      alert("건조 단계 저장 실패");
    }
  };

  return (
    <div className="cleaning-drying-step-page">
      <div className="detail-header">
        <button
          className="nav-btn"
          onClick={() => navigate("/cleaning-step")}
        >
          ← 이전
        </button>

        <h1 className="vora-logo">VORA</h1>

        <button
          className="nav-btn"
          onClick={handleComplete}
        >
          완료
        </button>
      </div>

      <div className="work-container">
        <div className="page-header">
          <h1>🌬️ 건조 작업</h1>
          <p>AI가 추천한 건조 절차를 진행합니다.</p>
        </div>

        <div className="info-card">
          <h2>건조 절차</h2>
          <p>
            세척이 완료된 유물을 통풍이 잘 되는 환경에서 자연 건조합니다.
            직사광선과 고온 환경은 피하고 충분히 건조된 후 다음 작업을 진행합니다.
          </p>
        </div>

        <div className="warning-box">
          <strong>⚠ 주의사항</strong>

          <ul>
            <li>직사광선을 피합니다.</li>
            <li>강한 열풍을 사용하지 않습니다.</li>
            <li>완전히 건조될 때까지 이동을 최소화합니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default CleaningDryingStepPage;