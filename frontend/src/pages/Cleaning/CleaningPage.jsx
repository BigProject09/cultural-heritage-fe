import { useLocation, useNavigate } from "react-router-dom";

import "./CleaningPage.css";

import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import {
  moveToNextStep,
  moveToPreviousStep,
} from "../../utils/flowNavigation";

import { useDisassembly } from "../../context/DisassemblyContext";

function CleaningPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { completed } = useDisassembly();

  const approvedFlow =
    location.state?.approvedFlow || [
      { id: 1, name: "처리 전 조사" },
      { id: 2, name: "해체" },
      { id: 3, name: "세척" },
      { id: 4, name: "강화 처리" },
      { id: 5, name: "접합" },
      { id: 6, name: "복원" },
      { id: 7, name: "색 맞춤" },
      { id: 8, name: "처리 후 기록" },
    ];

  const allCompleted =
    completed.cleaningMethod &&
    completed.cleaningStep &&
    completed.cleaningDryingStep &&
    completed.cleaningPost;
  return (
    <div className="cleaning-page">
      <ProgressNavigator
        approvedFlow={approvedFlow}
        currentStep="세척"
      />

      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() =>
            moveToPreviousStep(
              navigate,
              approvedFlow,
              "세척"
            )
          }
        >
          ← 이전
        </button>

        <button
          className="nav-btn"
          disabled={!allCompleted}
          onClick={() =>
            moveToNextStep(
              navigate,
              approvedFlow,
              "세척"
            )
          }
        >
          다음 단계 →
        </button>
      </div>

      <div className="cleaning-container">

        <div className="page-header">
          <h1>AI 세척 작업</h1>

          <p>
            아래 4개의 작업을 모두 완료하면
            다음 단계로 이동할 수 있습니다.
          </p>
        </div>

        {/* ① 세척법 선택 */}
        <div
          className="task-card"
          onClick={() => navigate("/cleaning-method-select")}
        >
          <div className="task-icon">
            {completed.cleaningMethod ? "✔" : "①"}
          </div>

          <div className="task-content">
            <h2>세척법 선택</h2>

            <p>
              물리적 세척과 화학적 세척 여부를 선택합니다.
              선택 결과를 백엔드에 전송합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

        {/* ② 세척 단계별 작업 */}
        <div
          className="task-card"
          onClick={() => navigate("/cleaning-step")}
        >
          <div className="task-icon">
            {completed.cleaningStep ? "✔" : "②"}
          </div>

          <div className="task-content">
            <h2>세척 단계별 작업</h2>

            <p>
              AI가 추천한 세척 단계를
              순서대로 수행합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

        {/* ③ 건조 단계별 작업 */}
        <div
          className="task-card"
          onClick={() => navigate("/cleaning-drying-step")}
        >
          <div className="task-icon">
            {completed.cleaningDryingStep ? "✔" : "③"}
          </div>

          <div className="task-content">
            <h2>건조 단계별 작업</h2>

            <p>
              건조 작업을 진행하고
              결과를 확인합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

        {/* ④ 작업 후 기록 */}
        <div
          className="task-card"
          onClick={() => navigate("/cleaning-post")}
        >
          <div className="task-icon">
            {completed.cleaningPost ? "✔" : "④"}
          </div>

          <div className="task-content">
            <h2>작업 후 기록</h2>

            <p>
              세척 완료 사진과
              전문가 작업 메모를 기록합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

      </div>
    </div>
  );
}

export default CleaningPage;