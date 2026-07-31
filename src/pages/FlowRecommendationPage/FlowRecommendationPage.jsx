import "./FlowRecommendationPage.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { startTask } from "../../services/conservationGuideApi";
import { useDisassembly } from "../../context/useDisassembly";
import { applyInterrupt } from "../../utils/applyInterrupt";

const AI_RECOMMENDED_FLOW = [
  { id: 1, name: "X-RAY 분석/육안 상태 조사" },
  { id: 2, name: "해체" },
  { id: 3, name: "세척" },
  { id: 4, name: "강화" },
  { id: 5, name: "접합" },
  { id: 6, name: "복원" },
  { id: 8, name: "보고서 생성" },
];

function FlowRecommendationPage() {
  const navigate = useNavigate();

  const [steps, setSteps] = useState([
    { id: 1, name: "X-RAY 분석/육안 상태 조사", active: true, mandatory: true },
    { id: 2, name: "해체", active: true },
    { id: 3, name: "세척", active: true },
    { id: 4, name: "강화", active: true },
    { id: 5, name: "접합", active: true },
    { id: 6, name: "복원", active: true },
    { id: 8, name: "보고서 생성", active: true, mandatory: true },
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

  const approvedFlow = steps.filter((step) => step.active);

  // X-RAY 분석/육안 상태 조사, 보고서 생성은 항상 고정 단계라 이 화면에서
  // 고르거나 볼 필요가 없어 목록에서만 숨긴다 (approvedFlow 자체는 그대로 유지).
  const HIDDEN_STEP_NAMES = ["X-RAY 분석/육안 상태 조사", "보고서 생성"];
  const displaySteps = steps.filter(
    (step) => !HIDDEN_STEP_NAMES.includes(step.name),
  );
  const displayAiFlow = aiFlow.filter(
    (step) => !HIDDEN_STEP_NAMES.includes(step.name),
  );

  // X-RAY 분석/육안 상태 조사는 작업 시작 전 단계이므로 Flow 요청에서 제외
  const FLOW_NAME_TO_KEY = {
    해체: "disassembly",
    세척: "cleaning",
    강화: "reinforcement",
    접합: "bonding",
    복원: "restoration",
    "보고서 생성": "post_record",
  };

  const approvedFlowKeys = approvedFlow
    .map((step) => FLOW_NAME_TO_KEY[step.name])
    .filter(Boolean);

  const handleNext = async () => {
    if (approvedFlowKeys.length === 0) {
      alert("복원 처리 단계를 한 개 이상 선택해주세요.");
      return;
    }

    const artifactInfo = JSON.parse(
      localStorage.getItem("artifactInfo") || "null",
    );

    const loginUser = JSON.parse(localStorage.getItem("loginUser") || "null");

    if (!artifactInfo) {
      alert("등록된 유물 정보가 없습니다.");
      navigate("/artifact-register");
      return;
    }

    if (!loginUser?.name) {
      alert("로그인 정보가 없습니다. 다시 로그인해주세요.");
      navigate("/login");
      return;
    }

    if (!artifactInfo?.name) {
      alert("등록된 유물명이 없습니다.");
      return;
    }

    setApprovedFlow(approvedFlow);

    const taskId = `task-${Date.now()}`;

    setLoading(true);

    try {
      const requestData = {
        // 등록한 유물명 사용
        taskName: `${artifactInfo.name} 복원`,

        // 현재 로그인 사용자 이름 사용
        taskManager: loginUser.name,

        relicInfo: artifactInfo,

        relicPhoto: artifactInfo.image ? [artifactInfo.image] : [],

        flow: approvedFlowKeys,
      };

      console.log("Flow 시작 요청:", requestData);

      const result = await startTask(taskId, requestData);

      setTaskId(taskId);
      applyInterrupt(result.interrupt, ctx);

      navigate("/pre-investigation", {
        state: { approvedFlow },
      });
    } catch (error) {
      console.error("Flow 시작 실패:", error);
      console.error("서버 응답:", error.response?.data);
      console.error("HTTP 상태:", error.response?.status);

      const responseData = error.response?.data;

      const serverMessage =
        responseData?.message ||
        responseData?.error ||
        (typeof responseData === "string" ? responseData : null);

      alert(
        serverMessage === "Internal Server Error"
          ? "서버 내부 오류가 발생했습니다. Spring 로그를 확인해주세요."
          : serverMessage || "AI 작업 시작에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flow-page">
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
          시작하기 →
        </button>
      </div>

      <div className="flow-container">
        <div className="flow-box">
          <h2>추천 공정</h2>

          {displayAiFlow.map((step, index) => (
            <div key={step.id} className="flow-step">
              <div className="ai-step">{step.name}</div>

              {index !== displayAiFlow.length - 1 && (
                <div className="arrow">↓</div>
              )}
            </div>
          ))}
        </div>

        <div className="flow-box">
          <h2>최종 공정</h2>

          {displaySteps.map((step, index) => (
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

              {index !== displaySteps.length - 1 && (
                <div className="arrow">↓</div>
              )}
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
