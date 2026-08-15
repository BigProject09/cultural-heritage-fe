import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

import "./RestorationMaterialPage.css";

const MATERIAL_OPTIONS = [
  { name: "CDK-520", image: "/images/restoration-materials/cdk-520.jpg" },
  {
    name: "Araldite SV427+HV427",
    image: "/images/restoration-materials/araldite-sv427-hv427.jpg",
  },
  { name: "Epo-tec 301", image: "/images/restoration-materials/epo-tec-301.jpg" },
  { name: "XTR-311", image: "/images/restoration-materials/xtr-311.jpg" },
  {
    name: "Repairit Quik",
    image: "/images/restoration-materials/repairit-quik.jpg",
  },
];

// AI 추천 이유가 "① ... ② ..." 또는 "1. ... 2. ..."처럼 번호 매겨진 여러 항목을
// 줄바꿈 없이 하나의 문단으로 반환하는 경우가 있어, 항목별로 분리해서 보여주기 위한 헬퍼.
function splitReasonPoints(text) {
  if (!text) return [];

  const byNewline = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (byNewline.length > 1) return byNewline;

  const byNumber = text
    .split(/(?=[①-⑳]|\d+[.)]\s)/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (byNumber.length > 1) return byNumber;

  return byNumber.length === 1 ? byNumber : [text];
}

// "(문헌 1의 접근과 유사)"처럼 문헌 인용이 담긴 괄호 구절을 화면에서 숨기기 위한 헬퍼.
function stripLiteratureCitations(text) {
  return text
    .replace(/[（(][^()]*문헌[^()]*[)）]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// "① 재질/상태 근거: 본문..." 형태의 항목을 라벨(굵게)과 본문(일반 텍스트)으로 분리.
function parseReasonPoint(rawPoint) {
  const withoutBullet = rawPoint.replace(/^[①-⑳]\s*|^\d+[.)]\s*/, "");
  const cleaned = stripLiteratureCitations(withoutBullet);

  const colonIndex = cleaned.search(/[:：]/);
  if (colonIndex === -1) {
    return { label: "", body: cleaned };
  }

  return {
    label: cleaned.slice(0, colonIndex).trim(),
    body: cleaned.slice(colonIndex + 1).trim(),
  };
}

function MaterialThumbnail({ src, alt }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return <div className="material-image-placeholder">사진 준비 중</div>;
  }

  return <img src={src} alt={alt} onError={() => setErrored(true)} />;
}

function RestorationMaterialPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const { taskId, restorationMaterial, setCompleted, setStepSaving, savingSteps } = ctx;

  const isSaving = savingSteps.has("restorationMaterial");

  // 실제로 확정(제출)할 복원제. AI 추천값을 초기값으로 사용.
  const [material, setMaterial] = useState(
    () => restorationMaterial?.recommended_material || "",
  );

  // 오른쪽 상세 영역에 어떤 복원제를 보여줄지만 담당하는 순수 화면 상태.
  // 목록 클릭은 미리보기일 뿐, 확정은 오른쪽 "선택" 버튼에서만 한다.
  const [activeMaterialName, setActiveMaterialName] = useState(
    () => restorationMaterial?.recommended_material || "",
  );

  const activeOption =
    MATERIAL_OPTIONS.find((option) => option.name === activeMaterialName) ||
    MATERIAL_OPTIONS[0] ||
    null;

  const handleCardClick = (name) => {
    setActiveMaterialName(name);
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

    setStepSaving("restorationMaterial", true);

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

      navigate("/restoration");
    } catch (error) {
        console.error(error);
        alert("복원 재료 저장 실패");
    } finally {
        setStepSaving("restorationMaterial", false);
    }
  };

  if (!restorationMaterial) {
    return <div>불러오는 중...</div>;
  }

  const points = splitReasonPoints(restorationMaterial.reason);
  const isActiveSelected = activeOption ? material === activeOption.name : false;

  return (
    <div className="restoration-material-page">
      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/restoration")}>
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
          {/* 왼쪽: 복원제 목록 */}
          <aside className="material-list-panel">
            <div className="material-list-panel-header">
              <h2 className="material-list-title">복원제</h2>
            </div>

            <div className="material-list-items">
              {MATERIAL_OPTIONS.map((option) => {
                const isActive = activeOption?.name === option.name;
                const isSelected = material === option.name;

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

          {/* 오른쪽: 선택된 복원제 상세 */}
          <section className="material-detail-panel">
            {activeOption ? (
              <>
                <div className="material-image-box">
                  <MaterialThumbnail
                    key={activeOption.name}
                    src={activeOption.image}
                    alt={activeOption.name}
                  />
                </div>

                <h2 className="material-detail-name">{activeOption.name}</h2>

                {points.length > 0 && (
                  <div className="material-detail-block">
                    <h3>추천 이유</h3>
                    <ul className="material-reason-list">
                      {points.map((point, index) => {
                        const { label, body } = parseReasonPoint(point);
                        return (
                          <li key={index}>
                            {label && (
                              <strong className="reason-item-label">
                                {label}
                              </strong>
                            )}
                            <span className="reason-item-body">{body}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div className="material-detail-actions">
                  <button
                    className={`nav-btn ${isActiveSelected ? "" : "secondary"}`}
                    onClick={() => setMaterial(activeOption.name)}
                  >
                    {isActiveSelected ? "선택됨" : "선택"}
                  </button>
                </div>
              </>
            ) : (
              <p className="material-detail-empty">표시할 복원제가 없습니다.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default RestorationMaterialPage;
