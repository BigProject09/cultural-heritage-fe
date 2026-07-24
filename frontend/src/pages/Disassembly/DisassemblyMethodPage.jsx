import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DisassemblyMethodPage.css";
import { useDisassembly } from "../../context/DisassemblyContext";

function DisassemblyMethodPage() {
  const navigate = useNavigate();

  const {
    taskId,
    completed,
    setCompleted,
  } = useDisassembly();

  // 임시 데이터 (나중에 API 연결)
  const method = {
    name: "침지법",
    score: 73,
    summary: "유물 전체에 접착제가 균일하게 분포되어 있음",
    reasons: [
      "전체 해체 필요",
      "접착제 열화 확인",
      "손상 최소화",
    ],
    cautions: [
      "용제 과다 사용 금지",
      "환기 필수",
      "균열 부위 압력 금지",
    ],
    steps: [
      {
        id: "disassembly-method-01",
        order: 1,
        title: "유물 상태 확인",
        description: "해체 전 유물의 상태를 다시 한번 확인합니다.",
      },
      {
        id: "disassembly-method-02",
        order: 2,
        title: "용액 준비",
        description: "침지에 사용할 용액을 준비합니다.",
      },
      {
        id: "disassembly-method-03",
        order: 3,
        title: "침지 및 해체",
        description: "유물을 용액에 침지하여 접착제를 분해합니다.",
      },
    ],
  };

  const [steps, setSteps] = useState(
    method.steps.map((step) => ({
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
      title,
      description,
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
    step.title
  );

  if (!title || title.trim() === "") return;

  const description = window.prompt(
    "단계 설명을 수정하세요.",
    step.description
  );

  if (!description || description.trim() === "") return;

  setSteps((prev) =>
    prev.map((s) =>
      s.id === stepId
        ? {
            ...s,
            title,
            description,
          }
        : s
    )
  );
};

  const handleComplete = async () => {
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

      navigate("/disassembly");
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
        {/* 상단 영역 */}
        <div className="method-top">
          {/* 추천도 */}
          <div className="score-area">
            <div
              className="score-circle"
              style={{
                background: `conic-gradient(
                  #1976d2 ${method.score * 3.6}deg,
                  #E8EEF8 0deg
                )`,
              }}
            >
              <div className="score-inner">
                <div className="method-name">
                  {method.name}
                </div>

                <div className="score">
                  {method.score}%
                </div>
              </div>
            </div>
          </div>

          {/* AI 요약 */}
          <div className="summary-card">
            <h2>추천도 {method.score}%</h2>
            <p>{method.summary}</p>
          </div>
        </div>

        {/* 추천 이유 */}
        <div className="reason-card">
          <h3>추천 이유</h3>

          <ul>
            {method.reasons.map((reason) => (
              <li key={reason}>✔ {reason}</li>
            ))}
          </ul>
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

              <ul>
                {method.cautions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
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
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="step-card"
          >
            <div className="step-number">
              {index + 1}
            </div>

            <div className="step-info">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
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