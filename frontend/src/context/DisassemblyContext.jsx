import { useState } from "react";
import { DisassemblyContext } from "./disassemblyContextValue";

export function DisassemblyProvider({
  children,
}) {
  // 작업 ID
  const [taskId, setTaskId] =
    useState(null);

  // 사용자가 FlowRecommendationPage에서 확정한 단계 순서.
  // location.state로만 넘기면 하위 단계 페이지 ↔ 스테이지 메인 페이지를 오갈 때
  // state가 유실되어 메인 페이지가 기본(전체 7단계) 플로우로 되돌아가는 문제가 있어,
  // taskId처럼 context에 저장해 페이지 이동과 무관하게 유지한다.
  const [approvedFlow, setApprovedFlow] =
    useState(null);
  const [visualResult, setVisualResult] = useState(null);
  // 처리 전 조사
  const [preInvestigation, setPreInvestigation] =
    useState({
      xray: false,
      visual: false,
    });

  // 세척 (추후 AI 데이터 저장용)
  const [cleaning, setCleaning] =
    useState({
      mission1: false,
      mission2: false,
      mission3: false,
    });

  // 해체 체크리스트
  const [checklist, setChecklist] =
    useState([]);

  // 해체 도구
  const [tools, setTools] =
    useState([]);

  // 해체 방법
  const [disassemblyMethod, setDisassemblyMethod] =
    useState([]);

  // 해체 - 사용자가 실제로 선택한 도구 이름 목록 (보고서용)
  const [selectedTools, setSelectedTools] =
    useState([]);

  // 해체 전 조사 - 체크된 항목 id (페이지 이동 후 복귀해도 유지)
  const [checklistSelection, setChecklistSelection] =
    useState([]);

  // 해체 도구 - 현재 선택 중인 도구 id (페이지 이동 후 복귀해도 유지)
  const [toolSelection, setToolSelection] =
    useState([]);

  // 해체 방법 - 승인/수정 중인 단계 목록 (페이지 이동 후 복귀해도 유지)
  const [methodWorkingSteps, setMethodWorkingSteps] =
    useState([]);

    // 세척 방법
    const [cleaningMethod, setCleaningMethod] =
      useState({
        usePhysical: false,
        useChemical: false,
      });

      const [cleaningAnalysis, setCleaningAnalysis] = useState(null);

      const [cleaningGuide, setCleaningGuide] = useState(null);

      const [dryingGuide, setDryingGuide] = useState(null);

      // 세척 - 사용자가 실제로 선택한 물리/화학 세척 여부 (보고서용)
      const [cleaningSelection, setCleaningSelection] = useState({
        usePhysical: false,
        useChemical: false,
      });

  // 강화 추천
const [strengtheningRecommendation, setStrengtheningRecommendation] =
  useState(null);

// 강화 단계별 안내
const [strengtheningGuide, setStrengtheningGuide] =
  useState(null);

// 강화 습윤 효과(색 변화) 분석 결과
const [colorChangeAnalysis, setColorChangeAnalysis] =
  useState(null);

// 강화 - 사용자가 실제로 선택한 강화제/용제 (보고서용)
const [strengtheningChoice, setStrengtheningChoice] =
  useState({ agent: "", solvent: "" });

// 접합 접착제 추천
const [bondingAdhesive, setBondingAdhesive] =
  useState(null);

// 접합 단계별 안내
const [bondingGuide, setBondingGuide] =
  useState(null);

// 접합 - 사용자가 실제로 선택한 접합제 (보고서용)
const [bondingChoice, setBondingChoice] =
  useState({ adhesive: "" });

// 복원 재료 추천
const [restorationMaterial, setRestorationMaterial] =
  useState(null);

// 복원 단계별 안내
const [restorationGuide, setRestorationGuide] =
  useState(null);

// 복원 - 사용자가 실제로 선택한 복원제 (보고서용)
const [restorationChoice, setRestorationChoice] =
  useState({ material: "" });

  // 각 단계 완료 여부
  const [completed, setCompleted] =
    useState({
      // 해체
      checklist: false,
      tool: false,
      method: false,
      post: false,

      // 세척
      cleaningMethod: false,
      cleaningStep: false,
      cleaningDryingStep: false,
      cleaningPost: false,

     // 강화 처리
    strengtheningMaterial: false,
    strengtheningWetting: false,
    strengtheningMethod: false,
    strengtheningPost: false,

      // 접합
      bondingMethod: false,
      bondingMaterial: false,
      bondingWork: false,
      bondingPost: false,

    // 복원
      restorationMethod: false,
      restorationMaterial: false,
      restorationWork: false,
      restorationPost: false,

      });

  // 하위 단계 페이지에서 "완료" 버튼을 누르면 응답을 기다리지 않고 바로 메인 페이지로
  // 돌아가고, resume 요청은 백그라운드에서 계속 진행된다. 이 목록에 들어있는 동안
  // 메인 페이지가 해당 단계 아이콘을 로딩 스피너로 표시한다.
  const [savingSteps, setSavingSteps] = useState(new Set());

  const setStepSaving = (key, isSaving) => {
    setSavingSteps((prev) => {
      const next = new Set(prev);
      if (isSaving) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const resetCompleted = () => {
    setTaskId(null);
    setApprovedFlow(null);

    setPreInvestigation({
      xray: false,
      visual: false,
    });

    setCleaning({
      mission1: false,
      mission2: false,
      mission3: false,
    });

    setChecklist([]);
    setTools([]);
    setDisassemblyMethod([]);
    setSelectedTools([]);
    setChecklistSelection([]);
    setToolSelection([]);
    setMethodWorkingSteps([]);

    setCleaningMethod({
      usePhysical: false,
      useChemical: false,
    });

  setCleaningAnalysis(null);
  setVisualResult(null);
  setCleaningGuide(null);
  setDryingGuide(null);
  setCleaningSelection({ usePhysical: false, useChemical: false });
  setStrengtheningRecommendation(null);
  setStrengtheningGuide(null);
  setColorChangeAnalysis(null);
  setStrengtheningChoice({ agent: "", solvent: "" });
  setBondingAdhesive(null);
  setBondingGuide(null);
  setBondingChoice({ adhesive: "" });
  setRestorationMaterial(null);
  setRestorationGuide(null);
  setRestorationChoice({ material: "" });
  setSavingSteps(new Set());

    setCompleted({
      // 해체
      checklist: false,
      tool: false,
      method: false,
      post: false,

      // 세척
      cleaningMethod: false,
      cleaningStep: false,
      cleaningDryingStep: false,
      cleaningPost: false,

      // 강화 처리
    strengtheningMaterial: false,
    strengtheningWetting: false,
    strengtheningMethod: false,
    strengtheningPost: false,

      // 접합
      bondingMethod: false,
      bondingMaterial: false,
      bondingWork: false,
      bondingPost: false,

     // 복원
      restorationMaterial: false,
      restorationMethod: false,
      restorationPost: false,

    });
  };

  return (
    <DisassemblyContext.Provider
      value={{
        taskId,
        setTaskId,

        visualResult,
        setVisualResult,
        
        approvedFlow,
        setApprovedFlow,

        preInvestigation,
        setPreInvestigation,

        cleaning,
        setCleaning,

        checklist,
        setChecklist,

        tools,
        setTools,

      disassemblyMethod,
      setDisassemblyMethod,

      selectedTools,
      setSelectedTools,

      checklistSelection,
      setChecklistSelection,

      toolSelection,
      setToolSelection,

      methodWorkingSteps,
      setMethodWorkingSteps,

      cleaningMethod,
      setCleaningMethod,

      cleaningAnalysis,
      setCleaningAnalysis,

      cleaningGuide,
      setCleaningGuide,

      dryingGuide,
      setDryingGuide,

      cleaningSelection,
      setCleaningSelection,

     strengtheningRecommendation,
      setStrengtheningRecommendation,

      strengtheningGuide,
      setStrengtheningGuide,

      colorChangeAnalysis,
      setColorChangeAnalysis,

      strengtheningChoice,
      setStrengtheningChoice,

      bondingAdhesive,
      setBondingAdhesive,

      bondingGuide,
      setBondingGuide,

      bondingChoice,
      setBondingChoice,

      restorationMaterial,
      setRestorationMaterial,

      restorationGuide,
      setRestorationGuide,

      restorationChoice,
      setRestorationChoice,

      completed,
      setCompleted,

      savingSteps,
      setStepSaving,

        resetCompleted,
      }}
    >
      {children}
    </DisassemblyContext.Provider>
  );
}
