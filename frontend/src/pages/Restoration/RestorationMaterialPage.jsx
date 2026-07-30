import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

import "./RestorationMaterialPage.css";

const MATERIAL_OPTIONS = [
  "CDK-520",
  "Araldite SV427+HV427",
  "Epo-tec 301",
  "XTR-311",
  "Repairit Quik",
];

function RestorationMaterialPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const {
    taskId,
    restorationMaterial,
    setCompleted,
    setStepSaving,
  } = ctx;

  // AI 추천값을 드롭다운 초기값으로 사용 (사용자가 이후 자유롭게 변경 가능)
  const [material, setMaterial] = useState(
    () => restorationMaterial?.recommended_material || "",
  );

  const handleComplete = () => {

    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    setStepSaving("restorationMaterial", true);
    navigate("/restoration");

    (async () => {
      try {

        const response = await resumeTask(taskId, {
          resume: {
            material,
          },
        });

        applyInterrupt(response.interrupt, ctx);

        ctx.setRestorationChoice({ material });

        setCompleted((prev) => ({
          ...prev,
          restorationMaterial: true,
        }));

      } catch (error) {

        console.error(error);
        alert("복원 재료 저장 실패");

      } finally {

        setStepSaving("restorationMaterial", false);

      }
    })();

  };

  if (!restorationMaterial) {
    return <div>불러오는 중...</div>;
  }


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
              {restorationMaterial.recommended_material}
            </span>


            <span>
              ▶
            </span>

          </div>



          <hr />



          <p className="material-description">
            {restorationMaterial.reason}
          </p>


          <div className="material-select-group">
            <div className="material-select-item">
              <label>복원제</label>

              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              >
                {MATERIAL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>


        </div>


      </div>


    </div>
  );
}


export default RestorationMaterialPage;