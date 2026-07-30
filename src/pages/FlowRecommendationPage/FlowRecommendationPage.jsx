import "./FlowRecommendationPage.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { startTask } from "../../services/conservationGuideApi";
import { useDisassembly } from "../../context/useDisassembly";
import { applyInterrupt } from "../../utils/applyInterrupt";

// 백엔드에 AI 추천 Flow API가 아직 없어서, 발표용으로 임시 하드코딩한 값.
// 실제 추천 API가 생기면 이 상수 대신 서버 응답으로 교체해야 함.
const AI_RECOMMENDED_FLOW = [
  { id: 1, name: "처리 전 조사" },
  { id: 2, name: "해체" },
  { id: 3, name: "세척" },
  { id: 4, name: "강화" },
  { id: 5, name: "접합" },
  { id: 6, name: "복원" },
  { id: 8, name: "처리 후 기록" },
];

function FlowRecommendationPage() {
  const navigate = useNavigate();

  const [steps, setSteps] = useState([
    { id: 1, name: "처리 전 조사", active: true, mandatory: true },
    { id: 2, name: "해체", active: false },
    { id: 3, name: "세척", active: false },
    { id: 4, name: "강화", active: false },
    { id: 5, name: "접합", active: false },
    { id: 6, name: "복원", active: false },
    { id: 8, name: "처리 후 기록", active: true, mandatory: true },
  ]);

  const aiFlow = AI_RECOMMENDED_FLOW;

  const [loading, setLoading] = useState(false);

  const ctx = useDisassembly();
  const { setTaskId, setApprovedFlow } = ctx;

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

  // 해체/세척/강화 처리/접합/복원만 AI 백엔드가 인식하는 단계라, 이 이름들만 골라 변환
  // (처리 전 조사·처리 후 기록은 아직 백엔드에 대응하는 단계가 없음)
  const FLOW_NAME_TO_KEY = {
    해체: "disassembly",
    세척: "cleaning",
    강화: "reinforcement",
    접합: "bonding",
    복원: "restoration",
  };

  const approvedFlowKeys = approvedFlow
    .map((step) => FLOW_NAME_TO_KEY[step.name])
    .filter(Boolean);

  // 다음 버튼 : 사용자가 확정한 Flow로만 AI 작업을 시작
  const handleNext = async () => {
    setApprovedFlow(approvedFlow);

    const artifactInfo = JSON.parse(localStorage.getItem("artifactInfo"));

    if (!artifactInfo) {
      navigate("/pre-investigation", { state: { approvedFlow } });
      return;
    }

    const taskId = `task-${Date.now()}`;

    // 유물 사진(image)은 relicPhoto로 따로 보내고, relicInfo엔 유물 속성만 담는다
    const { image, ...relicInfo } = artifactInfo;

    setLoading(true);

    try {
      const result = await startTask(taskId, {
        taskName: "문화재 복원",
        taskManager: "오서하",
        relicInfo,

        // 이미지가 있으면 배열로 보내고,
        // 없으면 빈 배열 전송
        relicPhoto: image ? [image] : [],

        // 사용자가 "Flow 수정"에서 선택한 단계만 전달
        flow: approvedFlowKeys,
      });

      setTaskId(taskId);

      // 어느 단계가 flow에서 빠졌는지에 따라 이 응답에 실려오는 interrupt가 다를 수 있어서,
      // 들어있는 키에 맞는 context를 전부 채워주는 공통 함수로 처리한다.
      applyInterrupt(result.interrupt, ctx);

      navigate("/pre-investigation", { state: { approvedFlow } });
    } catch (error) {
      console.error("Flow 시작 실패:", error);
      alert("AI 작업 시작에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flow-page">
      {/* Header */}
      <div className="top-bar">
        <button
          className="nav-btn"
          onClick={() => navigate("/artifact-register")}
        >
          ← 이전
        </button>

        <div className="logo" onClick={() => navigate("/")}>
          VORA
        </div>

        <button className="nav-btn" disabled={loading} onClick={handleNext}>
          Flow 결정 →
        </button>
      </div>

      <div className="flow-container">
        {/* Flow 수정 */}
        <div className="flow-box">
          <h2>Flow 수정</h2>

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

        {/* 추천 Flow : 발표용 임시 하드코딩 (AI_RECOMMENDED_FLOW 참고) */}
        <div className="flow-box">
          <h2>추천 Flow</h2>

          {aiFlow.map((step, index) => (
            <div key={step.id} className="flow-step">
              <div className="ai-step">{step.name}</div>

              {index !== aiFlow.length - 1 && <div className="arrow">↓</div>}
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="analyzing-overlay">
          <div className="analyzing-box">
            <p>Flow 추천 중...</p>

            <div className="analyzing-bar-track">
              <div className="analyzing-bar-fill" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlowRecommendationPage;
