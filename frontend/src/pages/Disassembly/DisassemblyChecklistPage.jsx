import { useNavigate } from "react-router-dom";

import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import { moveToPreviousStep } from "../../utils/flowNavigation";
import { useDisassembly } from "../../context/DisassemblyContext";

import "./DisassemblyChecklistPage.css";

function DisassemblyChecklistPage() {
  const navigate = useNavigate();

  const { completed, setCompleted } = useDisassembly();

  // 임시 Flow (나중에 AI 결과로 교체)
  const approvedFlow = [
    "처리 전 조사",
    "해체",
    "세척",
    "강화 처리",
    "접합",
    "복원",
    "색 맞춤",
    "처리 후 기록",
  ];

  return (
    <div className="checklist-page">
      <ProgressNavigator
        approvedFlow={approvedFlow}
        currentStep="해체"
      />

      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() =>
            moveToPreviousStep(
              navigate,
              approvedFlow,
              "해체"
            )
          }
        >
          ← 이전 단계
        </button>

        <button
          className="nav-btn"
          onClick={() => {
            setCompleted({
              ...completed,
              checklist: true,
            });

            navigate("/disassembly");
          }}
        >
          완료 →
        </button>
      </div>

      <div className="method-content">
        <div className="method-area">
          <h1>AI 해체 전 조사</h1>

          <div className="recommend-card">
            <div className="recommend-header">
              ⭐ AI 체크리스트
            </div>

            <label>
              <input type="checkbox" />
              유물 표면 상태 확인
            </label>

            <label>
              <input type="checkbox" />
              균열 및 결손 확인
            </label>

            <label>
              <input type="checkbox" />
              기존 접착 여부 확인
            </label>

            <label>
              <input type="checkbox" />
              사진 촬영 완료
            </label>

            <label>
              <input type="checkbox" />
              기록 작성 완료
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DisassemblyChecklistPage;