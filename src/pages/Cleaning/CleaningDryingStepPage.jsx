import { resumeTask } from "../../services/conservationGuideApi";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GuideNavigation from "../../components/guide/GuideNavigation";
import "./CleaningDryingStepPage.css";
import { useDisassembly } from "../../context/useDisassembly";
import { applyInterrupt } from "../../utils/applyInterrupt";

function CleaningDryingStepPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const { taskId, setCompleted, setStepSaving, savingSteps, dryingGuide } = ctx;

  const isSaving = savingSteps.has("cleaningDryingStep");

  const [steps, setSteps] = useState(() =>
    (dryingGuide?.steps ?? []).map((step) => ({
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
    const completedStepIds = steps
      .filter((step) => step.approved)
      .map((step) => step.id);

    if (completedStepIds.length === 0) {
      alert("최소 1개의 단계를 완료해주세요.");
      return;
    }

    setStepSaving("cleaningDryingStep", true);

    try {
        const response = await resumeTask(taskId, {
          resume: {
            completed_step_ids: completedStepIds,
          },
        });

        applyInterrupt(response.interrupt, ctx);

        setCompleted((prev) => ({
          ...prev,
          cleaningDryingStep: true,
        }));

      navigate("/cleaning");
    } catch (error) {
        console.error(error);
        alert("건조 단계 저장 실패");
    } finally {
        setStepSaving("cleaningDryingStep", false);
    }
  };

  return (
    <div className="method-page">
      <GuideNavigation currentLabel="건조" />

      {/* 상단 */}
      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/cleaning")}>
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
        <h1>건조</h1>
      </div>

      {/* 주의사항 */}
      {dryingGuide?.overall_caution && (
        <div className="overall-caution">
          <strong>주의사항</strong>
          <p>{dryingGuide.overall_caution}</p>
        </div>
      )}

      {/* 메인 카드 */}
      <div className="method-card">
        {/* 단계 목록 */}
        {steps?.map((step, index) => (
          <div key={step.id} className="step-card">
            <div className="step-number">{index + 1}</div>

            <div className="step-info">
              <h3>{step.label || step.title}</h3>

              <p>{step.caution || step.description}</p>
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
      </div>
    </div>
  );
}

export default CleaningDryingStepPage;
