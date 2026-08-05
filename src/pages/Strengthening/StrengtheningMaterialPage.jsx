import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

import "./StrengtheningMaterialPage.css";

const AGENT_OPTIONS = [
  { name: "Paraloid B72", image: "/images/agents/paraloid-b72.jpg" },
  { name: "HPC", image: "/images/agents/hpc.jpg" },
  { name: "폴리비닐부티랄", image: "/images/agents/pvb.jpg" },
  { name: "수용성 Emulsion", image: "/images/agents/water-emulsion.jpg" },
  { name: "Paraloid NAD-10", image: "/images/agents/paraloid-nad-10.jpg" },
];

// 강화제별 사용 가능한 용제 (대표 + 사용 가능한 기타 용매)
const AGENT_SOLVENT_MAP = {
  "Paraloid B72": [
    "아세톤",
    "톨루엔",
    "자일렌",
    "에틸아세테이트",
    "이소프로판올",
    "에탄올",
    "MEK",
    "아밀아세테이트",
  ],
  HPC: ["에탄올", "물", "메탄올", "이소프로판올", "아세톤"],
  폴리비닐부티랄: ["에탄올", "이소프로판올", "메탄올", "아세톤", "톨루엔", "자일렌"],
  "수용성 Emulsion": ["물"],
  "Paraloid NAD-10": ["나프타", "화이트스피릿"],
};

// 용제별 미리보기 이미지
const SOLVENT_OPTIONS = [
  { name: "아세톤", image: "/images/solvents/acetone.jpg" },
  { name: "톨루엔", image: "/images/solvents/toluene.jpg" },
  { name: "자일렌", image: "/images/solvents/xylene.jpg" },
  { name: "에틸아세테이트", image: "/images/solvents/ethyl-acetate.jpg" },
  { name: "이소프로판올", image: "/images/solvents/isopropanol.jpg" },
  { name: "에탄올", image: "/images/solvents/ethanol.jpg" },
  { name: "MEK", image: "/images/solvents/mek.jpg" },
  { name: "아밀아세테이트", image: "/images/solvents/amyl-acetate.jpg" },
  { name: "물", image: "/images/solvents/water.jpg" },
  { name: "메탄올", image: "/images/solvents/methanol.jpg" },
  { name: "나프타", image: "/images/solvents/naphtha.jpg" },
  { name: "화이트스피릿", image: "/images/solvents/white-spirit.jpg" },
];

function MaterialThumbnail({ src, alt }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return <div className="material-image-placeholder">사진 준비 중</div>;
  }

  return <img src={src} alt={alt} onError={() => setErrored(true)} />;
}

function StrengtheningMaterialPage() {
  const navigate = useNavigate();

  const ctx = useDisassembly();
  const { taskId, strengtheningRecommendation, setCompleted, setStepSaving } = ctx;

  // AI 추천값을 드롭다운 초기값으로 사용 (사용자가 이후 자유롭게 변경 가능)
  const [agent, setAgent] = useState(
    () => strengtheningRecommendation?.recommended_agent || "",
  );
  const [solvent, setSolvent] = useState(
    () => strengtheningRecommendation?.recommended_solvent || "",
  );

  const selectedAgentOption = AGENT_OPTIONS.find(
    (option) => option.name === agent,
  );
  const selectedSolventOption = SOLVENT_OPTIONS.find(
    (option) => option.name === solvent,
  );

  const handleAgentChange = (nextAgent) => {
    setAgent(nextAgent);

    const allowedSolvents = AGENT_SOLVENT_MAP[nextAgent] || [];
    if (!allowedSolvents.includes(solvent)) {
      setSolvent(allowedSolvents[0] || "");
    }
  };

  const handleComplete = () => {
    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    setStepSaving("strengtheningMaterial", true);
    navigate("/strengthening");

    (async () => {
      try {
        const response = await resumeTask(taskId, {
          resume: {
            agent,
            solvent,
          },
        });

        applyInterrupt(response.interrupt, ctx);

        ctx.setStrengtheningChoice({ agent, solvent });

        setCompleted((prev) => ({
          ...prev,
          strengtheningMaterial: true,
        }));
      } catch (error) {
        console.error(error);
        alert("강화제 저장 실패");
      } finally {
        setStepSaving("strengtheningMaterial", false);
      }
    })();
  };

  if (!strengtheningRecommendation) {
    return <div>불러오는 중...</div>;
  }

  const solventOptions = AGENT_SOLVENT_MAP[agent] || [];

  return (
    <div className="strengthening-material-page">
      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/strengthening")}>
          ← 이전
        </button>

        <h1 className="vora-logo">VORA</h1>

        <button className="nav-btn" onClick={handleComplete}>
          완료
        </button>
      </div>

      <div className="material-container">
        <div className="page-header">
          <h1>강화제</h1>
        </div>

        <div className="material-card">
          <div className="material-layout">
            <div className="material-image-col">
              <div className="material-image-box">
                <MaterialThumbnail
                  key={agent}
                  src={selectedAgentOption?.image}
                  alt={agent}
                />
              </div>

              <div className="material-select-item">
                <label>강화제</label>

                <select
                  value={agent}
                  onChange={(e) => handleAgentChange(e.target.value)}
                >
                  {AGENT_OPTIONS.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="material-image-box">
                <MaterialThumbnail
                  key={solvent}
                  src={selectedSolventOption?.image}
                  alt={solvent}
                />
              </div>

              <div className="material-select-item">
                <label>용제</label>

                <select
                  value={solvent}
                  onChange={(e) => setSolvent(e.target.value)}
                >
                  {solventOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="material-info-col">
              <p className="material-description">
                {strengtheningRecommendation.reason}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StrengtheningMaterialPage;
