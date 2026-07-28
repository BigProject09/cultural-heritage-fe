import { useLocation, useNavigate } from "react-router-dom";

import "./BondingPage.css";

import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import {
  moveToNextStep,
  moveToPreviousStep,
} from "../../utils/flowNavigation";

import { useDisassembly } from "../../context/DisassemblyContext";

function BondingPage() {
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
  completed.bondingMethod &&
  completed.bondingMaterial &&
  completed.bondingWork &&
  completed.bondingPost;
  
  return (
    <div className="bonding-page">
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

      <div className="bonding-container">

        <div className="page-header">
          <h1>접합</h1>

          <p>
            아래 4개의 작업을 모두 완료하면
            다음 단계로 이동할 수 있습니다.
          </p>
        </div>

        {/* ① 접합제 선택 */}
        <div
          className="task-card"
          onClick={() => navigate("/bonding-material")}
        >
          <div className="task-icon">
            {completed.bondingMaterial ? "✔" : "①"}
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

        {/* ② 임시접합 */}
        <div
          className="task-card"
          onClick={() => navigate("/bonding-work")}
        >
          <div className="task-icon">
            {completed.bondingWork ? "✔" : "②"}
          </div>

          <div className="task-content">
            <h2>임시접합</h2>

            <p>
              접합 전 유물의 위치를 맞추고
              처리 전·후 사진을 기록합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>

        {/* ③ 단계별 안내 */}
        <div
          className="task-card"
          onClick={() => navigate("/bonding-method")}
        >
          <div className="task-icon">
            {completed.bondingMethod ? "✔" : "③"}
          </div>

          <div className="task-content">
            <h2>단계별 안내</h2>

            <p>
              AI가 추천한 접합 절차를 확인하고
              단계별 작업을 수행합니다.
            </p>
          </div>

          <div className="task-arrow">→</div>
        </div>
        {/* ④ 작업 후 기록 */}
        <div
          className="task-card"
          onClick={() => navigate("/bonding-post")}
        >
          <div className="task-icon">
            {completed.bondingPost ? "✔" : "④"}
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

export default BondingPage;