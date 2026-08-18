import { DEFAULT_GUIDE_FLOW } from "../data/flowData";
import { getArtifactWorkflowRoute } from "./artifactRoutes";
import { applyInterrupt } from "./applyInterrupt";

const FLOW_KEY_TO_NAME = {
  disassembly: "해체",
  cleaning: "세척",
  reinforcement: "강화",
  strengthening: "강화",
  bonding: "접합",
  restoration: "복원",
};

const STAGE_KEYS = {
  해체: ["checklist", "tool", "method", "post"],
  세척: [
    "cleaningMethod",
    "cleaningStep",
    "cleaningDryingStep",
    "cleaningPost",
  ],
  강화: [
    "strengtheningMaterial",
    "strengtheningWetting",
    "strengtheningMethod",
    "strengtheningPost",
  ],
  접합: ["bondingMaterial", "bondingWork", "bondingMethod", "bondingPost"],
  복원: [
    "restorationMaterial",
    "restorationMethod",
    "restorationFinishing",
    "restorationPost",
  ],
};

const EMPTY_COMPLETED = {
  checklist: false,
  tool: false,
  method: false,
  post: false,
  cleaningMethod: false,
  cleaningStep: false,
  cleaningDryingStep: false,
  cleaningPost: false,
  strengtheningMaterial: false,
  strengtheningWetting: false,
  strengtheningMethod: false,
  strengtheningPost: false,
  bondingMaterial: false,
  bondingWork: false,
  bondingMethod: false,
  bondingPost: false,
  restorationMaterial: false,
  restorationMethod: false,
  restorationFinishing: false,
  restorationPost: false,
};

const INTERRUPT_ROUTES = [
  {
    startsWith: "해체 - 체크리스트",
    stage: "해체",
    route: "disassembly/checklist",
    completedInStage: [],
  },
  {
    startsWith: "해체 - 도구",
    stage: "해체",
    route: "disassembly/tool",
    completedInStage: ["checklist"],
  },
  {
    startsWith: "해체 - 단계별",
    stage: "해체",
    route: "disassembly/method",
    completedInStage: ["checklist", "tool"],
  },
  {
    startsWith: "해체 - 마지막 단계",
    stage: "해체",
    route: "disassembly",
    completedInStage: ["checklist", "tool", "method"],
  },
  {
    startsWith: "세척 - 진행할 세척법",
    stage: "세척",
    route: "cleaning/method-select",
    completedInStage: [],
  },
  {
    startsWith: "세척 - 단계별",
    stage: "세척",
    route: "cleaning/step",
    completedInStage: ["cleaningMethod"],
  },
  {
    startsWith: "세척 - 건조 완료",
    stage: "세척",
    route: "cleaning/drying",
    completedInStage: ["cleaningMethod", "cleaningStep"],
  },
  {
    startsWith: "세척 - 마지막 단계",
    stage: "세척",
    route: "cleaning",
    completedInStage: ["cleaningMethod", "cleaningStep", "cleaningDryingStep"],
  },
  {
    startsWith: "강화처리 - 강화제와 유기용매",
    stage: "강화",
    route: "strengthening/material",
    completedInStage: [],
  },
  {
    startsWith: "강화처리 - 습윤 효과 테스트용",
    stage: "강화",
    route: "strengthening/wetting",
    completedInStage: ["strengtheningMaterial"],
  },
  {
    startsWith: "강화처리 - 색 변화 분석 결과",
    stage: "강화",
    route: "strengthening/wetting",
    completedInStage: ["strengtheningMaterial"],
  },
  {
    startsWith: "강화처리 - 단계별",
    stage: "강화",
    route: "strengthening/method",
    completedInStage: ["strengtheningMaterial", "strengtheningWetting"],
  },
  {
    startsWith: "강화처리 - 마지막 단계",
    stage: "강화",
    route: "strengthening",
    completedInStage: [
      "strengtheningMaterial",
      "strengtheningWetting",
      "strengtheningMethod",
    ],
  },
  {
    startsWith: "접합 - 접착제를 선택",
    stage: "접합",
    route: "bonding/material",
    completedInStage: [],
  },
  {
    startsWith: "접합 - 임시접합 전/후 사진",
    stage: "접합",
    route: "bonding/work",
    completedInStage: ["bondingMaterial"],
  },
  {
    startsWith: "접합 - 임시접합 검증 결과",
    stage: "접합",
    route: "bonding/work",
    completedInStage: ["bondingMaterial"],
  },
  {
    startsWith: "접합 - 단계별",
    stage: "접합",
    route: "bonding/method",
    completedInStage: ["bondingMaterial", "bondingWork"],
  },
  {
    startsWith: "접합 - 마지막 단계",
    stage: "접합",
    route: "bonding",
    completedInStage: ["bondingMaterial", "bondingWork", "bondingMethod"],
  },
  {
    startsWith: "복원 - 복원 재료를 선택",
    stage: "복원",
    route: "restoration/material",
    completedInStage: [],
  },
  {
    startsWith: "복원 - 단계별",
    stage: "복원",
    route: "restoration/method",
    completedInStage: ["restorationMaterial"],
  },
  {
    startsWith: "복원 - 마감처리",
    stage: "복원",
    route: "restoration/finishing",
    completedInStage: ["restorationMaterial", "restorationMethod"],
  },
  {
    startsWith: "복원 - 마지막 단계",
    stage: "복원",
    route: "restoration",
    completedInStage: [
      "restorationMaterial",
      "restorationMethod",
      "restorationFinishing",
    ],
  },
];

