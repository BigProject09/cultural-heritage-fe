import "./FlowRecommendationPage.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { startTask } from "../../services/conservationGuideApi";
import { useDisassembly } from "../../context/DisassemblyContext";

function FlowRecommendationPage() {
  const navigate = useNavigate();

  const [steps, setSteps] = useState([
    { id: 1, name: "처리 전 조사", active: true },
    { id: 2, name: "해체", active: false },
    { id: 3, name: "세척", active: true },
    { id: 4, name: "강화 처리", active: true },
    { id: 5, name: "접합", active: true },
    { id: 6, name: "복원", active: true },
    { id: 7, name: "색 맞춤", active: false },
    { id: 8, name: "처리 후 기록", active: true },
  ]);

  const [aiFlow, setAiFlow] = useState([]);
 const {
  setTaskId,
  setChecklist,
  setCleaningMethod,
  setCleaningAnalysis,
  setCleaningGuide,
  setDryingGuide,
} = useDisassembly();

  const toggleStep = (id) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id
          ? { ...step, active: !step.active }
          : step
      )
    );
  };

  // 사용자가 최종 승인한 Flow
  const approvedFlow = steps.filter((step) => step.active);

  // 다음 버튼
  const handleNext = () => {
    navigate("/pre-investigation", {
      state: {
        approvedFlow,
      },
    });
  };

  useEffect(() => {
  const fetchFlow = async () => {

    console.log("① fetchFlow 시작");

    const artifactInfo = JSON.parse(
      localStorage.getItem("artifactInfo")
    );

    console.log("② artifactInfo =", artifactInfo);

    if (!artifactInfo) {
      console.log("③ artifactInfo가 없어서 종료");
      return;
    }

    console.log("④ API 호출 직전");

    const taskId = `task-${Date.now()}`;

      try {
          const result = await startTask(taskId, {
            taskName: "문화재 복원",
          taskManager: "오서하",
          relicInfo: artifactInfo,

          // 이미지가 있으면 배열로 보내고,
          // 없으면 빈 배열 전송
          relicPhoto: artifactInfo.image
            ? [artifactInfo.image]
            : [],

          // API 명세에 맞게 해체 Flow 전달
          flow: [
            "disassembly",
            "cleaning",
            "reinforcement",
            "bonding",
            "restoration",
            "post_record",
          ],
        });

      console.log("API 응답 =", result);
      console.log("생성한 taskId =", taskId);

      console.log("Flow 추천 결과:", result);
      console.log("response =", response);

      console.log("result =", result);
      console.log("taskId =", taskId);

      setTaskId(taskId);
      console.log("Context 저장 =", taskId);

      console.log("setTaskId =", taskId);
      console.log("interrupt 확인:", result.interrupt);
      if (result.interrupt?.ai_checklist?.checklist) {
        setChecklist(result.interrupt.ai_checklist.checklist);
      }

      // 세척 AI 데이터 저장
      if (result.interrupt?.cleaning_method) {
        setCleaningMethod(result.interrupt.cleaning_method);
      }

      if (result.interrupt?.cleaning_analysis) {
        setCleaningAnalysis(result.interrupt.cleaning_analysis);
      }

      if (result.interrupt?.cleaning_guide) {
        setCleaningGuide(result.interrupt.cleaning_guide);
      }

      if (result.interrupt?.drying_guide) {
        setDryingGuide(result.interrupt.drying_guide);
      }

      console.log(
        "체크리스트:",
        result.interrupt?.ai_checklist?.checklist
      );
      
        // 추천 Flow 저장
        setAiFlow(result.flow || result.recommendedFlow || []);

    } catch (error) {
  console.error("Flow 추천 실패:", error);
  console.log("error.response =", error.response);
  console.log("error.data =", error.response?.data);
}
    };

    fetchFlow();
  }, []);

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

        <div
          className="logo"
          onClick={() => navigate("/")}
        >
          VORA
        </div>

        <button
          className="nav-btn"
          onClick={handleNext}
        >
          Flow 결정 →
        </button>

      </div>

      <div className="flow-container">

        {/* Flow 수정 */}
        <div className="flow-box">

          <h2>Flow 수정</h2>

          {steps.map((step, index) => (

            <div
              key={step.id}
              className="flow-step"
            >

              <button
                className={
                  step.active
                    ? "step-btn active"
                    : "step-btn inactive"
                }
                onClick={() => toggleStep(step.id)}
              >
                {step.name}
              </button>

              {index !== steps.length - 1 && (
                <div className="arrow">
                  ↓
                </div>
              )}

            </div>

          ))}

        </div>

        {/* 추천 Flow */}
        <div className="flow-box">

          <h2>추천 Flow</h2>

          {aiFlow.map((step, index) => (

            <div
              key={index}
              className="flow-step"
            >

              <div className="ai-step">
                {step}
              </div>

              {index !== aiFlow.length - 1 && (
                <div className="arrow">
                  ↓
                </div>
              )}

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

export default FlowRecommendationPage;