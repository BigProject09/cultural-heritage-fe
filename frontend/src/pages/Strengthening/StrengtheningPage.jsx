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
  completed.strengtheningMaterial &&
  completed.strengtheningWetting &&
  completed.strengtheningWettingResult &&
  completed.strengtheningMethod &&
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
            아래 5개의 작업을 모두 완료하면
            다음 단계로 이동할 수 있습니다.
          </p>

        </div>



        {/* 1. 강화제 선택 */}

        <div
          className="task-card"
          onClick={() => navigate("/strengthening-material")}
        >

          <div className="task-icon">
            {completed.strengtheningMaterial ? "✔" : "①"}
          </div>


          <div className="task-content">

            <h2>강화제 추천</h2>

            <p>
              AI가 유물의 재질과 손상 상태를 분석하여
              적합한 강화제와 용매를 추천합니다.
            </p>

          </div>


          <div className="task-arrow">
            →
          </div>

        </div>




        {/* 2. 습윤 테스트 */}

        <div
          className="task-card"
          onClick={() => navigate("/strengthening-wetting")}
        >

          <div className="task-icon">
            {completed.strengtheningWetting ? "✔" : "②"}
          </div>


          <div className="task-content">

            <h3>습윤 효과 테스트</h3>

            <p>
              강화제 적용 전후 사진을 비교하여
              색 변화 여부를 분석합니다.
            </p>

          </div>


          <div className="arrow">
            →
          </div>


        </div>





        {/* 3. 습윤 결과 확인 */}

        <div
          className="task-card"
          onClick={() =>
            navigate("/strengthening-wetting-result")
          }
        >

          <div className="task-icon">
            {completed.strengtheningWettingResult ? "✔" : "③"}
          </div>


          <div className="task-content">

            <h3>습윤 테스트 결과 확인</h3>

            <p>
              AI 색 변화 분석 결과를 확인하고
              강화 처리 진행 여부를 결정합니다.
            </p>

          </div>


          <div className="arrow">
            →
          </div>


        </div>
        {/* 4. 단계별 강화 작업 */}

        <div
          className="task-card"
          onClick={() => navigate("/strengthening-method")}
        >

          <div className="task-icon">
            {completed.strengtheningMethod ? "✔" : "④"}
          </div>


          <div className="task-content">

            <h3>단계별 강화 작업</h3>

            <p>
              AI가 추천한 강화 처리 절차를 확인하고
              단계별 작업을 수행합니다.
            </p>

          </div>


          <div className="arrow">
            →
          </div>

        </div>

        {/* 5. 작업 후 기록 */}

        <div
          className="task-card"
          onClick={() => navigate("/strengthening-post")}
        >

          <div className="task-icon">
            {completed.strengtheningPost ? "✔" : "⑤"}
          </div>


          <div className="task-content">

            <h3>작업 후 기록</h3>

            <p>
              강화 처리 후 사진과 메모를 기록합니다.
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
