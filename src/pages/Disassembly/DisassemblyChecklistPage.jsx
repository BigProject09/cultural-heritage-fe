import { useNavigate } from "react-router-dom";

import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

import "./DisassemblyChecklistPage.css";

function DisassemblyChecklistPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const {
    setCompleted,
    setStepSaving,
    taskId,
    checklist: aiChecklist,
    checklistCaution,
    checklistSelection: checkedIds,
    setChecklistSelection: setCheckedIds,
  } = ctx;

  const handleCheckAll = () => {
    setCheckedIds(aiChecklist.map((item) => item.id));
  };

  // 완료 버튼을 누르면 응답을 기다리지 않고 바로 메인 페이지로 이동하고,
  // 저장 요청은 백그라운드에서 계속 진행한다 (메인 페이지가 로딩 스피너로 보여줌).
  const handleComplete = () => {
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    setStepSaving("checklist", true);
    navigate("/disassembly");

    (async () => {
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
      } catch (error) {
        console.error(error);
        alert("체크리스트 저장 실패");
      } finally {
        setStepSaving("checklist", false);
      }
    })();
  };

  const totalCount = aiChecklist.length;
  const checkedCount = checkedIds.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="checklist-page">
      {/* 상단 */}
      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/disassembly")}>
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
