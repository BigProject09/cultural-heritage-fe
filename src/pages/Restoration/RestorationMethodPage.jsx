import { useState } from "react";
import { useNavigate } from "react-router-dom";

import GuideNavigation from "../../components/guide/GuideNavigation";
import "./RestorationMethodPage.css";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

function RestorationMethodPage({
  title = "복원",
  guideField = "restorationGuide",
  completedKey = "restorationMethod",
  backPath = "/restoration",
}) {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const { taskId, setCompleted, setStepSaving, savingSteps } = ctx;

  const isSaving = savingSteps.has(completedKey);

  const { steps: restorationSteps = [], overall_caution: overallCaution } =
    ctx[guideField] || {};

  const [steps, setSteps] = useState(
    restorationSteps.map((step) => ({
      ...step,
      approved: false,
    })),
  );

  const handleCheckAll = () => {
    setSteps((prev) => prev.map((s) => ({ ...s, approved: true })));
  };

  // 단계 삭제
  const handleDelete = (stepId) => {
    const isDelete = window.confirm("이 단계를 삭제하시겠습니까?");

    if (!isDelete) return;

    setSteps((prev) => prev.filter((step) => step.id !== stepId));
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
        id: `restoration-step-${Date.now()}`,
        order: prev.length + 1,
        label: title,
        caution: description,
        approved: false,
      },
    ]);
  };

  // 단계 수정
  const handleEdit = (stepId) => {
    const step = steps.find((s) => s.id === stepId);

    if (!step) return;

    const title = window.prompt("단계명을 수정하세요.", step.label);

    if (!title || title.trim() === "") return;

    const description = window.prompt("단계 설명을 수정하세요.", step.caution);

    if (!description || description.trim() === "") return;

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

  const handleComplete = async () => {
    if (isSaving) return;
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

    setStepSaving(completedKey, true);

    try {
        const result = await resumeTask(taskId, {
          resume: {
            completed_step_ids: completedStepIds,
          },
        });

        applyInterrupt(result.interrupt, ctx);

        setCompleted((prev) => ({
          ...prev,

          [completedKey]: true,
        }));

      navigate(backPath);
    } catch (error) {
        console.error(error);

        alert(`${title} 단계 저장 실패`);
    } finally {
        setStepSaving(completedKey, false);
    }
  };

  return (
    <div className="method-page">
      <GuideNavigation currentLabel={title} />

      {/* 상단 */}

      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate(backPath)}>
          ← 이전
        </button>
        <div className="nav-btn-group">
          <button className="nav-btn secondary" disabled={isSaving} onClick={handleCheckAll}>
            전체 선택
          </button>

          <button
            className="nav-btn"
            disabled={isSaving}
            onClick={handleComplete}
          >
            {isSaving ? "완료 처리 중..." : "완료"}
          </button>
        </div>
      </div>

      {/* 제목 */}

      <div className="page-header">
        <h1>{title}</h1>
      </div>

      {/* 주의사항 */}
      {overallCaution && (
        <div className="overall-caution">
          <strong>주의사항</strong>
          <p>{overallCaution}</p>
        </div>
      )}

      <div className="method-card">
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
                className={`approve-btn ${step.approved ? "is-complete" : "is-incomplete"}`}
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
                {step.approved ? "✓ 완료" : "미완료"}
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

export default RestorationMethodPage;
