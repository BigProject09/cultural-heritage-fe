import "./FlowRecommendationPage.css";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { startTask } from "../../services/conservationGuideApi";
import { useDisassembly } from "../../context/useDisassembly";
import { applyInterrupt } from "../../utils/applyInterrupt";
import { getArtifactWorkflowRoute } from "../../utils/artifactRoutes";
import { getRecoveredGuideRoute } from "../../utils/guideTaskRecovery";
import { getArtifactImageDataUrl } from "../../data/localArtifactAssets";
import { DEFAULT_GUIDE_FLOW } from "../../data/flowData";
import ModulePageHeader from "../../components/common/ModulePageHeader/ModulePageHeader";

// 백엔드에 AI 추천 Flow API가 아직 없어서, 발표용으로 임시 하드코딩한 값.
// 실제 추천 API가 생기면 이 상수 대신 서버 응답으로 교체해야 함.
const AI_RECOMMENDED_FLOW = DEFAULT_GUIDE_FLOW;

function FlowRecommendationPage() {
  const navigate = useNavigate();
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);

  const aiFlow = AI_RECOMMENDED_FLOW;

  // AI가 추천한 Flow를 최초 화면에서 그대로 선택된 상태로 보여준다.
  // 사용자는 추천값을 기준으로 필요한 단계만 해제/추가한 뒤 시작한다.
  const [steps, setSteps] = useState(() => {
    const recommendedNames = new Set(
      AI_RECOMMENDED_FLOW.map((step) => step.name),
    );

    return DEFAULT_GUIDE_FLOW.map((step) => ({
      ...step,
      active: Boolean(step.mandatory) || recommendedNames.has(step.name),
    }));
  });

  const [loading, setLoading] = useState(false);

  const ctx = useDisassembly();
  const { setTaskId, setApprovedFlow, resetCompleted } = ctx;

  const toggleStep = (id) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id && !step.mandatory
          ? { ...step, active: !step.active }
          : step,
      ),
    );
  };

  // 사용자가 최종 승인한 Flow
  const approvedFlow = steps.filter((step) => step.active);

  const FLOW_NAME_TO_KEY = {
    해체: "disassembly",
    세척: "cleaning",
    강화: "reinforcement",
    접합: "bonding",
    복원: "restoration",
  };
  const FLOW_NAME_TO_ROUTE = {
    해체: "disassembly",
    세척: "cleaning",
    강화: "strengthening",
    접합: "bonding",
    복원: "restoration",
  };

  const approvedFlowKeys = approvedFlow
    .map((step) => FLOW_NAME_TO_KEY[step.name])
    .filter(Boolean);

  // 다음 버튼 : 사용자가 확정한 Flow로만 AI 작업을 시작
  const handleNext = async () => {
    if (approvedFlow.length === 0) {
      alert("진행할 보존처리 단계를 하나 이상 선택해주세요.");
      return;
    }

    const artifactInfo = JSON.parse(localStorage.getItem("artifactInfo"));

    if (!artifactInfo || !artifactId) {
      navigate("/artifacts/new", {
        state: { entryModule: "guide", workspaceEntry: true },
      });
      return;
    }

    // 새 보존가이드를 시작할 때 이전 Guide 세션 상태를 모두 초기화한다.
    // X-RAY/육안조사 등 어떤 경로에서 진입했는지와 관계없이
    // 동일한 초기 상태에서 시작하도록 한다.
    resetCompleted();
    setApprovedFlow(approvedFlow);

    const taskId = `task-${Date.now()}`;

    // 브라우저 전용 image/imageKey는 relicInfo에서 제외한다.
    // 대표 이미지는 요청 직전에만 IndexedDB Blob을 Base64로 변환한다.
    const { image, imageKey, ...relicInfo } = artifactInfo;

    setLoading(true);

    try {
      let requestImage = image || "";

      if (imageKey) {
        requestImage = await getArtifactImageDataUrl(imageKey);
        if (!requestImage) {
          throw new Error(
            "임시 저장된 대표 이미지를 찾을 수 없습니다. 유물 정보에서 대표 이미지를 다시 등록해주세요.",
          );
        }
      } else if (requestImage.startsWith("blob:")) {
        throw new Error(
          "대표 이미지 원본을 찾을 수 없습니다. 유물 정보에서 대표 이미지를 다시 등록해주세요.",
        );
      }

      const result = await startTask(taskId, {
        artifactId,
        taskName: "문화재 복원",
        taskManager: "오서하",
        relicInfo,

        // Base64는 localStorage에 다시 저장하지 않고 이 요청 메모리에서만 사용한다.
        relicPhoto: requestImage ? [requestImage] : [],

        // 사용자가 "Flow 수정"에서 선택한 단계만 전달
        flow: approvedFlowKeys,
      });

      setTaskId(taskId);
      ctx.setGuideResumeRoute(
        getRecoveredGuideRoute(
          { totalState: result.status, currentInterrupt: result.interrupt },
          artifactId,
        ),
      );

      // 어느 단계가 flow에서 빠졌는지에 따라 이 응답에 실려오는 interrupt가 다를 수 있어서,
      // 들어있는 키에 맞는 context를 전부 채워주는 공통 함수로 처리한다.
      applyInterrupt(result.interrupt, ctx);

      const firstStep = approvedFlow[0];
      navigate(
        getArtifactWorkflowRoute(
          artifactId,
          FLOW_NAME_TO_ROUTE[firstStep.name],
        ),
        { state: { approvedFlow } },
      );
    } catch (error) {
      console.error("Flow 시작 실패:", error);
      alert(error.message || "AI 작업 시작에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flow-page">
      <div className="guide-container">
        <ModulePageHeader
          artifactId={artifactId}
          currentLabel="복원 가이드"
          eyebrow="INDEPENDENT GUIDE MODULE"
          title="복원 가이드"
          description="진행할 보존처리 단계를 선택하고 AI 작업을 시작합니다."
          tone="bronze"
          rightContent={
            <button
              className="guide-start-btn"
              disabled={loading}
              onClick={handleNext}
            >
              시작하기 →
            </button>
          }
        />
      </div>

      <div className="flow-container">
        {/* Flow 수정 */}
        <div className="flow-box">
          <h2>AI 추천</h2>

          {aiFlow.map((step, index) => (
            <div key={step.id} className="flow-step">
              <div className="ai-step">{step.name}</div>

              {index !== aiFlow.length - 1 && <div className="arrow">↓</div>}
            </div>
          ))}
        </div>

        <div className="flow-box">
          <h2>보존처리 단계</h2>

          {steps.map((step, index) => (
            <div key={step.id} className="flow-step">
              <button
                className={
                  step.active ? "step-btn active" : "step-btn inactive"
                }
                disabled={step.mandatory}
                onClick={() => toggleStep(step.id)}
              >
                {step.name}
              </button>

              {index !== steps.length - 1 && <div className="arrow">↓</div>}
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="analyzing-overlay">
          <div className="analyzing-box">
            <svg
              className="pottery-loader"
              viewBox="0 0 100 120"
              role="img"
              aria-label="복원 진행 중"
            >
              <path
                className="pottery-loader-body"
                d="M50 8 C36 8 31 22 33 32 C21 38 15 58 19 78 C23 99 38 112 50 112 C62 112 77 99 81 78 C85 58 79 38 67 32 C69 22 64 8 50 8 Z"
              />

              <path
                className="pottery-loader-crack pottery-loader-crack-1"
                d="M38 30 L46 55 L37 68 L47 90"
                pathLength="1"
              />

              <path
                className="pottery-loader-crack pottery-loader-crack-2"
                d="M66 34 L58 52 L67 66 L56 86"
                pathLength="1"
              />
            </svg>

            <p>복원 시작</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlowRecommendationPage;
