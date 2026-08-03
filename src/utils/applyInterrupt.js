// 단계를 건너뛸 수 있어서, start/resume 응답의 interrupt가 항상 "다음 화면이 기대하는 그 데이터"라는
// 보장이 없다. 그래서 interrupt에 들어있는 키를 보고 해당하는 context에 전부 채워 넣는다.
// ai_method(강화처리/접합)와 ai_guide(세척/복원)는 여러 단계에서 재사용되는 키라
// interrupt.stage 문자열(예: "강화처리 - ...")로 어느 단계인지 구분한다.
export function applyInterrupt(interrupt, ctx) {
  if (!interrupt) return;

  const stage = interrupt.stage || "";
  const mockContext = interrupt.mock_context;

  // dev:mock에서는 실제 LangGraph 인터럽트를 순차 호출하지 않는다.
  // 첫 start 응답에 모든 화면용 데이터를 채워 각 공정을 독립적으로 테스트한다.
  if (mockContext) {
    ctx.setChecklist(mockContext.checklist || []);
    ctx.setTools(mockContext.tools || []);
    ctx.setToolSelection(
      (mockContext.tools || [])
        .filter((tool) => tool.recommended)
        .map((tool) => tool.id),
    );
    ctx.setDisassemblyMethod(mockContext.disassemblyMethod || null);
    ctx.setMethodWorkingSteps(
      (mockContext.disassemblyMethod?.steps || []).map((step) => ({
        ...step,
        approved: false,
      })),
    );
    ctx.setCleaningMethod(mockContext.cleaningMethod || null);
    ctx.setCleaningGuide(mockContext.cleaningGuide || null);
    ctx.setDryingGuide(mockContext.dryingGuide || null);
    ctx.setStrengtheningRecommendation(
      mockContext.strengtheningRecommendation || null,
    );
    ctx.setStrengtheningGuide(mockContext.strengtheningGuide || null);
    ctx.setBondingAdhesive(mockContext.bondingAdhesive || null);
    ctx.setBondingGuide(mockContext.bondingGuide || null);
    ctx.setRestorationMaterial(mockContext.restorationMaterial || null);
    ctx.setRestorationGuide(mockContext.restorationGuide || null);
  }

  // 해체
  if (interrupt.ai_checklist) {
    ctx.setChecklist(interrupt.ai_checklist.checklist);
  }
  if (interrupt.ai_tools) {
    ctx.setTools(interrupt.ai_tools.recommended_tools);
    ctx.setToolSelection(
      interrupt.ai_tools.recommended_tools
        .filter((tool) => tool.recommended)
        .map((tool) => tool.id),
    );
  }
  if (interrupt.ai_disassembly_method) {
    ctx.setDisassemblyMethod(interrupt.ai_disassembly_method);
    ctx.setMethodWorkingSteps(
      (interrupt.ai_disassembly_method.steps || []).map((step) => ({
        ...step,
        approved: false,
      })),
    );
  }

  // 세척
  if (interrupt.ai_analysis) {
    ctx.setCleaningMethod(interrupt);
  }
  if (interrupt.ai_guide && stage.startsWith("세척")) {
    ctx.setCleaningGuide(interrupt.ai_guide);
  }
  if (interrupt.ai_drying_guide) {
    ctx.setDryingGuide(interrupt.ai_drying_guide);
  }

  // 강화 처리
  if (interrupt.ai_recommendation) {
    ctx.setStrengtheningRecommendation(interrupt.ai_recommendation);
  }
  if (interrupt.ai_color_analysis) {
    ctx.setColorChangeAnalysis({
      ...interrupt.ai_color_analysis,
      default_action: interrupt.default_action,
    });
  }
  if (interrupt.ai_method && stage.startsWith("강화처리")) {
    ctx.setStrengtheningGuide(interrupt.ai_method);
  }

  // 접합
  if (interrupt.ai_adhesive) {
    ctx.setBondingAdhesive(interrupt.ai_adhesive);
  }
  if (interrupt.ai_temp_analysis) {
    ctx.setBondingTempAnalysis({
      ...interrupt.ai_temp_analysis,
      default_action: interrupt.default_action,
    });
  }
  if (interrupt.ai_method && stage.startsWith("접합")) {
    ctx.setBondingGuide(interrupt.ai_method);
  }

  // 복원
  if (interrupt.ai_material) {
    ctx.setRestorationMaterial(interrupt.ai_material);
  }
  if (interrupt.ai_guide && stage.startsWith("복원")) {
    ctx.setRestorationGuide(interrupt.ai_guide);
  }
}
