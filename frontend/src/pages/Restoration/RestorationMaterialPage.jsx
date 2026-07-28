import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/DisassemblyContext";
import { resumeTask } from "../../services/conservationGuideApi";

import "./RestorationMaterialPage.css";


function RestorationMaterialPage() {
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
          material: "Araldite SV427+HV427",
        },
      });


      setCompleted((prev) => ({
        ...prev,
        restorationMaterial: true,
      }));


      navigate("/restoration");


    } catch (error) {

      console.error(error);
      alert("복원 재료 저장 실패");

    }

  };


  return (
    <div className="restoration-material-page">


      <div className="detail-header">

        <button
          className="nav-btn"
          onClick={() => navigate("/restoration")}
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



      <div className="material-container">


        <div className="page-header">

          <h1>
            복원제
          </h1>

        </div>



        <div className="material-card">


          <div className="material-title">

            <span>
              📁
            </span>


            <span>
              Araldite SV427+HV427
            </span>


            <span>
              ▶
            </span>

          </div>



          <hr />



          <div className="material-image">

            <img
              src="/images/araldite.png"
              alt="Araldite SV427+HV427"
            />

          </div>



          <p className="material-description">

            유물의 결손 부위 복원을 위해
            Araldite SV427+HV427를 추천합니다.
            우수한 안정성과 접착력을 가지고 있어
            형태 복원 및 손상 부위 메움 작업에
            적합합니다.

            <br />
            <br />

            기존 접합 단계에서 사용한 재료와의
            상성을 고려하여 복원 후 안정성을
            확보할 수 있습니다.

          </p>


        </div>


      </div>


    </div>
  );
}


export default RestorationMaterialPage;