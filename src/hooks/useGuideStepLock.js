import { useDisassembly } from "../context/useDisassembly";

/**
 * 보존가이드는 완료된 세부 단계를 다시 resume 하지 않는 단방향 워크플로우로 운영한다.
 * - 완료 전: 편집/제출 가능
 * - 저장 중: 모든 변경/중복 제출 차단
 * - 완료 후: 조회만 가능, 변경/재제출 차단
 */
export function useGuideStepLock(stepKey) {
  const { completed, savingSteps } = useDisassembly();

  const isCompleted = Boolean(completed?.[stepKey]);
  const isSaving = savingSteps.has(stepKey);

  return {
    isCompleted,
    isSaving,
    isLocked: isCompleted || isSaving,
  };
}
