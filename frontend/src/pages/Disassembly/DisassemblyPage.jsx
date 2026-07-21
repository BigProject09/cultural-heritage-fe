import { useNavigate } from "react-router-dom";

import "./DisassemblyPage.css";

import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import {
  moveToNextStep,
  moveToPreviousStep,
} from "../../utils/flowNavigation";

import { useDisassembly } from "../../context/DisassemblyContext";

function DisassemblyPage() {
  const navigate = useNavigate();

  const { completed } = useDisassembly();

  // 임시 Flow
  // 나중에는 AI 추천 Flow로 교체
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

  const allCompleted =
    completed.checklist &&
    completed.tool &&
    completed.method;

  return (
    <div className="disassembly-page">

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
          disabled={!allCompleted}
          onClick={() =>
            moveToNextStep(
              navigate,
              approvedFlow,
              "해체"
            )
          }
        >
          다음 단계 →
        </button>

      </div>

      <div className="disassembly-container">

        <div className="page-header">
          <h1>AI 해체 작업</h1>

          <p>
            아래 3개의 작업을 모두 완료하면
            다음 단계로 이동할 수 있습니다.
          </p>
        </div>

        <div
          className="task-card"
          onClick={() => navigate("/disassembly-checklist")}
        >

          <div className="task-icon">
            {completed.checklist ? "✔" : "①"}
          </div>

          <div className="task-content">

            <h2>해체 전 조사</h2>

            <p>
              AI가 생성한 체크리스트를 확인하고
              작업 전 상태를 점검합니다.
            </p>

          </div>

          <div className="task-arrow">
            →
          </div>

        </div>

        <div
          className="task-card"
          onClick={() => navigate("/disassembly-tool")}
        >

          <div className="task-icon">
            {completed.tool ? "✔" : "②"}
          </div>

          <div className="task-content">

            <h2>해체 도구 선택</h2>

            <p>
              AI가 추천한 해체 도구를 확인합니다.
            </p>

          </div>

          <div className="task-arrow">
            →
          </div>

        </div>

        <div
          className="task-card"
          onClick={() => navigate("/disassembly-method")}
        >

          <div className="task-icon">
            {completed.method ? "✔" : "③"}
          </div>

          <div className="task-content">

            <h2>해체 방법 선택</h2>

            <p>
              AI가 추천한 해체 방법을 확인합니다.
            </p>

          </div>

          <div className="task-arrow">
            →
          </div>

        </div>

      </div>

    </div>
  );
}

export default DisassemblyPage;