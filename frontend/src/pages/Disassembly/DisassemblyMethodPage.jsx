import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DisassemblyMethodPage.css";
import { useDisassembly } from "../../context/DisassemblyContext";

function DisassemblyMethodPage() {
  const navigate = useNavigate();

const {
  taskId,
  methods,
  completed,
  setCompleted,
} = useDisassembly();

const { steps: methodSteps = [], overall_caution = "" } = methods;

  const [steps, setSteps] = useState(
    methodSteps.map((step) => ({
      ...step,
      approved: false,
    }))
  );

  const [showWarning, setShowWarning] = useState(false);

  // 단계 삭제
const handleDelete = (stepId) => {
  const isDelete = window.confirm(
    "이 단계를 삭제하시겠습니까?"
  );

  if (!isDelete) return;

  setSteps((prev) =>
    prev.filter((step) => step.id !== stepId)
  );
};

// 단계 추가
const handleAddStep = () => {
  const title = window.prompt("단계명을 입력하세요.");

  if (!title || title.trim() === "") return;

  const description = window.prompt("단계 설명을 입력하세요.");

  if (!description || description.trim() === "") return;

  setSteps((prev) => [
    ...prev,
   {
    id: `step-${Date.now()}`,
    order: prev.length + 1,
    label: title,
    tools_used: [],
    caution: description,
    approved: false,
  },
  ]);
  };

  // 단계 수정
const handleEdit = (stepId) => {
  const step = steps.find((s) => s.id === stepId);

  if (!step) return;

  const title = window.prompt(
    "단계명을 수정하세요.",
    step.label
  );

  if (!title || title.trim() === "") return;

  const description = window.prompt(
    "단계 설명을 수정하세요.",
    step.caution
  );

  if (!description || description.trim() === "") return;

  setSteps((prev) =>
    prev.map((s) =>
      s.id === stepId
        ? {
            ...s,
           label: title,
           caution: description,
          }
        : s
    )
  );
};

  const handleComplete = async () => {
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }
    const completedStepIds = steps
      .filter((step) => step.approved)
      .map((step) => step.id);

    if (completedStepIds.length === 0) {
      alert("최소 1개의 단계를 승인해주세요.");
      return;
    }

    const request = {
      resume: {
        completed_step_ids: completedStepIds,
      },
    };

    console.log(request);

    try {
      const response = await axios.post(
        `http://localhost:8080/tasks/${taskId}/resume`,
        request
      );

      console.log(response.data);

      setCompleted({
        ...completed,
        method: true,
      });

      navigate("/disassembly-post");
    } catch (error) {
      console.error(error);
      alert("해체 방법 저장 실패");
    }
  };

  return (
    <div className="method-page">
      {/* 상단 */}
      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() => navigate("/disassembly")}
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
        <h1>AI 해체 방법 추천</h1>
        <p>AI가 분석한 최적의 해체 방법입니다.</p>
      </div>

      {/* 메인 카드 */}
      <div className="method-card">

        {/* 추천 이유 */}
       <div className="reason-card">
          <h3>주의사항</h3>
          <p>{overall_caution}</p>
        </div>
        {/* 추천 해체 방법 */}
        <div className="step-title">
          <span>추천 해체 방법</span>

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

             <p>{overall_caution}</p>

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
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="step-card"
          >
            <div className="step-number">
              {index + 1}
            </div>

            <div className="step-info">
              <h3>{step.label}</h3>

              <p>
                <strong>사용 도구</strong><br />
                {step.tools_used.join(", ")}
              </p>

              <p>
                <strong>주의사항</strong><br />
                {step.caution}
              </p>
            </div>
            <div className="step-actions">

           <button
              className="edit-btn"
              onClick={() => handleEdit(step.id)}
            >
              ✏ 수정
            </button>
              
              <button
                className="delete-btn"
                onClick={() => handleDelete(step.id)}
              >
                🗑 삭제
              </button>

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
                  ? "✔ 승인됨"
                  : "✔ 승인"}
              </button>
            </div>
          </div>
        ))}

       <button
      className="add-step-btn"
      onClick={handleAddStep}
    >
      + 단계 추가
    </button>
      </div>
    </div>
  );
}

export default DisassemblyMethodPage;