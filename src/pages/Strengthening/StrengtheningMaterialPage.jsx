import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSafeAsyncNavigate } from "../../hooks/useSafeAsyncNavigate";
import { useDisassembly } from "../../context/useDisassembly";
import { resumeTask } from "../../services/conservationGuideApi";
import { applyInterrupt } from "../../utils/applyInterrupt";
import { useGuideStepLock } from "../../hooks/useGuideStepLock";

import GuideNavigation from "../../components/guide/GuideNavigation";
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
  const { captureAsyncNavigationOrigin, navigateIfStillHere } = useSafeAsyncNavigate();

  const ctx = useDisassembly();
  const { taskId, strengtheningRecommendation, setCompleted, setStepSaving } = ctx;
  const { isCompleted, isSaving, isLocked } = useGuideStepLock("strengtheningMaterial");

  const initialAgent = isCompleted
    ? ctx.strengtheningChoice?.agent || ""
    : strengtheningRecommendation?.recommended_agent || "";
  const initialSolvent = isCompleted
    ? ctx.strengtheningChoice?.solvent || ""
    : strengtheningRecommendation?.recommended_solvent || "";

  // 완료 전에는 AI 추천값, 완료 후에는 실제 확정값을 표시한다.
  const [agent, setAgent] = useState(() => initialAgent);
  const [solvent, setSolvent] = useState(() => initialSolvent);

  // 오른쪽 상세 영역에 무엇을 보여줄지만 담당하는 순수 화면 상태.
  // 목록 클릭은 미리보기일 뿐, 확정은 오른쪽 "선택" 버튼에서만 한다.
  const [activeKind, setActiveKind] = useState("agent"); // "agent" | "solvent"
  const [activeAgentName, setActiveAgentName] = useState(
    () => initialAgent || strengtheningRecommendation?.recommended_agent || "",
  );
  const [activeSolventName, setActiveSolventName] = useState(
    () => initialSolvent || strengtheningRecommendation?.recommended_solvent || "",
  );

  // strengtheningRecommendation이 이 컴포넌트가 마운트된 뒤에 뒤늦게 도착하면(백엔드
  // 응답 지연 등) 위 useState 초기값은 다시 계산되지 않아 agent/solvent가 계속 빈
  // 문자열로 남는다. useEffect 대신 렌더링 중 상태 조정(React가 권장하는 패턴)으로,
  // 아직 값이 채워지지 않았을 때만(사용자가 직접 고른 값은 덮어쓰지 않고) 처리한다.
  const [syncedRecommendation, setSyncedRecommendation] = useState(
    strengtheningRecommendation,
  );
  if (
    !isCompleted &&
    strengtheningRecommendation &&
    strengtheningRecommendation !== syncedRecommendation
  ) {
    setSyncedRecommendation(strengtheningRecommendation);
    if (!agent) {
      setAgent(strengtheningRecommendation.recommended_agent || "");
      setActiveAgentName(strengtheningRecommendation.recommended_agent || "");
    }
    if (!solvent) {
      setSolvent(strengtheningRecommendation.recommended_solvent || "");
      setActiveSolventName(strengtheningRecommendation.recommended_solvent || "");
    }
  }

  const solventOptions = AGENT_SOLVENT_MAP[agent] || [];

  const activeAgentOption = AGENT_OPTIONS.find(
    (option) => option.name === activeAgentName,
  );
  const activeSolventOption = SOLVENT_OPTIONS.find(
    (option) => option.name === activeSolventName,
  );

  const handleAgentCardClick = (name) => {
    setActiveKind("agent");
    setActiveAgentName(name);
  };

  const handleSolventCardClick = (name) => {
    setActiveKind("solvent");
    setActiveSolventName(name);
  };

  const handleCardKeyDown = (e, onSelect) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  const confirmAgent = (name) => {
    if (isLocked) return;
    setAgent(name);

    const allowedSolvents = AGENT_SOLVENT_MAP[name] || [];

    // 강화제를 바꿨을 때 기존 용제가 호환되지 않으면
    // 해당 강화제의 기본 용제(목록 첫 번째)를 기존 방식대로 선택한다.
    if (!allowedSolvents.includes(solvent)) {
      const nextSolvent = allowedSolvents[0] || "";
      setSolvent(nextSolvent);
      setActiveSolventName(nextSolvent);
    }
  };

  const confirmSolvent = (name) => {
    if (isLocked) return;
    setSolvent(name);
  };

  const handleComplete = async () => {
    if (isLocked) return;

    if (!agent || !solvent) {
      alert("강화제와 용제를 모두 선택해주세요.");
      return;
    }

    if (!taskId) {
      alert("taskId가 없습니다.");
      return;
    }

    const pathAtRequest = captureAsyncNavigationOrigin();

    setStepSaving("strengtheningMaterial", true);

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

      navigateIfStillHere(pathAtRequest, "/strengthening");
    } catch (error) {
      console.error(error);
      alert("강화제 저장 실패");
    } finally {
      setStepSaving("strengtheningMaterial", false);
    }
  };

  if (!strengtheningRecommendation) {
    return <div>불러오는 중...</div>;
  }

  return (
    <div className="strengthening-material-page">
      <GuideNavigation currentLabel="강화제·용제 선택" />

      <div className="detail-header">
        <button className="nav-btn" onClick={() => navigate("/strengthening")}>
          ← 이전
        </button>
        <button
          className="nav-btn"
          disabled={isLocked}
          onClick={handleComplete}
        >
          {isSaving ? "완료 처리 중..." : isCompleted ? "완료됨" : "선택 완료"}
        </button>
      </div>

      <div className="material-container">
        <div className="material-selection-intro">
          <h1>강화 재료 선택</h1>
          <p>
            AI 추천값이 기본으로 선택되어 있습니다. 아래에서
            <strong> ① 강화제</strong>와 <strong>② 용제</strong>를 각각
            확인하고 필요하면 변경하세요.
          </p>
        </div>

        {/* 좌우 2단 레이아웃 */}
        <div className="material-layout">
          {/* 왼쪽: 강화제 목록 + 용제 목록 */}
          <aside className="material-list-panel">
            <div className="material-step-header">
              <span className="material-step-number">1</span>
              <div>
                <h2 className="material-list-title">강화제 선택</h2>
                <p className="material-step-help">사용할 강화제를 선택하세요.</p>
              </div>
            </div>

            <div className="material-list-items">
              {AGENT_OPTIONS.map((option) => {
                const isActive =
                  activeKind === "agent" && activeAgentName === option.name;
                const isSelected = agent === option.name;

                return (
                  <div
                    key={option.name}
                    className={`material-list-row ${isActive ? "active" : ""} ${isSelected ? "selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleAgentCardClick(option.name)}
                    onKeyDown={(e) =>
                      handleCardKeyDown(e, () => handleAgentCardClick(option.name))
                    }
                  >
                    <span>{option.name}</span>
                    {isSelected && (
                      <span className="material-list-row-badge is-selected">
                        선택됨
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="material-step-header material-step-header--secondary">
              <span className="material-step-number">2</span>
              <div>
                <h2 className="material-list-title">용제 선택</h2>
                <p className="material-step-help">사용할 용제를 선택하세요.</p>
              </div>
            </div>

            <div className="material-list-items">
              {solventOptions.length > 0 ? (
                solventOptions.map((name) => {
                  const isActive =
                    activeKind === "solvent" && activeSolventName === name;
                  const isSelected = solvent === name;

                  return (
                    <div
                      key={name}
                      className={`material-list-row ${isActive ? "active" : ""} ${isSelected ? "selected" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSolventCardClick(name)}
                      onKeyDown={(e) =>
                        handleCardKeyDown(e, () => handleSolventCardClick(name))
                      }
                    >
                      <span>{name}</span>
                      {isSelected && (
                        <span className="material-list-row-badge is-selected">
                          선택됨
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="material-list-empty">
                  강화제를 먼저 선택해주세요.
                </p>
              )}
            </div>

            <div className="material-choice-summary">
              <h3>현재 선택</h3>
              <div className="material-choice-summary-row">
                <span>강화제</span>
                <strong>{agent || "미선택"}</strong>
              </div>
              <div className="material-choice-summary-row">
                <span>용제</span>
                <strong>{solvent || "미선택"}</strong>
              </div>
            </div>
          </aside>

          {/* 오른쪽: 상세 (강화제 또는 용제 미리보기) */}
          <section className="material-detail-panel">
            {activeKind === "agent" && activeAgentOption ? (
              <>
                <div className="material-image-box">
                  <MaterialThumbnail
                    key={activeAgentOption.name}
                    src={activeAgentOption.image}
                    alt={activeAgentOption.name}
                  />
                </div>

                <h2 className="material-detail-name">{activeAgentOption.name}</h2>

                {strengtheningRecommendation.reason && (
                  <div className="material-detail-block">
                    <h3>추천 이유</h3>
                    <p className="material-description">
                      {strengtheningRecommendation.reason}
                    </p>
                  </div>
                )}

                <div className="material-detail-actions">
                  <button
                    className={`nav-btn material-selection-btn ${agent === activeAgentOption.name
                      ? "is-selected"
                      : "is-unselected"
                      }`}
                    disabled={isLocked}
                    onClick={() => confirmAgent(activeAgentOption.name)}
                  >
                    {agent === activeAgentOption.name ? "선택됨" : "미선택"}
                  </button>
                </div>
              </>
            ) : activeKind === "solvent" && activeSolventOption ? (
              <>
                <div className="material-image-box">
                  <MaterialThumbnail
                    key={activeSolventOption.name}
                    src={activeSolventOption.image}
                    alt={activeSolventOption.name}
                  />
                </div>

                <h2 className="material-detail-name">{activeSolventOption.name}</h2>

                {strengtheningRecommendation.reason && (
                  <div className="material-detail-block">
                    <h3>추천 이유</h3>
                    <p className="material-description">
                      {strengtheningRecommendation.reason}
                    </p>
                  </div>
                )}

                <div className="material-detail-actions">
                  <button
                    className={`nav-btn material-selection-btn ${solvent === activeSolventOption.name
                      ? "is-selected"
                      : "is-unselected"
                      }`}
                    disabled={isLocked}
                    onClick={() => confirmSolvent(activeSolventOption.name)}
                  >
                    {solvent === activeSolventOption.name ? "선택됨" : "미선택"}
                  </button>
                </div>
              </>
            ) : (
              <p className="material-detail-empty">표시할 항목이 없습니다.</p>
            )}
          </section>
        </div>
      </div>
    </div >
  );
}

export default StrengtheningMaterialPage;
