import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";
import { resumeTask } from "../../services/conservationGuideApi";

import "./StrengtheningWettingResultPage.css";


function StrengtheningWettingResultPage() {

  const navigate = useNavigate();

  const {
    taskId,
    setCompleted,
  } = useDisassembly();



  const handleSelect = async (action) => {

    try {

      await resumeTask(taskId, {
        resume: {
          action,
        },
      });


      if (action === "proceed") {

        setCompleted((prev) => ({
          ...prev,
          strengtheningWettingResult: true,
        }));

        navigate("/strengthening-work");

      } else {

        navigate("/strengthening-method");

      }


    } catch (error) {

      console.error(error);
      alert("습윤 테스트 결과 저장 실패");

    }

  };



  return (

    <div className="strengthening-wetting-result-page">


      <div className="detail-header">

        <button
          className="nav-btn"
          onClick={() => navigate("/strengthening-wetting")}
        >
          ← 이전
        </button>


        <h1 className="vora-logo">
          VORA
        </h1>


      </div>



      <div className="method-container">


        <div className="page-header">

          <h1>
            🎨 습윤 효과 분석 결과
          </h1>


          <p>
            강화제 적용 전후 사진을 기반으로
            AI가 색 변화 여부를 분석했습니다.
          </p>

        </div>




        <div className="info-card">


          <h2>
            AI 분석 결과
          </h2>


          <div className="result-box">

            <p>
              ✔ 색 변화 정도: 안정
            </p>


            <p>
              ✔ 현재 강화제 사용 가능
            </p>


            <p>
              ✔ 추가 강화 처리 진행을 권장합니다.
            </p>

          </div>


        </div>





        <div className="warning-box">


          <strong>
            ⚠ 분석 참고사항
          </strong>


          <p>
            색 변화가 크게 발생한 경우
            강화제 또는 용매 변경 후 다시 테스트합니다.
          </p>


        </div>





        <div className="button-group">


          <button
            className="complete-btn"
            onClick={() => handleSelect("retry")}
          >
            🔄 강화제 다시 선택
          </button>



          <button
            className="complete-btn"
            onClick={() => handleSelect("proceed")}
          >
            ✔ 강화 처리 진행
          </button>


        </div>


      </div>


    </div>

  );

}


export default StrengtheningWettingResultPage;