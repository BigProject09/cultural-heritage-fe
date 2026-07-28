import { resumeTask } from "../../services/conservationGuideApi";
import { useNavigate } from "react-router-dom";

import { useDisassembly } from "../../context/DisassemblyContext";

import "./CleaningMethodSelectPage.css";

function CleaningMethodSelectPage() {
  const navigate = useNavigate();

const {
  taskId,
  cleaningMethod,
  setCleaningGuide,
  setCompleted,
} = useDisassembly();


  const handleComplete = async () => {
    const request = {
      resume: {
        use_physical:
          cleaningMethod?.ai_analysis?.need_physical_cleaning,

        use_chemical:
          cleaningMethod?.ai_analysis?.need_chemical_cleaning,
      },
    };


    try {
      console.log("taskId =", taskId);
      const response = await resumeTask(taskId, request);

      console.log("✅ 백엔드 응답:", response);

      if (response.interrupt?.ai_guide) {
        setCleaningGuide(response.interrupt.ai_guide);
      }

      setCompleted((prev) => ({
        ...prev,
        cleaningMethod: true,
      }));

      navigate("/cleaning");

    } catch (error) {
      console.error("❌ 에러:", error);
      alert("세척 방법 저장 실패");
    }
  };


  if (!cleaningMethod) {
    return <div>불러오는 중...</div>;
  }


  return (
    <div className="cleaning-method-page">

      <div className="detail-header">

        <button
          className="nav-btn"
          onClick={() => navigate("/cleaning")}
        >
          ← 이전
        </button>


        <h1 className="vora-logo">
          VORA
        </h1>


        <button
          className="nav-btn"
          onClick={handleComplete}
        >
          완료
        </button>

      </div>


      <div className="method-container">

        <div className="page-header">
          <h1>세척법 선택</h1>
        </div>



        <div className="info-card">

          <h2>AI 분석 결과</h2>


          <p>
            <strong>유물 상태</strong>
            <br />
            {cleaningMethod?.ai_analysis?.relic_condition_summary}
          </p>


          <p>
            <strong>오염물 분석</strong>
            <br />
            {cleaningMethod?.ai_analysis?.contamination_summary}
          </p>


          <p>
            <strong>추천 이유</strong>
            <br />
            {cleaningMethod?.ai_analysis?.reason}
          </p>

        </div>



        <div className="info-card">

          <h2>AI 추천 세척법</h2>


          <div className="method-select">


            <div className="method-box">

              <strong>
                물리적 세척
              </strong>


              <div className="check">

                {
                  cleaningMethod?.ai_analysis?.need_physical_cleaning
                    ? "✓"
                    : "×"
                }

              </div>

            </div>




            <div className="method-box">

              <strong>
                화학적 세척
              </strong>


              <div className="check">

                {
                  cleaningMethod?.ai_analysis?.need_chemical_cleaning
                    ? "✓"
                    : "×"
                }

              </div>

            </div>


          </div>

        </div>


      </div>

    </div>
  );
}

export default CleaningMethodSelectPage;