import { useState } from "react";
import { resumeTask } from "../../services/conservationGuideApi";
import { useNavigate } from "react-router-dom";

import { useDisassembly } from "../../context/useDisassembly";
import { applyInterrupt } from "../../utils/applyInterrupt";

import "./CleaningMethodSelectPage.css";

function CleaningMethodSelectPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const {
    taskId,
    cleaningMethod,
    setCompleted,
    setStepSaving,
    savingSteps,
  } = ctx;

  // AI 추천값을 기본 체크 상태로 사용 (사용자가 이후 자유롭게 토글 가능)
  const [usePhysical, setUsePhysical] = useState(
    () => !!cleaningMethod?.ai_analysis?.need_physical_cleaning,
  );
  const [useChemical, setUseChemical] = useState(
    () => !!cleaningMethod?.ai_analysis?.need_chemical_cleaning,
  );
  const [selectionError, setSelectionError] = useState("");

  const isSaving = savingSteps.has("cleaningMethod");

  const handleComplete = async () => {
    if (!taskId) {
      alert("복원가이드 작업 정보를 찾을 수 없습니다. 단계 선택 화면에서 다시 시작해주세요.");
      return;
    }

    if (!usePhysical && !useChemical) {
      setSelectionError("세척 방법을 하나 이상 선택해주세요.");
      return;
    }

    setSelectionError("");
    const request = {
      resume: {
        use_physical: usePhysical,
        use_chemical: useChemical,
      },
    };

    setStepSaving("cleaningMethod", true);

    try {
        const response = await resumeTask(taskId, request);

        applyInterrupt(response.interrupt, ctx);

        ctx.setCleaningSelection({ usePhysical, useChemical });

        setCompleted((prev) => ({
          ...prev,
          cleaningMethod: true,
        }));

      navigate("/cleaning");
    } catch (error) {
        console.error("❌ 에러:", error);
        alert("세척 방법 저장 실패");
    } finally {
        setStepSaving("cleaningMethod", false);
    }
  };

  if (!cleaningMethod) {
    return <div>불러오는 중...</div>;
  }

  return (
    <div className="cleaning-method-page">
      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/cleaning")}>
          ← 이전
        </button>

        <h1 className="vora-logo">VORA</h1>

        <button
          className="nav-btn"
          disabled={isSaving}
          onClick={handleComplete}
        >
          {isSaving ? "저장 중..." : "완료"}
        </button>
      </div>

      <div className="method-container">
        <div className="page-header">
          <h1>세척법 선택</h1>
        </div>

        <div className="info-card info-card--relic">
          <div className="info-block">
            <h3>유물 상태</h3>
            <p>{cleaningMethod?.ai_analysis?.relic_condition_summary}</p>
          </div>

          <div className="info-block">
            <h3>오염물 분석</h3>
            <p>{cleaningMethod?.ai_analysis?.contamination_summary}</p>
          </div>

          <div className="info-block">
            <h3>추천 이유</h3>
            <p>{cleaningMethod?.ai_analysis?.reason}</p>
          </div>
        </div>

        <div className="info-card">
          <h2>추천 세척법</h2>

          <div className="method-select">
            <label className={`method-box ${usePhysical ? "selected" : ""}`}>
              <strong>물리적 세척</strong>

              <input
                type="checkbox"
                checked={usePhysical}
                onChange={(e) => {
                  setUsePhysical(e.target.checked);
                  setSelectionError("");
                }}
              />
            </label>

            <label className={`method-box ${useChemical ? "selected" : ""}`}>
              <strong>화학적 세척</strong>

              <input
                type="checkbox"
                checked={useChemical}
                onChange={(e) => {
                  setUseChemical(e.target.checked);
                  setSelectionError("");
                }}
              />
            </label>
          </div>

          {selectionError && (
            <p className="method-selection-error" role="alert">
              {selectionError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CleaningMethodSelectPage;
