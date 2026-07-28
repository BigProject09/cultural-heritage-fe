import {
  createContext,
  useContext,
  useState,
} from "react";

const DisassemblyContext = createContext();

export function DisassemblyProvider({
  children,
}) {
  // 작업 ID
  const [taskId, setTaskId] =
    useState(null);

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
  const [methods, setMethods] =
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

  // 강화 추천
const [strengtheningRecommendation, setStrengtheningRecommendation] =
  useState(null);

// 강화 단계별 안내
const [strengtheningGuide, setStrengtheningGuide] =
  useState(null);

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
    strengtheningWettingResult: false,
    strengtheningMethod: false,
    strengtheningPost: false,

      // 접합
      joiningMethod: false,
      joiningMaterial: false,
      joiningWork: false,
      joiningPost: false,

    // 복원
      restorationMethod: false,
      restorationMaterial: false,
      restorationWork: false,
      restorationPost: false,

      // 색 맞춤
      colorMatchingMethod: false,
      colorMatchingMaterial: false,
      colorMatchingWork: false,
      colorMatchingPost: false,
    });

  const resetCompleted = () => {
    setTaskId(null);

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
    setMethods([]);

    setCleaningMethod({
      usePhysical: false,
      useChemical: false,
    });

  setCleaningAnalysis(null);
  setCleaningGuide(null);
  setDryingGuide(null);
  setStrengtheningRecommendation(null);
  setStrengtheningGuide(null);

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
    strengtheningWettingResult: false,
    strengtheningMethod: false,
    strengtheningPost: false,

      // 접합
      joiningMethod: false,
      joiningMaterial: false,
      joiningWork: false,
      joiningPost: false,

     // 복원
      restorationMaterial: false,
      restorationMethod: false,
      restorationPost: false,

      // 색 맞춤
      colorMatchingMethod: false,
      colorMatchingMaterial: false,
      colorMatchingWork: false,
      colorMatchingPost: false,
    });
  };

  return (
    <DisassemblyContext.Provider
      value={{
        taskId,
        setTaskId,

        preInvestigation,
        setPreInvestigation,

        cleaning,
        setCleaning,

        checklist,
        setChecklist,

        tools,
        setTools,

      methods,
      setMethods,

      cleaningMethod,
      setCleaningMethod,

      cleaningAnalysis,
      setCleaningAnalysis,

      cleaningGuide,
      setCleaningGuide,

      dryingGuide,
      setDryingGuide,

     strengtheningRecommendation,
      setStrengtheningRecommendation,

      strengtheningGuide,
      setStrengtheningGuide,

      completed,
      setCompleted,

        resetCompleted,
      }}
    >
      {children}
    </DisassemblyContext.Provider>
  );
}

export function useDisassembly() {
  return useContext(DisassemblyContext);
}