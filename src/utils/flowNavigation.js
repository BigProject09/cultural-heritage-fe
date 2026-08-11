import {
  flowRoutes,
  sanitizeGuideFlow,
} from "../data/flowData";
import {
  getActiveArtifactId,
  markWorkspaceModule,
  MODULE_STATUS,
} from "../data/workspaceProjects";
import {
  getArtifactRoute,
  getArtifactWorkflowRoute,
} from "./artifactRoutes";

export const getNextStep = (approvedFlow, currentStep) => {
  const guideFlow = sanitizeGuideFlow(approvedFlow);
  const currentIndex = guideFlow.findIndex(
    (step) => step.name === currentStep
  );

  if (
    currentIndex === -1 ||
    currentIndex === guideFlow.length - 1
  ) {
    return null;
  }

  return guideFlow[currentIndex + 1];
};

const STAGE_COMPLETE_KEY = {
  해체: "post",
  세척: "cleaningPost",
  강화: "strengtheningPost",
  접합: "bondingPost",
  복원: "restorationPost",
};

// approvedFlow 중 아직 끝나지 않은 첫 단계. 전부 끝났으면 null.
export const getCurrentStep = (approvedFlow, completed = {}) => {
  const guideFlow = sanitizeGuideFlow(approvedFlow);
  return (
    guideFlow.find((step) => !completed[STAGE_COMPLETE_KEY[step.name]]) ||
    null
  );
};

export const getPreviousStep = (approvedFlow, currentStep) => {
  const guideFlow = sanitizeGuideFlow(approvedFlow);
  const currentIndex = guideFlow.findIndex(
    (step) => step.name === currentStep
  );

  if (currentIndex <= 0) {
    return null;
  }

  return guideFlow[currentIndex - 1];
};

export const moveToNextStep = async (
  navigate,
  approvedFlow,
  currentStep
) => {
  const guideFlow = sanitizeGuideFlow(approvedFlow);
  const currentIndex = guideFlow.findIndex(
    (step) => step.name === currentStep,
  );
  const nextStep = getNextStep(approvedFlow, currentStep);

  if (currentIndex === -1) return;

  if (!nextStep) {
    const artifactId = getActiveArtifactId();

    if (!artifactId) {
      navigate("/worklist", { replace: true });
      return;
    }

    await markWorkspaceModule(
      artifactId,
      "guide",
      MODULE_STATUS.DONE,
    );
    navigate(getArtifactRoute(artifactId), {
      replace: true,
      state: { guideCompleted: true },
    });
    return;
  }

  navigate(
    getArtifactWorkflowRoute(
      getActiveArtifactId(),
      flowRoutes[nextStep.name],
    ),
    {
    state: {
      approvedFlow: guideFlow,
    },
    },
  );
};

export const moveToPreviousStep = (
  navigate,
  approvedFlow,
  currentStep
) => {
  const guideFlow = sanitizeGuideFlow(approvedFlow);
  const previousStep = getPreviousStep(
    guideFlow,
    currentStep
  );

  if (!previousStep) return;

  navigate(
    getArtifactWorkflowRoute(
      getActiveArtifactId(),
      flowRoutes[previousStep.name],
    ),
    {
    state: {
      approvedFlow: guideFlow,
    },
    },
  );
};
