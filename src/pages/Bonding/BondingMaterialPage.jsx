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
  const { taskId, bondingAdhesive, setCompleted, setStepSaving, savingSteps } = ctx;

  const isSaving = savingSteps.has("bondingMaterial");

  // 실제로 확정(제출)할 접합제. AI 추천값을 초기값으로 사용.
  const [adhesive, setAdhesive] = useState(
    () => bondingAdhesive?.recommended_adhesive || "",
  );

  // 오른쪽 상세 영역에 어떤 접합제를 보여줄지만 담당하는 순수 화면 상태.
  // 목록 클릭은 미리보기일 뿐, 확정은 오른쪽 "선택" 버튼에서만 한다.
  const [activeAdhesiveName, setActiveAdhesiveName] = useState(
    () => bondingAdhesive?.recommended_adhesive || "",
  );

  const activeOption =
    ADHESIVE_OPTIONS.find((option) => option.name === activeAdhesiveName) ||
    ADHESIVE_OPTIONS[0] ||
    null;

  const handleCardClick = (name) => {
    setActiveAdhesiveName(name);
  };

  const handleCardKeyDown = (e, name) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick(name);
    }
  };

  const handleComplete = async () => {
    if (isSaving) return;
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    setStepSaving("bondingMaterial", true);

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

      navigate("/bonding");
    } catch (error) {
        console.error(error);
        alert("접합제 저장 실패");
    } finally {
        setStepSaving("bondingMaterial", false);
    }
  };

  if (!bondingAdhesive) {
    return <div>불러오는 중...</div>;
  }

  const isActiveSelected = activeOption ? adhesive === activeOption.name : false;

  return (
    <div className="bonding-material-page">
      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/bonding")}>
          ← 이전
        </button>

        <h1 className="vora-logo">VORA</h1>

        <button
            className="nav-btn"
            disabled={isSaving}
            onClick={handleComplete}
          >
            {isSaving ? "완료 처리 중..." : "완료"}
          </button>
      </div>

      <div className="material-container">
        {/* 좌우 2단 레이아웃 */}
        <div className="material-layout">
          {/* 왼쪽: 접합제 목록 */}
          <aside className="material-list-panel">
            <div className="material-list-panel-header">
              <h2 className="material-list-title">접합제</h2>
            </div>

            <div className="material-list-items">
              {ADHESIVE_OPTIONS.map((option) => {
                const isActive = activeOption?.name === option.name;
                const isSelected = adhesive === option.name;

                return (
                  <div
                    key={option.name}
                    className={`material-list-row ${isActive ? "active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCardClick(option.name)}
                    onKeyDown={(e) => handleCardKeyDown(e, option.name)}
                  >
                    <span>{option.name}</span>
                    {isSelected && (
                      <span className="material-list-row-badge">선택됨</span>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* 오른쪽: 선택된 접합제 상세 */}
          <section className="material-detail-panel">
            {activeOption ? (
              <>
                <div className="material-image-box">
                  <AdhesiveThumbnail
                    key={activeOption.name}
                    src={activeOption.image}
                    alt={activeOption.name}
                  />
                </div>

                <h2 className="material-detail-name">{activeOption.name}</h2>

                {bondingAdhesive.reason && (
                  <div className="material-detail-block">
                    <h3>추천 이유</h3>
                    <p className="material-description">
                      {bondingAdhesive.reason}
                    </p>
                  </div>
                )}

                {bondingAdhesive.precautions?.length > 0 && (
                  <div className="material-detail-block">
                    <h3>주의사항</h3>
                    <ul className="material-precautions">
                      {bondingAdhesive.precautions.map((precaution) => (
                        <li key={precaution}>⚠ {precaution}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="material-detail-actions">
                  <button
                    className={`nav-btn ${isActiveSelected ? "" : "secondary"}`}
                    onClick={() => setAdhesive(activeOption.name)}
                  >
                    {isActiveSelected ? "선택됨" : "선택"}
                  </button>
                </div>
              </>
            ) : (
              <p className="material-detail-empty">표시할 접합제가 없습니다.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default BondingMaterialPage;
