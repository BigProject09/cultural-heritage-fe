// 단계별 라우트

export const flowRoutes = {
  "처리 전 조사": "/pre-investigation",
  "해체": "/disassembly",
  "세척": "/cleaning",
  "강화 처리": "/strengthening",
  "접합": "/joining",
  "복원": "/restoration",
  "색 맞춤": "/color-matching",
  "처리 후 기록": "/post-record",
};

// 다음 단계 찾기
export function getNextStep(approvedFlow, currentStepName) {
  const currentIndex = approvedFlow.findIndex(
    (step) => step.name === currentStepName
  );

  if (
    currentIndex === -1 ||
    currentIndex === approvedFlow.length - 1
  ) {
    return null;
  }

  return approvedFlow[currentIndex + 1];
}

// 이전 단계 찾기
export function getPreviousStep(approvedFlow, currentStepName) {
  const currentIndex = approvedFlow.findIndex(
    (step) => step.name === currentStepName
  );

  if (currentIndex <= 0) {
    return null;
  }

  return approvedFlow[currentIndex - 1];
}