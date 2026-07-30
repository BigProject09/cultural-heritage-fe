import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";

import "./StrengtheningMaterialPage.css";

const AGENT_OPTIONS = [
  "Paraloid B72",
  "HPC",
  "폴리비닐부티랄",
  "수용성 Emulsion",
  "Paraloid NAD-10",
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

  const handleAgentChange = (e) => {
    const nextAgent = e.target.value;
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
          <div className="material-title">
            <span>📁</span>

            <span>{strengtheningRecommendation.recommended_agent}</span>

            <span>▶</span>
          </div>

          <hr />

          <p className="material-description">
            {strengtheningRecommendation.reason}
          </p>

          <div className="material-select-group">
            <div className="material-select-item">
              <label>강화제</label>

              <select value={agent} onChange={handleAgentChange}>
                {AGENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
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
        </div>
      </div>
    </div>
  );
}

export default StrengtheningMaterialPage;
