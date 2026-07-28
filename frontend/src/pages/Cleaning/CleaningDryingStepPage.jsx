import { resumeTask } from "../../services/conservationGuideApi";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CleaningDryingStepPage.css";
import { useDisassembly } from "../../context/DisassemblyContext";

function CleaningDryingStepPage() {
  const navigate = useNavigate();

  const {
  taskId,
  setCompleted,
  dryingGuide,
} = useDisassembly();


  const [steps, setSteps] = useState([]);

  useEffect(() => {
    if (dryingGuide) {
      setSteps(
        (dryingGuide.steps ?? []).map((step) => ({
          ...step,
          approved: false,
        }))
      );
    }
 }, [dryingGuide]);

  const [showWarning, setShowWarning] = useState(false);
  const handleComplete = async () => {
    const completedStepIds = steps
      .filter((step) => step.approved)
      .map((step) => step.id);

    if (completedStepIds.length === 0) {
      alert("최소 1개의 단계를 완료해주세요.");
      return;
    }

    const request = {
      resume: {
        completed_step_ids: completedStepIds,
      },
    };

    console.log(request);

    try {
    const response = await resumeTask(taskId, request);

      console.log(response);

      setCompleted((prev) => ({
        ...prev,
        cleaningDryingStep: true,
      }));

      navigate("/cleaning");

    } catch (error) {
      console.error(error);
      alert("건조 단계 저장 실패");
    }
  };

  return (
    <div className="method-page">
      {/* 상단 */}
      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() => navigate("/cleaning")}
        >
          ← 이전
        </button>

        <div className="logo">VORA</div>

        <button
          className="nav-btn"
          onClick={handleComplete}
        >
          완료
        </button>
      </div>

      {/* 제목 */}
      <div className="page-header">
        <h1>AI 건조 단계별 작업</h1>
        <p>AI가 추천한 건조 작업입니다.</p>
      </div>

      {/* 메인 카드 */}
      <div className="method-card">
        {/* 상단 영역 */}
        <div className="method-top">

          {/* AI 요약 */}
          <div className="summary-card">
            <h2>AI 요약</h2>
           <p>
  {dryingGuide?.summary || "AI 건조 단계 정보를 불러오는 중입니다."}
</p>
          </div>
        </div>

        {/* 추천 이유 */}
        <div className="reason-card">
          <h3>추천 이유</h3>

          <ul>
            {dryingGuide?.reasons?.map((reason) => (
              <li key={reason}>✔ {reason}</li>
            ))}
          </ul>
        </div>

        {/* 추천 건조 방법 */}
        <div className="step-title">
          <span>추천 건조 방법</span>

          <button
            className="warning-btn"
            onClick={() => setShowWarning(true)}
          >
            ⚠ 주의사항
          </button>
        </div>

        {/* 주의사항 모달 */}
        {showWarning && (
          <div className="warning-modal">
            <div className="warning-content">
              <h2>⚠ 주의사항</h2>

              <ul>
              <li>
                {dryingGuide?.overall_caution || "주의사항 정보 없음"}
              </li>
              </ul>

              <button
                className="close-btn"
                onClick={() => setShowWarning(false)}
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 단계 목록 */}
        {steps?.map((step, index) => (
          <div
            key={step.id}
            className="step-card"
          >
            <div className="step-number">
              {index + 1}
            </div>

            <div className="step-info">
              <h3>
                {step.label || step.title}
              </h3>

              <p>
                {step.caution || step.description}
              </p>
            </div>
            <div className="step-actions">
              
              <button
                className="approve-btn"
                onClick={() => {
                  setSteps((prev) =>
                    prev.map((s) =>
                      s.id === step.id
                        ? {
                            ...s,
                            approved: !s.approved,
                          }
                        : s
                    )
                  );
                }}
              >
                {step.approved
                  ? "✔ 완료"
                  : "완료"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CleaningDryingStepPage;