export function taskFlowToApprovedFlow(flow) {
  if (!Array.isArray(flow)) return [];

  const byName = new Map(DEFAULT_GUIDE_FLOW.map((step) => [step.name, step]));

  return flow
    .map((value) => {
      const raw = typeof value === "string" ? value : value?.name;
      const name = FLOW_KEY_TO_NAME[raw] || raw;
      const template = byName.get(name);
      return template ? { ...template } : null;
    })
    .filter(Boolean);
}

function findInterruptDescriptor(interrupt) {
  const stage = String(interrupt?.stage || "");
  return (
    INTERRUPT_ROUTES.find((item) => stage.startsWith(item.startsWith)) || null
  );
}

function markWholeStage(completed, stageName) {
  for (const key of STAGE_KEYS[stageName] || []) {
    completed[key] = true;
  }
}

export function buildRecoveredCompleted(task) {
  const completed = { ...EMPTY_COMPLETED };
  const approvedFlow = taskFlowToApprovedFlow(task?.flow);

  if (String(task?.totalState || "").toUpperCase() === "COMPLETED") {
    approvedFlow.forEach((step) => markWholeStage(completed, step.name));
    return completed;
  }

  const descriptor = findInterruptDescriptor(task?.currentInterrupt);
  if (!descriptor) return completed;

  const currentStageIndex = approvedFlow.findIndex(
    (step) => step.name === descriptor.stage,
  );

  if (currentStageIndex > 0) {
    approvedFlow
      .slice(0, currentStageIndex)
      .forEach((step) => markWholeStage(completed, step.name));
  }

  for (const key of descriptor.completedInStage) {
    completed[key] = true;
  }

  return completed;
}

