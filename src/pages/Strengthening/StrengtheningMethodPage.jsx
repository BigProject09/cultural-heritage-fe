import { useState } from "react";
import { useNavigate } from "react-router-dom";

import GuideNavigation from "../../components/guide/GuideNavigation";
import "./StrengtheningMethodPage.css";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";
import { useGuideStepLock } from "../../hooks/useGuideStepLock";

function StrengtheningMethodPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const { taskId, strengtheningGuide, setCompleted, setStepSaving } = ctx;

  const { isCompleted, isSaving, isLocked } = useGuideStepLock("strengtheningMethod");

  const {
    steps: strengtheningSteps = [],
    method_type: methodType,
    overall_caution: overallCaution,
  } = strengtheningGuide || {};

  const [steps, setSteps] = useState(
    strengtheningSteps.map((step) => ({
      ...step,
      approved: false,
    })),
  );

  const isAllSelected =
    steps.length > 0 && steps.every((step) => step.approved);

  const handleCheckAll = () => {
    if (isLocked) return;
    setSteps((prev) =>
      prev.map((step) => ({ ...step, approved: !isAllSelected })),
    );
  };

  // 삭제
  const handleDelete = (stepId) => {
    if (isLocked) return;
    const confirmDelete = window.confirm("이 단계를 삭제하시겠습니까?");

    if (!confirmDelete) return;

    setSteps((prev) => prev.filter((step) => step.id !== stepId));
  };

  // 추가
  const handleAddStep = () => {
    if (isLocked) return;
    const title = window.prompt("단계명을 입력하세요.");

    if (!title || title.trim() === "") return;

    const caution = window.prompt("단계 설명을 입력하세요.");

    if (!caution || caution.trim() === "") return;

    setSteps((prev) => [
      ...prev,

      {
        id: `strengthening-step-${Date.now()}`,
        order: prev.length + 1,
        label: title,
        caution,
        approved: false,
      },
    ]);
  };

  // 수정
  const handleEdit = (stepId) => {
    if (isLocked) return;
    const step = steps.find((s) => s.id === stepId);

    if (!step) return;

    const title = window.prompt("단계명을 수정하세요.", step.label);

    if (!title) return;

    const caution = window.prompt("주의사항을 수정하세요.", step.caution);

    if (!caution) return;

    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              label: title,
              caution,
            }
          : s,
      ),
    );
  };

  const handleComplete = async () => {
    if (isLocked) return;
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

    setStepSaving("strengtheningMethod", true);

    try {
        const result = await resumeTask(taskId, {
          resume: {
            completed_step_ids: completedStepIds,
          },
        });

        applyInterrupt(result.interrupt, ctx);

        setCompleted((prev) => ({
          ...prev,

          strengtheningMethod: true,
        }));

      navigate("/strengthening");
    } catch (error) {
        console.error(error);

        alert("강화 단계 저장 실패");
    } finally {
        setStepSaving("strengtheningMethod", false);
    }
  };

  return (
    <div className="method-page">
      <GuideNavigation currentLabel="강화 방법" />

      {/* 상단 */}

      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/strengthening")}>
          ← 이전
        </button>
        <div className="nav-btn-group">
          <button className="nav-btn secondary" disabled={isLocked} onClick={handleCheckAll}>
            {isAllSelected ? "전체 해제" : "전체 선택"}
          </button>

          <button
            className="nav-btn"
            disabled={isLocked}
            onClick={handleComplete}
          >
            {isSaving ? "완료 처리 중..." : isCompleted ? "완료됨" : "완료"}
          </button>
        </div>
      </div>

      {/* 제목 */}

      <div className="page-header">
        <h1>강화</h1>
      </div>

      {/* 주의사항 */}
      {overallCaution && (
        <div className="overall-caution">
          <strong>주의사항</strong>
          <p>{overallCaution}</p>
        </div>
      )}

      <div className="method-card">
        <div className="step-title">
          <span>
            {methodType && (
              <span
                className={`method-badge ${
                  methodType === "침지법" ? "immersion" : "spray"
                }`}
              >
                {methodType}
              </span>
            )}
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

            {!isCompleted && <div className="step-actions">
              <button
                disabled={isLocked}
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

              <button className="edit-btn" disabled={isLocked} onClick={() => handleEdit(step.id)}>
                ✏ 수정
              </button>

              <button
                className="delete-btn"
                disabled={isLocked}
                onClick={() => handleDelete(step.id)}
              >
                🗑 삭제
              </button>
            </div>}
          </div>
        ))}

        {!isCompleted && <button className="add-step-btn" disabled={isLocked} onClick={handleAddStep}>
          + 단계 추가
        </button>}
      </div>
    </div>
  );
}

export default StrengtheningMethodPage;
