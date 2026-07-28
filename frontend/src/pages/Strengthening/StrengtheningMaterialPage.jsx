import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";
import { resumeTask } from "../../services/conservationGuideApi";

import "./StrengtheningMaterialPage.css";


function StrengtheningMaterialPage() {
  const navigate = useNavigate();

  const {
    taskId,
    setCompleted,
  } = useDisassembly();


  const handleComplete = async () => {

    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }


    try {

      await resumeTask(taskId, {
        resume: {
          agent: "Paraloid B-72",
          solvent: "아세톤",
        },
      });


      setCompleted((prev) => ({
        ...prev,
        strengtheningMaterial: true,
      }));


      navigate("/strengthening");

    } catch(error) {

      console.error(error);
      alert("강화제 저장 실패");

    }

  };


  return (
    <div className="method-page">

      <div className="method-container">

        <h1>강화제 추천</h1>


        <div className="content-box">

          <h2>AI 추천 결과</h2>

          <p>
            추천 강화제 : Paraloid B-72
          </p>

          <p>
            추천 용매 : 아세톤
          </p>

          <p>
            유물의 안정성과 가역성을 고려한
            강화제로 추천되었습니다.
          </p>

        </div>


        <button
          className="complete-btn"
          onClick={handleComplete}
        >
          선택 완료
        </button>


      </div>

    </div>
  );
}

export default StrengtheningMaterialPage;