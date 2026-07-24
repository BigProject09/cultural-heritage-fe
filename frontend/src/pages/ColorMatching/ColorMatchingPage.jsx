import { useLocation, useNavigate } from "react-router-dom";

import "./ColorMatchingPage.css";

import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import {
  moveToNextStep,
  moveToPreviousStep,
} from "../../utils/flowNavigation";

import { useDisassembly } from "../../context/DisassemblyContext";

function ColorMatchingPage() {
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
    completed.colorMatchingMethod &&
    completed.colorMatchingMaterial &&
    completed.colorMatchingWork &&
    completed.colorMatchingPost;

  return (
    <div className="color-matching-page">
      <ProgressNavigator
        approvedFlow={approvedFlow}
        currentStep="색 맞춤"
      />

      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() =>
            moveToPreviousStep(
              navigate,
              approvedFlow,
              "색 맞춤"
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
              "색 맞춤"
            )
          }
        >
          다음 단계 →
        </button>
      </div>

      <div className="color-matching-container">

        <div className="page-header">
          <h1>AI 색 맞춤 작업</h1>

          <p>
            아래 4개의 작업을 모두 완료하면
            다음 단계로 이동할 수 있습니다.
          </p>
        </div>

        <div
          className="task-card"
          onClick={() => navigate("/color-matching-method")}
        >
          <div className="task-icon">
            {completed.colorMatchingMethod ? "✔" : "①"}
          </div>

          <div className="task-content">
            <h2>AI 추천 색 맞춤 방법 확인</h2>

            <p>
              AI가 유물의 색상과 재질을 분석하여
              적합한 색 맞춤 방법을 추천합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

        <div
          className="task-card"
          onClick={() => navigate("/color-matching-material")}
        >
          <div className="task-icon">
            {completed.colorMatchingMaterial ? "✔" : "②"}
          </div>

          <div className="task-content">
            <h2>색 맞춤 재료 선택</h2>

            <p>
              AI가 추천한 안료와 재료를 확인하고
              적합한 재료를 선택합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

        <div
          className="task-card"
          onClick={() => navigate("/color-matching-work")}
        >
          <div className="task-icon">
            {completed.colorMatchingWork ? "✔" : "③"}
          </div>

          <div className="task-content">
            <h2>색 맞춤 작업 수행</h2>

            <p>
              AI 안내에 따라 색 맞춤 작업을 수행하고
              결과를 확인합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

        <div
          className="task-card"
          onClick={() => navigate("/color-matching-post")}
        >
          <div className="task-icon">
            {completed.colorMatchingPost ? "✔" : "④"}
          </div>

          <div className="task-content">
            <h2>작업 후 기록</h2>

            <p>
              작업 결과와 사진,
              전문가 메모를 기록합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

      </div>
    </div>
  );
}

export default ColorMatchingPage;