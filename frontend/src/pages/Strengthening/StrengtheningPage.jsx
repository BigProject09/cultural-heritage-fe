import "./StrengtheningPage.css";

import { useLocation, useNavigate } from "react-router-dom";

import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import { useDisassembly } from "../../context/DisassemblyContext";
import {
  moveToNextStep,
  moveToPreviousStep,
} from "../../utils/flowNavigation";

function StrengtheningPage() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const { completed } = useDisassembly();

  const allCompleted =
    completed.strengtheningMethod &&
    completed.strengtheningMaterial &&
    completed.strengtheningWork &&
    completed.strengtheningPost;

  return (
    <div className="strengthening-page">

      <ProgressNavigator
        approvedFlow={approvedFlow}
        currentStep="강화 처리"
      />

      <div className="top-bar">

        <button
          className="nav-btn"
          onClick={() =>
            moveToPreviousStep(
              navigate,
              approvedFlow,
              "강화 처리"
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
              "강화 처리"
            )
          }
        >
          다음 단계 →
        </button>

      </div>

      <div className="strengthening-container">

        <div className="page-header">
          <h1>AI 강화 처리</h1>

          <p>
            아래 4개의 작업을 모두 완료하면
            다음 단계로 이동할 수 있습니다.
          </p>
        </div>

        {/* 1 */}

        <div
          className="task-card"
          onClick={() => navigate("/strengthening-method")}
        >

          <div className="task-icon">
            {completed.strengtheningMethod ? "✔" : "①"}
          </div>

          <div className="task-content">

            <h2>AI 추천 강화 방법 확인</h2>

            <p>
              AI가 손상 상태를 분석하여
              강화 처리 부위와 분무법·침지법을 추천합니다.
            </p>

          </div>

          <div className="task-arrow">
            →
          </div>

        </div>

        {/* 2 */}

        <div
          className="task-card"
          onClick={() => navigate("/strengthening-material")}
        >

          <div className="task-icon">
            {completed.strengtheningMaterial ? "✔" : "②"}
          </div>

          <div className="task-content">

            <h3>강화제 선택</h3>

            <p>
              AI가 추천한 Paraloid B72 등
              강화제를 확인하고 선택합니다.
            </p>

          </div>

          <div className="arrow">
            →
          </div>

        </div>

        {/* 3 */}

        <div
          className="task-card"
          onClick={() => navigate("/strengthening-work")}
        >

          <div className="task-icon">
            {completed.strengtheningWork ? "✔" : "③"}
          </div>

          <div className="task-content">

            <h3>강화 처리 수행</h3>

            <p>
              강화제를 도포하고
              상온에서 충분히 자연 건조합니다.
            </p>

          </div>

          <div className="arrow">
            →
          </div>

        </div>

        {/* 4 */}

        <div
          className="task-card"
          onClick={() => navigate("/strengthening-post")}
        >

          <div className="task-icon">
            {completed.strengtheningPost ? "✔" : "④"}
          </div>

          <div className="task-content">

            <h3>작업 후 기록</h3>

            <p>
              작업 후 사진과 메모를 기록합니다.
            </p>

          </div>

          <div className="arrow">
            →
          </div>

        </div>

      </div>

    </div>
  );
}

export default StrengtheningPage;