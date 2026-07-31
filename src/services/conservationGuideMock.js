const mockStep = (id, label, caution, extra = {}) => ({
  id,
  label,
  caution,
  ...extra,
});

export function createGuideMockContext() {
  return {
    checklist: [
      { id: "check-surface", label: "표면 박락 및 균열 상태 확인" },
      { id: "check-joint", label: "기존 접합부와 보강재 상태 확인" },
      { id: "check-photo", label: "해체 전 전체 및 세부 사진 기록" },
    ],
    tools: [
      {
        id: "tool-spatula",
        name: "미세 스패튤러",
        description: "접합면과 보강재를 분리할 때 사용합니다.",
        recommended: true,
      },
      {
        id: "tool-tweezer",
        name: "정밀 핀셋",
        description: "작은 파편과 이물질을 안전하게 제거합니다.",
        recommended: true,
      },
      {
        id: "tool-brush",
        name: "부드러운 세필",
        description: "해체 과정에서 발생한 분진을 제거합니다.",
        recommended: false,
      },
    ],
    disassemblyMethod: {
      steps: [
        mockStep(
          "disassembly-1",
          "해체 전 상태 기록",
          "파손 위치와 기존 접합 상태를 사진으로 남깁니다.",
          { tools_used: ["카메라", "스케일"] },
        ),
        mockStep(
          "disassembly-2",
          "기존 접합부 연화",
          "유물 표면에 용제가 직접 닿지 않도록 최소량만 사용합니다.",
          { tools_used: ["세필", "면봉"] },
        ),
        mockStep(
          "disassembly-3",
          "파편 순차 분리",
          "저항이 느껴지면 즉시 중단하고 접합부를 다시 확인합니다.",
          { tools_used: ["미세 스패튤러", "정밀 핀셋"] },
        ),
      ],
    },
    cleaningMethod: {
      stage: "세척 - 방법 선택",
      ai_analysis: {
        relic_condition_summary:
          "표면에 분진과 국부 오염이 있으나 구조는 비교적 안정적입니다.",
        contamination_summary:
          "건식 제거가 가능한 분진과 일부 고착 오염이 확인됩니다.",
        reason:
          "물리적 세척을 우선 적용하고 필요한 부분에만 제한적으로 습식 세척을 권장합니다.",
        need_physical_cleaning: true,
        need_chemical_cleaning: true,
      },
    },
    cleaningGuide: {
      steps: [
        mockStep(
          "cleaning-1",
          "표면 분진 제거",
          "부드러운 세필로 한 방향으로 쓸어냅니다.",
          { method_type: "physical" },
        ),
        mockStep(
          "cleaning-2",
          "고착 오염 국부 세척",
          "면봉에 세척액을 소량 묻혀 짧게 적용합니다.",
          { method_type: "chemical" },
        ),
        mockStep(
          "cleaning-3",
          "잔류물 확인",
          "확대경으로 표면과 틈새의 잔류물을 점검합니다.",
          { method_type: "physical" },
        ),
      ],
    },
    dryingGuide: {
      steps: [
        mockStep(
          "drying-1",
          "표면 수분 제거",
          "흡수지로 눌러 닦고 마찰은 피합니다.",
        ),
        mockStep(
          "drying-2",
          "자연 건조",
          "직사광선을 피하고 통풍이 되는 곳에서 충분히 건조합니다.",
        ),
      ],
    },
    strengtheningRecommendation: {
      recommended_agent: "Paraloid B72",
      recommended_solvent: "아세톤",
      reason:
        "가역성과 안정성을 고려해 저농도 Paraloid B72 적용을 권장합니다.",
    },
    strengtheningGuide: {
      method_type: "저농도 반복 도포",
      steps: [
        mockStep(
          "strengthening-1",
          "강화제 농도 확인",
          "시험편 또는 비가시부에 먼저 적용합니다.",
        ),
        mockStep(
          "strengthening-2",
          "취약부 국부 도포",
          "한 번에 많은 양이 침투하지 않도록 소량씩 도포합니다.",
        ),
        mockStep(
          "strengthening-3",
          "건조 및 상태 점검",
          "색 변화와 광택 변화를 확인한 뒤 추가 도포를 결정합니다.",
        ),
      ],
    },
    bondingAdhesive: {
      recommended_adhesive: "Paraloid B-72",
      reason:
        "접합 강도와 향후 제거 가능성을 함께 고려한 선택입니다.",
      precautions: [
        "접합면의 분진과 수분을 완전히 제거합니다.",
        "접착제가 표면으로 흘러나오지 않도록 최소량만 사용합니다.",
      ],
    },
    bondingGuide: {
      method_type: "점진적 맞춤 접합",
      steps: [
        mockStep(
          "bonding-1",
          "파편 가접합",
          "접착제 없이 먼저 맞춰 접합 순서와 지지 위치를 확인합니다.",
        ),
        mockStep(
          "bonding-2",
          "접착제 도포",
          "접합면 한쪽에 균일하고 얇게 도포합니다.",
        ),
        mockStep(
          "bonding-3",
          "고정 및 경화",
          "정렬 상태를 유지한 채 충분한 시간 동안 고정합니다.",
        ),
      ],
    },
    restorationMaterial: {
      recommended_material: "CDK-520",
      reason:
        "결손부 성형성과 후가공성을 고려한 임시 추천 결과입니다.",
    },
    restorationGuide: {
      steps: [
        mockStep(
          "restoration-1",
          "결손부 경계 정리",
          "원형 표면을 손상하지 않도록 결손 경계만 정리합니다.",
        ),
        mockStep(
          "restoration-2",
          "복원재 충전 및 성형",
          "과도한 복원을 피하고 식별 가능한 범위에서 형태를 맞춥니다.",
        ),
        mockStep(
          "restoration-3",
          "표면 마감",
          "원형과 구분 가능하도록 색과 질감을 조정합니다.",
        ),
      ],
    },
  };
}

export function createColorAnalysisMock() {
  const metric = (severity, description) => ({ severity, description });

  return {
    hue_shift: metric("mild", "미세한 색조 변화가 관찰됩니다."),
    brightness_change: metric("mild", "처리 전보다 명도가 약간 낮아졌습니다."),
    saturation_change: metric("none", "뚜렷한 채도 변화는 없습니다."),
    gloss_change: metric("mild", "국부적으로 약한 광택 변화가 있습니다."),
    blanching: metric("none", "백화 현상은 확인되지 않습니다."),
    uneven_penetration: metric("none", "침투 상태가 대체로 균일합니다."),
    edge_visibility: metric("mild", "처리 경계가 가까이에서 약하게 보입니다."),
    crack_response: metric("none", "균열 확대나 새로운 균열은 없습니다."),
    texture_change: metric("none", "표면 질감 변화는 거의 없습니다."),
    recommendation:
      "중대한 변화가 없어 현재 농도로 강화 처리를 진행할 수 있습니다.",
  };
}

export function createBondingTempAnalysisMock() {
  return {
    is_analyzable: true,
    axis_alignment: "good",
    fracture_match_quality: "minor_issue",
    overall_severity: "mild",
    description:
      "전체 축 정렬은 양호하며 파단면 일부에서 미세한 단차가 확인됩니다.",
    recommendation:
      "접합면을 한 번 더 확인한 뒤 현재 배치로 다음 공정을 진행할 수 있습니다.",
  };
}
