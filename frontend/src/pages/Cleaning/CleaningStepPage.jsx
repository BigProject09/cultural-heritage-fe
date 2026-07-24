import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./CleaningStepPage.css";

function CleaningStepPage() {
  const navigate = useNavigate();
 const {
    taskId,
    setCompleted,
  } = useDisassembly();

  const handleComplete = async () => {
  const request = {
    resume: {
      completed_step_ids: selectedStepIds
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
      cleaningStep: true,
    }));

    navigate("/cleaning-drying-step");
  } catch (error) {
    console.error("❌ 에러:", error);
    alert("세척 단계 저장 실패");
  }
};

  return (
    <div className="cleaning-step-page">
      <div className="detail-header">
        <button
          className="nav-btn"
          onClick={() => navigate("/cleaning")}
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
          <h1>🧼 세척 작업 수행</h1>
          <p>
            AI가 추천한 절차에 따라 세척 작업을 진행합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>1단계. 표면 먼지 제거</h2>

          <p>
            부드러운 붓을 이용하여 표면의 먼지와 작은 이물질을 제거합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>2단계. 국소 오염 제거</h2>

          <p>
            면봉에 세척제를 소량 묻혀 오염 부위를 부드럽게 닦아냅니다.
          </p>
        </div>

        <div className="info-card">
          <h2>3단계. 고착 오염 제거</h2>

          <p>
            제거되지 않는 오염은 대나무 스틱을 이용하여
            최소한의 힘으로 제거합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>4단계. 건조</h2>

          <p>
            세척 후 자연 건조하며,
            직사광선과 고온 환경은 피합니다.
          </p>
        </div>

        <div className="warning-box">
          <strong>⚠ 작업 시 주의사항</strong>

          <ul>
            <li>유물 표면을 강하게 문지르지 않습니다.</li>
            <li>균열 부위에는 힘을 가하지 않습니다.</li>
            <li>세척제는 필요한 만큼만 사용합니다.</li>
            <li>이상 발견 시 즉시 작업을 중단합니다.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default CleaningStepPage;