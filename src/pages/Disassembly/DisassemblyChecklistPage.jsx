import { useNavigate } from "react-router-dom";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

import GuideNavigation from "../../components/guide/GuideNavigation";
import "./DisassemblyChecklistPage.css";

function DisassemblyChecklistPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const {
    setCompleted,
    setStepSaving,
    savingSteps,
    taskId,
    checklist: aiChecklist,
    checklistCaution,
    checklistSelection: checkedIds,
    setChecklistSelection: setCheckedIds,
  } = ctx;

  const isSaving = savingSteps.has("checklist");

  const handleCheckAll = () => {
    setCheckedIds(aiChecklist.map((item) => item.id));
  };

  // 저장 성공이 확인된 뒤에만 메인 페이지로 이동한다. 실패하면 현재 화면에 남아
  // 사용자가 선택을 수정하거나 다시 시도할 수 있다.
  const handleComplete = async () => {
    if (isSaving) return;
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    setStepSaving("checklist", true);

    try {
        const result = await resumeTask(taskId, {
          resume: {
            checked_ids: checkedIds,
          },
        });

        applyInterrupt(result.interrupt, ctx);

        setCompleted((prev) => ({
          ...prev,
          checklist: true,
        }));

      navigate("/disassembly");
    } catch (error) {
        console.error(error);
        alert("체크리스트 저장 실패");
    } finally {
        setStepSaving("checklist", false);
    }
  };

  const totalCount = aiChecklist.length;
  const checkedCount = checkedIds.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="checklist-page">
      <GuideNavigation currentLabel="해체 전 조사" />

      {/* 상단 */}
      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/disassembly")}>
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
        <h1>해체 전 조사</h1>
      </div>

      {/* 주의사항 */}
      {checklistCaution && (
        <div className="overall-caution">
          <strong>주의사항</strong>
          <p>{checklistCaution}</p>
        </div>
      )}

      <div className="checklist-card">
        {/* 진행률 */}
        <div className="checklist-progress">
          <div className="checklist-progress-header">
            <span className="checklist-progress-title">진행률</span>
            <span className="checklist-progress-label">
              {checkedCount} / {totalCount} 완료
            </span>
          </div>

          <div className="checklist-progress-bar">
            <div
              className="checklist-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 체크리스트 */}
        <div className="checklist-items">
          {aiChecklist.map((item, index) => {
            const isChecked = checkedIds.includes(item.id);

            return (
              <label
                key={item.id}
                className={`check-item ${isChecked ? "checked" : ""}`}
              >
                <span className="check-item-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="check-title">{item.label}</span>

                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCheckedIds([...checkedIds, item.id]);
                    } else {
                      setCheckedIds(checkedIds.filter((id) => id !== item.id));
                    }
                  }}
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DisassemblyChecklistPage;
