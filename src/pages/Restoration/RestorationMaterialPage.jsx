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

// AI 추천 이유(reason)는 추천된 재료 하나에 고정된 텍스트라, 드롭다운에서 다른
// 재료를 선택해도 바뀌지 않는다. 선택한 재료가 무엇이든 일반적인 설명을 보여주기 위한 데이터.
const MATERIAL_DESCRIPTIONS = {
  "CDK-520":
    "손으로 반죽해 성형하는 2액형 에폭시 퍼티입니다. 결손부를 채우고 원하는 형태로 조형한 뒤 경화시켜 사포로 다듬기 좋아, 형태 복원이 필요한 결손부 충전에 주로 사용합니다.",
  "Araldite SV427+HV427":
    "레진과 경화제를 섞어 쓰는 2액형 구조용 에폭시입니다. 작업 가능 시간이 길고 경화 후 강도가 높아, 크기가 큰 결손부나 구조적 강도가 필요한 충전에 적합합니다.",
  "Epo-tec 301":
    "점도가 매우 낮은 정밀 2액형 에폭시입니다. 미세한 틈까지 스며들고 투명도가 높아, 유리질 소재나 정밀한 마감이 필요한 부위에 주로 사용합니다.",
  "XTR-311":
    "표면 코팅 및 함침용 액상 수지입니다. 다공질 표면을 충전제 시공 전에 미리 안정화하거나 코팅하는 전처리 용도로 사용합니다.",
  "Repairit Quik":
    "속경화형 2액형 에폭시 퍼티입니다. 짧은 시간 안에 경화되어 작업 시간이 촉박하거나 임시 충전이 필요한 상황에 적합합니다.",
};

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

  const selectedOption = MATERIAL_OPTIONS.find(
    (option) => option.name === material,
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


          <div className="material-layout">
            <div className="material-image-col">
              <div className="material-image-box">
                <MaterialThumbnail
                  key={material}
                  src={selectedOption?.image}
                  alt={material}
                />
              </div>

              <div className="material-select-item">
                <label>복원제</label>

                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                >
                  {MATERIAL_OPTIONS.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              {MATERIAL_DESCRIPTIONS[material] && (
                <div className="material-info-box">
                  <strong>
                    <span className="material-info-box-icon" aria-hidden="true">
                      📄
                    </span>
                    제품 정보
                  </strong>
                  <p>{MATERIAL_DESCRIPTIONS[material]}</p>
                </div>
              )}
            </div>

            <div className="material-info-col">
              {(() => {
                const points = splitReasonPoints(restorationMaterial.reason);
                return (
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
                );
              })()}
            </div>
          </div>


        </div>


      </div>


    </div>
  );
}


export default RestorationMaterialPage;