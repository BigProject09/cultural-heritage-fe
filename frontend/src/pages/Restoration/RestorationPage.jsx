import { useLocation, useNavigate } from "react-router-dom";

import "./RestorationPage.css";

import ProgressNavigator from "../../components/common/ProgressNavigator/ProgressNavigator";
import {
  moveToNextStep,
  moveToPreviousStep,
} from "../../utils/flowNavigation";

import { useDisassembly } from "../../context/DisassemblyContext";

function RestorationPage() {
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
    completed.restorationMaterial &&
    completed.restorationMethod &&
    completed.restorationPost;

  return (
    <div className="restoration-page">

      <ProgressNavigator
        approvedFlow={approvedFlow}
        currentStep="복원"
      />

      <div className="top-bar">

        <button
          className="nav-btn"
          onClick={() =>
            moveToPreviousStep(
              navigate,
              approvedFlow,
              "복원"
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
              "복원"
            )
          }
        >
          다음 단계 →
        </button>

      </div>


      <div className="restoration-container">

        <div className="page-header">

          <h1>복원</h1>

          <p>
            아래 3개의 작업을 모두 완료하면
            다음 단계로 이동할 수 있습니다.
          </p>

        </div>


        {/* ① 복원 재료 선택 */}
        <div
          className="task-card"
          onClick={() => navigate("/restoration-material")}
        >

          <div className="task-icon">
            {completed.restorationMaterial ? "✔" : "①"}
          </div>


          <div className="task-content">

            <h2>복원 재료 선택</h2>

            <p>
              AI가 추천한 복원 재료를 확인하고
              적합한 재료를 선택합니다.
            </p>

          </div>


          <div className="task-arrow">
            →
          </div>

        </div>



        {/* ② 단계별 복원 작업 */}
        <div
          className="task-card"
          onClick={() => navigate("/restoration-method")}
        >

          <div className="task-icon">
            {completed.restorationMethod ? "✔" : "②"}
          </div>


          <div className="task-content">

            <h2>단계별 복원 작업</h2>

            <p>
              AI가 추천한 복원 절차를 확인하고
              단계별 작업을 수행합니다.
            </p>

          </div>


          <div className="task-arrow">
            →
          </div>

        </div>



        {/* ③ 작업 후 기록 */}
        <div
          className="task-card"
          onClick={() => navigate("/restoration-post")}
        >

          <div className="task-icon">
            {completed.restorationPost ? "✔" : "③"}
          </div>


          <div className="task-content">

            <h2>작업 후 기록</h2>

            <p>
              복원 완료 사진과
              작업 메모를 기록합니다.
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

export default RestorationPage;