function applyStoredResults(results, ctx) {
  if (!results || !ctx) return;

  const disassembly = results.disassembly || {};
  if (disassembly.ai_checklist) {
    ctx.setChecklist(disassembly.ai_checklist.checklist || []);
    ctx.setChecklistCaution(disassembly.ai_checklist.caution || "");
  }
  if (disassembly.confirmed_checklist?.checked_ids) {
    ctx.setChecklistSelection(disassembly.confirmed_checklist.checked_ids);
  }
  if (disassembly.ai_tools) {
    const tools = disassembly.ai_tools.recommended_tools || [];
    ctx.setTools(tools);
    ctx.setToolsReason(disassembly.ai_tools.reason || "");
    ctx.setToolsPrecautions(disassembly.ai_tools.precautions || []);
  }
  if (disassembly.confirmed_tools?.confirmed_tools) {
    const selectedIds = disassembly.confirmed_tools.confirmed_tools;
    ctx.setToolSelection(selectedIds);
    const toolNames = (disassembly.ai_tools?.recommended_tools || [])
      .filter((tool) => selectedIds.includes(tool.id))
      .map((tool) => tool.name);
    ctx.setSelectedTools(toolNames);
  }
  if (disassembly.ai_method) {
    ctx.setDisassemblyMethod(disassembly.ai_method);
    const doneIds = disassembly.confirmed_method?.completed_step_ids || [];
    ctx.setMethodWorkingSteps(
      (disassembly.ai_method.steps || []).map((step) => ({
        ...step,
        approved: doneIds.includes(step.id),
      })),
    );
  }
  if (
    disassembly.memo ||
    disassembly.photo?.length ||
    disassembly.photo_urls?.length
  ) {
    ctx.setPostRecord("disassembly", {
      memo: disassembly.memo || "",
      photos: disassembly.photo || disassembly.photo_urls || [],
    });
  }

  const cleaning = results.cleaning || {};
  if (cleaning.ai_analysis) {
    ctx.setCleaningMethod({ ai_analysis: cleaning.ai_analysis });
  }
  if (cleaning.confirmed_method) {
    ctx.setCleaningSelection({
      usePhysical: Boolean(cleaning.confirmed_method.use_physical),
      useChemical: Boolean(cleaning.confirmed_method.use_chemical),
    });
  }
  if (cleaning.ai_guide) ctx.setCleaningGuide(cleaning.ai_guide);
  if (cleaning.ai_drying_guide) ctx.setDryingGuide(cleaning.ai_drying_guide);
  if (cleaning.memo || cleaning.photo?.length || cleaning.photo_urls?.length) {
    ctx.setPostRecord("cleaning", {
      memo: cleaning.memo || "",
      photos: cleaning.photo || cleaning.photo_urls || [],
    });
  }

  const strengthening = results.reinforcement || results.strengthening || {};
  if (strengthening.ai_recommendation) {
    ctx.setStrengtheningRecommendation(strengthening.ai_recommendation);
  }
  if (strengthening.confirmed_agent) {
    ctx.setStrengtheningChoice({
      agent: strengthening.confirmed_agent.agent || "",
      solvent: strengthening.confirmed_agent.solvent || "",
    });
  }
  if (strengthening.ai_color_analysis) {
    ctx.setColorChangeAnalysis(strengthening.ai_color_analysis);
  }
  if (strengthening.ai_method)
    ctx.setStrengtheningGuide(strengthening.ai_method);
  if (
    strengthening.memo ||
    strengthening.photo?.length ||
    strengthening.photo_urls?.length
  ) {
    ctx.setPostRecord("strengthening", {
      memo: strengthening.memo || "",
      photos: strengthening.photo || strengthening.photo_urls || [],
    });
  }

  const bonding = results.bonding || {};
  if (bonding.ai_adhesive) ctx.setBondingAdhesive(bonding.ai_adhesive);
  if (bonding.confirmed_adhesive) {
    ctx.setBondingChoice({
      adhesive: bonding.confirmed_adhesive.adhesive || "",
    });
  }
  if (bonding.ai_temp_analysis)
    ctx.setBondingTempAnalysis(bonding.ai_temp_analysis);
  if (bonding.ai_method) ctx.setBondingGuide(bonding.ai_method);
  if (bonding.memo || bonding.photo?.length || bonding.photo_urls?.length) {
    ctx.setPostRecord("bonding", {
      memo: bonding.memo || "",
      photos: bonding.photo || bonding.photo_urls || [],
    });
  }

  const restoration = results.restoration || {};
  if (restoration.ai_material)
    ctx.setRestorationMaterial(restoration.ai_material);
  if (restoration.confirmed_material) {
    ctx.setRestorationChoice({
      material: restoration.confirmed_material.material || "",
    });
  }
  if (restoration.ai_guide) ctx.setRestorationGuide(restoration.ai_guide);
  if (restoration.ai_finishing) {
    ctx.setRestorationFinishingGuide(restoration.ai_finishing);
  }
  if (
    restoration.memo ||
    restoration.photo?.length ||
    restoration.photo_urls?.length
  ) {
    ctx.setPostRecord("restoration", {
      memo: restoration.memo || "",
      photos: restoration.photo || restoration.photo_urls || [],
    });
  }
}

export function getRecoveredGuideRoute(task, artifactId) {
  if (!task) return getArtifactWorkflowRoute(artifactId);

  if (String(task.totalState || "").toUpperCase() === "COMPLETED") {
    return getArtifactWorkflowRoute(artifactId, "result");
  }

  const descriptor = findInterruptDescriptor(task.currentInterrupt);
  if (!descriptor) return "";

  const stageRoute = {
    해체: "disassembly",
    세척: "cleaning",
    강화: "strengthening",
    접합: "bonding",
    복원: "restoration",
  }[descriptor.stage];

  return stageRoute
    ? getArtifactWorkflowRoute(artifactId, stageRoute)
    : getArtifactWorkflowRoute(artifactId);
}

export function restoreGuideTaskContext(task, artifactId, ctx) {
  if (!task || !ctx) return null;

  const approvedFlow = taskFlowToApprovedFlow(task.flow);
  const completed = buildRecoveredCompleted(task);
  const resumeRoute = getRecoveredGuideRoute(task, artifactId);

  ctx.setTaskId(task.taskId || null);
  ctx.setApprovedFlow(approvedFlow);
  ctx.setCompleted(completed);
  ctx.setGuideResumeRoute(resumeRoute);

  applyStoredResults(task.results, ctx);
  applyInterrupt(task.currentInterrupt, ctx);

  return {
    taskId: task.taskId || null,
    approvedFlow,
    completed,
    resumeRoute,
    totalState: task.totalState,
  };
}
