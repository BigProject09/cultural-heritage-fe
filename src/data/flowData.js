export const flowRoutes = {
  해체: "disassembly",
  세척: "cleaning",
  강화: "strengthening",
  접합: "bonding",
  복원: "restoration",
};

export const DEFAULT_GUIDE_FLOW = [
  { id: 2, name: "해체" },
  { id: 3, name: "세척" },
  { id: 4, name: "강화" },
  { id: 5, name: "접합" },
  { id: 6, name: "복원" },
];

export function sanitizeGuideFlow(flow) {
  if (!Array.isArray(flow)) return [];
  return flow.filter((step) => Boolean(flowRoutes[step?.name]));
}

// 다음 단계 찾기
export function getNextStep(approvedFlow, currentStepName) {
  const guideFlow = sanitizeGuideFlow(approvedFlow);
  const currentIndex = guideFlow.findIndex(
    (step) => step.name === currentStepName,
  );

  if (currentIndex === -1 || currentIndex === guideFlow.length - 1) {
    return null;
  }

  return guideFlow[currentIndex + 1];
}

// 이전 단계 찾기
export function getPreviousStep(approvedFlow, currentStepName) {
  const guideFlow = sanitizeGuideFlow(approvedFlow);
  const currentIndex = guideFlow.findIndex(
    (step) => step.name === currentStepName,
  );

  if (currentIndex <= 0) {
    return null;
  }

  return guideFlow[currentIndex - 1];
}
