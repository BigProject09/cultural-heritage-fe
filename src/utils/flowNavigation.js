import { flowRoutes } from "../data/flowData";

export const getNextStep = (approvedFlow, currentStep) => {
  const currentIndex = approvedFlow.findIndex(
    (step) => step.name === currentStep
  );

  if (
    currentIndex === -1 ||
    currentIndex === approvedFlow.length - 1
  ) {
    return null;
  }

  return approvedFlow[currentIndex + 1];
};

export const getPreviousStep = (approvedFlow, currentStep) => {
  const currentIndex = approvedFlow.findIndex(
    (step) => step.name === currentStep
  );

  if (currentIndex <= 0) {
    return null;
  }

  return approvedFlow[currentIndex - 1];
};

export const moveToNextStep = (
  navigate,
  approvedFlow,
  currentStep
) => {
  const nextStep = getNextStep(approvedFlow, currentStep);

  if (!nextStep) return;

  navigate(flowRoutes[nextStep.name], {
    state: {
      approvedFlow,
    },
  });
};

export const moveToPreviousStep = (
  navigate,
  approvedFlow,
  currentStep
) => {
  const previousStep = getPreviousStep(
    approvedFlow,
    currentStep
  );

  if (!previousStep) return;

  navigate(flowRoutes[previousStep.name], {
    state: {
      approvedFlow,
    },
  });
};