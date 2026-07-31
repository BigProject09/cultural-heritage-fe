// 단계별 라우트

export const flowRoutes = {
  "X-RAY 분석/육안 상태 조사": "/pre-investigation",
  해체: "/disassembly",
  세척: "/cleaning",
  강화: "/strengthening",
  접합: "/bonding",
  복원: "/restoration",
  "보고서 생성": "/post-record",
};

// 다음 단계 찾기
export function getNextStep(approvedFlow, currentStepName) {
  const currentIndex = approvedFlow.findIndex(
    (step) => step.name === currentStepName,
  );

  if (currentIndex === -1 || currentIndex === approvedFlow.length - 1) {
    return null;
  }

  return approvedFlow[currentIndex + 1];
}

// 이전 단계 찾기
export function getPreviousStep(approvedFlow, currentStepName) {
  const currentIndex = approvedFlow.findIndex(
    (step) => step.name === currentStepName,
  );

  if (currentIndex <= 0) {
    return null;
  }

  return approvedFlow[currentIndex - 1];
}
