import { createContext, useContext, useState } from "react";

const DisassemblyContext = createContext();

export function DisassemblyProvider({ children }) {
  // 해체 진행 상태
  const [completed, setCompleted] = useState({
    checklist: false,
    tool: false,
    method: false,
  });

  // 처리 전 조사 진행 상태
  const [preInvestigation, setPreInvestigation] = useState({
    xray: false,
    visual: false,
  });

  // 세척 진행 상태
  const [cleaning, setCleaning] = useState({
    mission1: false,
    mission2: false,
    mission3: false,
  });

  // 강화 처리 진행 상태
  const [strengthening, setStrengthening] = useState({
    mission1: false,
    mission2: false,
    mission3: false,
  });

  const resetCompleted = () => {
    // 해체 초기화
    setCompleted({
      checklist: false,
      tool: false,
      method: false,
    });

    // 처리 전 조사 초기화
    setPreInvestigation({
      xray: false,
      visual: false,
    });

    // 세척 초기화
    setCleaning({
      mission1: false,
      mission2: false,
      mission3: false,
    });

    // 강화 처리 초기화
    setStrengthening({
      mission1: false,
      mission2: false,
      mission3: false,
    });
  };

  return (
    <DisassemblyContext.Provider
      value={{
        // 해체
        completed,
        setCompleted,

        // 처리 전 조사
        preInvestigation,
        setPreInvestigation,

        // 세척
        cleaning,
        setCleaning,

        // 강화 처리
        strengthening,
        setStrengthening,

        // 전체 초기화
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