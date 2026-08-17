import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useDisassembly } from "../../context/useDisassembly";
import { flowRoutes, sanitizeGuideFlow } from "../../data/flowData";
import {
  canAccessGuideStage,
  getCurrentStep,
} from "../../utils/flowNavigation";
import { getArtifactWorkflowRoute } from "../../utils/artifactRoutes";

const ROUTE_STAGE_NAME = {
  disassembly: "해체",
  cleaning: "세척",
  strengthening: "강화",
  bonding: "접합",
  restoration: "복원",
};

const SUBSTEP_REQUIREMENTS = {
  "disassembly/checklist": [],
  "disassembly/tool": ["checklist"],
  "disassembly/method": ["checklist", "tool"],

  "cleaning/method-select": [],
  "cleaning/step": ["cleaningMethod"],
  "cleaning/drying": ["cleaningMethod", "cleaningStep"],

  "strengthening/material": [],
  "strengthening/wetting": ["strengtheningMaterial"],
  "strengthening/method": [
    "strengtheningMaterial",
    "strengtheningWetting",
  ],

  "bonding/material": [],
  "bonding/work": ["bondingMaterial"],
  "bonding/method": ["bondingMaterial", "bondingWork"],

  "restoration/material": [],
  "restoration/method": ["restorationMaterial"],
  "restoration/finishing": [
    "restorationMaterial",
    "restorationMethod",
  ],
};

function GuideFlowGuard() {
  const { artifactId: routeArtifactId = "" } = useParams();
  const artifactId = decodeURIComponent(routeArtifactId);
  const { pathname } = useLocation();
  const { taskId, approvedFlow, completed } = useDisassembly();

  const match = pathname.match(
    /\/guide\/(disassembly|cleaning|strengthening|bonding|restoration)(?:\/([^/]+))?\/?$/,
  );

  if (!match) return <Outlet />;

  if (!taskId) {
    return (
      <Navigate
        to={getArtifactWorkflowRoute(artifactId)}
        replace
      />
    );
  }

  const [, stageRoute, subRoute = ""] = match;
  const targetStageName = ROUTE_STAGE_NAME[stageRoute];
  const guideFlow = sanitizeGuideFlow(approvedFlow);

  // 선택하지 않은 공정, 또는 이전 공정 미완료 상태의 미래 공정은 차단.
  if (
    guideFlow.length === 0 ||
    !canAccessGuideStage(guideFlow, completed, targetStageName)
  ) {
    const currentStep = getCurrentStep(guideFlow, completed);

    return (
      <Navigate
        to={
          currentStep
            ? getArtifactWorkflowRoute(
                artifactId,
                flowRoutes[currentStep.name],
              )
            : getArtifactWorkflowRoute(artifactId, "result")
        }
        replace
      />
    );
  }

  // 같은 공정 안에서도 앞 세부작업을 완료하지 않고 URL로 건너뛰는 것을 차단.
  const requirementKey = subRoute
    ? `${stageRoute}/${subRoute}`
    : "";
  const requirements = SUBSTEP_REQUIREMENTS[requirementKey] || [];
  const missingRequiredStep = requirements.some(
    (key) => !completed[key],
  );

  if (missingRequiredStep) {
    return (
      <Navigate
        to={getArtifactWorkflowRoute(artifactId, stageRoute)}
        replace
      />
    );
  }

  return <Outlet />;
}

export default GuideFlowGuard;
