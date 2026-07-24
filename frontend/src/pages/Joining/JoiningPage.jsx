import { useLocation, useNavigate } from "react-router-dom";

import "./JoiningPage.css";

import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import {
  moveToNextStep,
  moveToPreviousStep,
} from "../../utils/flowNavigation";

import { useDisassembly } from "../../context/DisassemblyContext";

function JoiningPage() {
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
    completed.joiningMethod &&
    completed.joiningMaterial &&
    completed.joiningWork &&
    completed.joiningPost;
  return (
    <div className="joining-page">
      <ProgressNavigator
        approvedFlow={approvedFlow}
        currentStep="접합"
      />

      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() =>
            moveToPreviousStep(
              navigate,
              approvedFlow,
              "접합"
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
              "접합"
            )
          }
        >
          다음 단계 →
        </button>
      </div>

      <div className="joining-container">

        <div className="page-header">
          <h1>접합</h1>

          <p>
            아래 4개의 작업을 모두 완료하면
            다음 단계로 이동할 수 있습니다.
          </p>
        </div>

        {/* ① AI 추천 접합 방법 확인 */}
        <div
          className="task-card"
          onClick={() => navigate("/joining-method")}
        >
          <div className="task-icon">
            {completed.joiningMethod ? "✔" : "①"}
          </div>

          <div className="task-content">
            <h2>AI 추천 접합 방법 확인</h2>

            <p>
              AI가 유물의 상태를 분석하여
            적합한 접합 방법과
            작업 시 주의사항을 추천합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

        {/* ② 접합제 선택 */}
        <div
          className="task-card"
          onClick={() => navigate("/joining-material")}
        >
          <div className="task-icon">
            {completed.joiningMaterial ? "✔" : "②"}
          </div>

          <div className="task-content">
            <h2>접합제 선택</h2>

            <p>
              AI가 추천한 접합제를 확인하고
              유물에 적합한 접합제를 선택합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

        {/* ③ 접합 작업 수행 */}
        <div
          className="task-card"
          onClick={() => navigate("/joining-work")}
        >
          <div className="task-icon">
            {completed.joiningWork ? "✔" : "③"}
          </div>

          <div className="task-content">
            <h2>접합 작업 수행</h2>

            <p>
              AI가 안내하는 순서에 따라
              접합 작업을 진행하고
              건조 방법을 확인합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

        {/* ④ 작업 후 기록 */}
        <div
          className="task-card"
          onClick={() => navigate("/joining-post")}
        >
          <div className="task-icon">
            {completed.joiningPost ? "✔" : "④"}
          </div>

          <div className="task-content">
            <h2>작업 후 기록</h2>

            <p>
              접합 완료 사진과
              전문가 작업 메모를 기록합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

      </div>
    </div>
  );
}

export default JoiningPage;