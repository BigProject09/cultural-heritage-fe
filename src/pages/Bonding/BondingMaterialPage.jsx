import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

import "./BondingMaterialPage.css";

const ADHESIVE_OPTIONS = [
  { name: "Paraloid B-72", image: "/images/adhesives/paraloid-b72.jpg" },
  { name: "Cemedine C", image: "/images/adhesives/cemedine-c.jpg" },
  { name: "Araldite rapid", image: "/images/adhesives/araldite-rapid.jpg" },
  { name: "Cyanoacrylate", image: "/images/adhesives/cyanoacrylate.jpg" },
  { name: "poly urethane", image: "/images/adhesives/poly-urethane.jpg" },
  { name: "Loctite 401", image: "/images/adhesives/loctite-401.jpg" },
];

function AdhesiveThumbnail({ src, alt }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return <div className="material-image-placeholder">사진 준비 중</div>;
  }

  return <img src={src} alt={alt} onError={() => setErrored(true)} />;
}

function BondingMaterialPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const { taskId, bondingAdhesive, setCompleted, setStepSaving } = ctx;

  // AI 추천값을 드롭다운 초기값으로 사용 (사용자가 이후 자유롭게 변경 가능)
  const [adhesive, setAdhesive] = useState(
    () => bondingAdhesive?.recommended_adhesive || "",
  );

  const selectedOption = ADHESIVE_OPTIONS.find(
    (option) => option.name === adhesive,
  );

  const handleComplete = () => {
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    setStepSaving("bondingMaterial", true);
    navigate("/bonding");

    (async () => {
      try {
        const response = await resumeTask(taskId, {
          resume: {
            adhesive,
          },
        });

        applyInterrupt(response.interrupt, ctx);

        ctx.setBondingChoice({ adhesive });

        setCompleted((prev) => ({
          ...prev,
          bondingMaterial: true,
        }));
      } catch (error) {
        console.error(error);
        alert("접합제 저장 실패");
      } finally {
        setStepSaving("bondingMaterial", false);
      }
    })();
  };

  if (!bondingAdhesive) {
    return <div>불러오는 중...</div>;
  }

  return (
    <div className="bonding-material-page">
      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/bonding")}>
          ← 이전
        </button>

        <h1 className="vora-logo">VORA</h1>

        <button className="nav-btn" onClick={handleComplete}>
          완료
        </button>
      </div>

      <div className="material-container">
        <div className="page-header">
          <h1>접합제</h1>
        </div>

        <div className="material-card">
          <div className="material-layout">
            <div className="material-image-col">
              <div className="material-image-box">
                <AdhesiveThumbnail
                  key={adhesive}
                  src={selectedOption?.image}
                  alt={adhesive}
                />
              </div>

              <div className="material-select-item">
                <label>접합제</label>

                <select
                  value={adhesive}
                  onChange={(e) => setAdhesive(e.target.value)}
                >
                  {ADHESIVE_OPTIONS.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="material-info-col">
              <p className="material-description">
                {bondingAdhesive.reason}
              </p>

              {bondingAdhesive.precautions?.length > 0 && (
                <ul className="material-precautions">
                  {bondingAdhesive.precautions.map((precaution) => (
                    <li key={precaution}>⚠ {precaution}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BondingMaterialPage;
