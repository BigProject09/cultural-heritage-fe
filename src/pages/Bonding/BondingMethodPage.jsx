import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./BondingMethodPage.css";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

function BondingMethodPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const { taskId, bondingGuide, setCompleted, setStepSaving } = ctx;

  const { steps: bondingSteps = [], method_type: methodType } =
    bondingGuide || {};

  const [steps, setSteps] = useState(
    bondingSteps.map((step) => ({
      ...step,
      approved: false,
    })),
  );

  const handleCheckAll = () => {
    setSteps((prev) => prev.map((s) => ({ ...s, approved: true })));
  };

  const handleDelete = (stepId) => {
    const isDelete = window.confirm("이 단계를 삭제하시겠습니까?");

    if (!isDelete) return;

    setSteps((prev) => prev.filter((step) => step.id !== stepId));
  };

  const handleAddStep = () => {
    const title = window.prompt("단계명을 입력하세요.");

    if (!title || title.trim() === "") return;

    const description = window.prompt("단계 설명을 입력하세요.");

    if (!description || description.trim() === "") return;

    setSteps((prev) => [
      ...prev,

      {
        id: `bonding-step-${Date.now()}`,
        order: prev.length + 1,
        label: title,
        caution: description,
        approved: false,
      },
    ]);
  };

  const handleEdit = (stepId) => {
    const step = steps.find((s) => s.id === stepId);

    if (!step) return;

    const title = window.prompt("단계명을 수정하세요.", step.label);

    const description = window.prompt("단계 설명을 수정하세요.", step.caution);

    if (!title || !description) return;

    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              label: title,
              caution: description,
            }
          : s,
      ),
    );
  };

  const handleComplete = () => {
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

    setStepSaving("bondingMethod", true);
    navigate("/bonding");

    (async () => {
      try {
        const result = await resumeTask(taskId, {
          resume: {
            completed_step_ids: completedStepIds,
          },
        });

        applyInterrupt(result.interrupt, ctx);

        setCompleted((prev) => ({
          ...prev,

          bondingMethod: true,
        }));
      } catch (error) {
        console.error(error);

        alert("접합 단계 저장 실패");
      } finally {
        setStepSaving("bondingMethod", false);
      }
    })();
  };

  return (
    <div className="method-page">
      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/bonding")}>
          ← 이전
        </button>

        <h1 className="vora-logo">VORA</h1>

        <div className="nav-btn-group">
          <button className="nav-btn secondary" onClick={handleCheckAll}>
            전체 선택
          </button>

          <button className="nav-btn" onClick={handleComplete}>
            완료
          </button>
        </div>
      </div>

      <div className="page-header">
        <h1>접합</h1>
      </div>

      <div className="method-card">
        <div className="step-title">
          <span>
            추천
            {methodType && <span className="method-badge">{methodType}</span>}
          </span>
        </div>

        {steps.map((step, index) => (
          <div key={step.id} className="step-card">
            <div className="step-number">{index + 1}</div>

            <div className="step-info">
              <h3>{step.label}</h3>

              <p>
                <strong>주의사항</strong>

                <br />

                {step.caution}
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
                        : s,
                    ),
                  );
                }}
              >
                {step.approved ? "✔ 완료됨" : "완료"}
              </button>

              <button className="edit-btn" onClick={() => handleEdit(step.id)}>
                ✏ 수정
              </button>

              <button
                className="delete-btn"
                onClick={() => handleDelete(step.id)}
              >
                🗑 삭제
              </button>
            </div>
          </div>
        ))}

        <button className="add-step-btn" onClick={handleAddStep}>
          + 단계 추가
        </button>
      </div>
    </div>
  );
}

export default BondingMethodPage;
