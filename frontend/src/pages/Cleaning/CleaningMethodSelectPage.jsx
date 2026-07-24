import axios from "axios";
import { useNavigate } from "react-router-dom";

import { useDisassembly } from "../../context/DisassemblyContext";

import "./CleaningMethodSelectPage.css";
import { useEffect, useState } from "react";

function CleaningMethodSelectPage() {
  const navigate = useNavigate();

const {
  taskId,
  setCompleted,
} = useDisassembly();

  const [cleaningMethod, setCleaningMethod] = useState(null);
  
  useEffect(() => {
  axios
    .get("http://localhost:3001/cleaningMethod")
    .then((res) => {
      setCleaningMethod(res.data);
    })
    .catch((err) => {
      console.error("데이터 불러오기 실패:", err);
    });
}, []);

  const handleComplete = async () => {
  const request = {
    resume: {
      use_physical: true,
      use_chemical: true,
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
    cleaningMethod: true,
  }));

  navigate("/cleaning-step");

} catch (error) {
  console.error("❌ 에러:", error);
  alert("세척 방법 저장 실패");
}
};

if (!cleaningMethod) {
  return <div>불러오는 중...</div>;
}


  return (
    <div className="cleaning-method-page">
      <div className="detail-header">
        <button
          className="nav-btn"
          onClick={() => navigate("/cleaning")}
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

      <div className="method-container">
        <div className="page-header">
          <h1>🧼 AI 추천 세척 방법</h1>

          <p>
            AI가 유물의 재질과 손상 상태를 분석하여
            적합한 세척 방법과 작업 절차를 추천합니다.
          </p>
        </div>

        <div className="info-card">
          <h2>추천 세척 방법</h2>

          <div className="info-item">
            <strong>세척 방식</strong>
            <span>{cleaningMethod.method}</span>
          </div>

          <div className="info-item">
            <strong>적용 대상</strong>
            <span>{cleaningMethod.target}</span>
          </div>

          <div className="info-item">
            <strong>추천 이유</strong>

            <p>{cleaningMethod.reason}</p>

          </div>
        </div>

        <div className="info-card">
          <h2>세척 작업 절차</h2>

          <ol>
            {cleaningMethod.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="warning-box">
          <strong>⚠ 작업 시 주의사항</strong>

         <p>{cleaningMethod.warning}</p>
        </div>
      </div>
    </div>
  );
}

export default CleaningMethodSelectPage;
