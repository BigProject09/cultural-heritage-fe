const mockStep = (id, label, caution, extra = {}) => ({
  id,
  label,
  caution,
  ...extra,
});

export function createGuideMockContext() {
  return {
    checklist: [
      { id: "check-surface", label: "표면 박락 및 균열 상태 확인", recommended: true },
      { id: "check-joint", label: "기존 접합부와 보강재 상태 확인", recommended: true },
      { id: "check-photo", label: "해체 전 전체 및 세부 사진 기록", recommended: true },
      { id: "check-crack", label: "균열 진행 방향과 폭 실측", recommended: true },
      { id: "check-loss", label: "결손부 위치와 범위 확인", recommended: true },
      { id: "check-contamination", label: "오염물 종류(먼지·이물질·과거 복원 흔적) 확인", recommended: false },
      { id: "check-material", label: "유약·태토 등 재질 특성 육안 확인", recommended: true },
      { id: "check-environment", label: "보관 환경(습도·조도) 기록", recommended: false },
      { id: "check-fragile", label: "탈락 위험이 있는 파편 임시 고정 상태 확인", recommended: true },
      { id: "check-workspace", label: "작업 공간과 조명 환경 점검", recommended: false },
    ],
    checklistCaution:
      "탈락 위험이 있는 파편은 체크 전에 반드시 임시 고정 상태부터 확인합니다.",
    tools: [
      {
        id: "tool-spatula",
        name: "미세 스패튤러",
        description: "접합면과 보강재를 분리할 때 사용합니다.",
        recommended: true,
        reason: "접합부가 여러 겹으로 굳어 있어, 힘 조절이 정밀한 도구로 얇게 저며내듯 분리해야 합니다.",
        precautions: [
          "날 끝을 접합면과 평행하게 눕혀서 넣습니다.",
          "한 번에 깊이 밀어 넣지 말고 얕게 여러 번 시도합니다.",
        ],
      },
      {
        id: "tool-tweezer",
        name: "정밀 핀셋",
        description: "작은 파편과 이물질을 안전하게 제거합니다.",
        recommended: false,
        reason: "분리 중 떨어져 나오는 작은 파편을 손으로 집기 어려워, 끝이 가는 핀셋으로 골라내야 합니다.",
        precautions: [
          "파편을 집을 때 옆면을 눌러 깨지지 않게 합니다.",
          "핀셋 끝이 원래 표면을 긁지 않도록 각도를 낮춥니다.",
        ],
      },
      {
        id: "tool-brush",
        name: "부드러운 세필",
        description: "해체 과정에서 발생한 분진을 제거합니다.",
        recommended: false,
        reason: "분리 작업 중 생기는 미세 분진이 접합면 관찰을 방해하므로, 부드러운 붓으로 수시로 털어내야 합니다.",
        precautions: [
          "한 방향으로만 쓸어 분진이 틈새로 밀려 들어가지 않게 합니다.",
          "젖은 상태로 쓰지 말고 마른 채로 사용합니다.",
        ],
      },
    ],
    toolsReason:
      "표면 손상과 접합부 상태를 고려했을 때 정밀하게 힘을 조절할 수 있는 도구 위주로 추천합니다.",
    toolsPrecautions: [
      "도구 끝이 유물 표면에 직접 닿지 않도록 주의합니다.",
      "한 번에 무리하게 힘을 주지 말고 조금씩 시도합니다.",
      "사용 전 도구 상태(날 끝, 위생)를 확인합니다.",
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
          { tools_used: ["세필", "면봉", "아세톤"] },
        ),
        mockStep(
          "disassembly-3",
          "1차 파편 분리",
          "저항이 느껴지면 즉시 중단하고 접합부를 다시 확인합니다.",
          { tools_used: ["미세 스패튤러"] },
        ),
        mockStep(
          "disassembly-4",
          "잔여 파편 및 이물질 정리",
          "떨어져 나온 작은 파편은 번호를 매겨 개별 보관합니다.",
          { tools_used: ["정밀 핀셋", "부드러운 세필"] },
        ),
        mockStep(
          "disassembly-5",
          "분리 완료 상태 재기록",
          "분리된 각 파편의 파단면을 개별 촬영해 접합 단계 참고 자료로 남깁니다.",
          { tools_used: ["카메라"] },
        ),
      ],
      overall_caution:
        "해체 중 저항이 느껴지면 절대 힘을 주지 말고 즉시 작업을 중단합니다.",
    },
    cleaningMethod: {
      stage: "세척 - 방법 선택",
      ai_analysis: {
        relic_condition_summary:
          "전체적인 태토 구조는 비교적 안정적이나, 표면 전반에 걸쳐 미세한 분진층이 덮여 있고 저부와 굽 주변에 국부적인 고착 오염이 관찰됩니다. 균열이나 결손부 주변은 강도가 약해져 있어 세척 시 별도의 주의가 필요합니다.",
        contamination_summary:
          "표면 대부분은 마른 붓질만으로 제거되는 건식 분진이지만, 저부 주변에는 물리적 방법만으로는 제거되지 않는 고착성 오염(과거 매장 환경에서 유입된 것으로 추정되는 이물질)이 국소적으로 붙어 있습니다.",
        reason:
          "표면 대부분을 차지하는 건식 분진은 물리적 세척만으로 안전하게 제거할 수 있어 이를 우선 적용합니다. 다만 고착 오염이 남아있는 저부 국소 부위는 물리적 방법만으로는 제거되지 않으므로, 손상 위험이 낮은 범위에서만 제한적으로 화학적 세척을 함께 권장합니다.",
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
          "고착 오염 국부 시험 세척",
          "눈에 띄지 않는 부위에 먼저 소량 적용해 안전성을 확인합니다.",
          { method_type: "chemical" },
        ),
        mockStep(
          "cleaning-3",
          "고착 오염 본세척",
          "면봉에 세척액을 소량 묻혀 짧게 적용하고 즉시 닦아냅니다.",
          { method_type: "chemical" },
        ),
        mockStep(
          "cleaning-4",
          "잔류물 확인",
          "확대경으로 표면과 틈새의 잔류물을 점검합니다.",
          { method_type: "physical" },
        ),
      ],
      overall_caution:
        "세척 중 원 표면의 안료·문양이 손상되지 않도록 매 단계마다 소범위로 시험 후 진행합니다.",
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
        mockStep(
          "drying-3",
          "건조 상태 확인",
          "완전 건조 전 다음 공정으로 넘어가지 않도록 표면과 틈새를 함께 확인합니다.",
        ),
      ],
      overall_caution:
        "건조 중에는 온습도 변화가 적은 곳에 두고 임의로 이동시키지 않습니다.",
    },
    strengtheningRecommendation: {
      recommended_agent: "Paraloid B72",
      recommended_solvent: "아세톤",
      reason:
        "태토가 다공질이고 표면 강도가 약해져 있어, 가역성이 높고 안정적인 아크릴계 강화제인 Paraloid B72를 저농도로 적용하는 방법을 권장합니다. 결정화나 변색 위험이 낮아 문양이 남아있는 표면에도 비교적 안전하게 사용할 수 있고, 필요하면 나중에 같은 계열 용매로 다시 녹여 제거하거나 재처리할 수 있어 장기적인 보존 관리에도 유리합니다. 대표 용매인 아세톤은 휘발 속도가 빨라 반복 도포 작업에 유리하고, 유물 표면에 남는 잔류물도 적어 이 강화제와 함께 쓰기에 적합합니다.",
    },
    strengtheningGuide: {
      method_type: "저농도 반복 도포",
      steps: [
        mockStep(
          "strengthening-1",
          "강화제 농도 확인",
          "시험편 또는 비가시부에 먼저 적용해 침투와 변색 여부를 확인합니다.",
        ),
        mockStep(
          "strengthening-2",
          "취약부 1차 도포",
          "한 번에 많은 양이 침투하지 않도록 붓으로 소량씩 도포합니다.",
        ),
        mockStep(
          "strengthening-3",
          "1차 건조",
          "용매가 완전히 휘발할 때까지 통풍이 되는 곳에서 기다립니다.",
        ),
        mockStep(
          "strengthening-4",
          "상태 점검 및 추가 도포",
          "색 변화와 광택 변화를 확인한 뒤 필요하면 같은 방식으로 추가 도포합니다.",
        ),
        mockStep(
          "strengthening-5",
          "최종 건조 및 검수",
          "완전 건조 후 표면 강도와 색상 차이를 재확인합니다.",
        ),
      ],
      overall_caution:
        "강화제는 한 번에 많은 양을 도포하지 말고 저농도로 여러 번 나눠 적용합니다.",
    },
    bondingAdhesive: {
      recommended_adhesive: "Paraloid B-72",
      reason:
        "태토가 다공질인 도자기류라 파단면에 접착제가 과도하게 흡수되지 않고 안정적으로 밀착되는 재료가 유리합니다. Paraloid B-72는 접합 강도가 충분하면서도 경화 후 아세톤으로 다시 녹일 수 있어, 추후 재처리나 재접합이 필요할 때 파단면을 손상 없이 다시 분리할 수 있습니다. 이미 강화처리 단계에서 같은 계열(아크릴계) 강화제를 사용했기 때문에 화학적으로 상충하지 않는다는 점도 함께 고려했습니다.",
      precautions: [
        "접합면의 분진과 수분을 완전히 제거합니다.",
        "접착제가 표면으로 흘러나오지 않도록 최소량만 사용합니다.",
        "경화 중에는 접합부에 하중이 실리지 않도록 지지대로 고정합니다.",
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
          "접합면 정리",
          "접합면의 먼지와 이물질을 제거해 접착제가 고르게 밀착되도록 합니다.",
        ),
        mockStep(
          "bonding-3",
          "접착제 도포",
          "접합면 한쪽에 균일하고 얇게 도포합니다.",
        ),
        mockStep(
          "bonding-4",
          "정렬 및 고정",
          "가접합 때 확인한 순서대로 맞추고 지지대로 정렬 상태를 고정합니다.",
        ),
        mockStep(
          "bonding-5",
          "경화 대기",
          "정렬 상태를 유지한 채 완전 경화 시간 동안 움직이지 않게 둡니다.",
        ),
      ],
      overall_caution:
        "접착제가 완전히 경화되기 전까지 접합부에 힘이 가해지지 않도록 고정합니다.",
    },
    restorationMaterial: {
      recommended_material: "CDK-520",
      reason:
        "① 재질/상태 근거: 태토가 다공질인 도자기류이고 결손부 형태가 불규칙해, 접착면에 무리한 발열 없이 손으로 직접 반죽해 형태를 잡을 수 있는 재료가 필요합니다.\n" +
        "② 후보 재료의 장점: CDK-520은 2액형 에폭시 퍼티로 경화 전 조형 가능 시간이 충분해 결손부 형태를 세밀하게 맞출 수 있고, 경화 후에는 사포로 다듬기 쉬워 원형과 자연스럽게 이어지는 마감이 가능합니다. 접합 단계에서 확정된 Paraloid B-72와도 화학적으로 상충하지 않습니다.\n" +
        "③ 추가 확인: 결손부 범위가 넓어질 경우 1회 충전량과 경화 수축률을 현장에서 한 번 더 확인한 뒤 진행하는 것을 권장합니다.",
    },
    restorationGuide: {
      steps: [
        mockStep(
          "restoration-1",
          "결손부 경계 정리",
          "원형 표면을 손상하지 않도록 결손 경계만 정리합니다.",
          { tools_used: ["스패츌라"] },
        ),
        mockStep(
          "restoration-2",
          "이형제 도포",
          "복원재가 주변 원형 표면에 들러붙지 않도록 경계에 얇게 도포합니다.",
          { tools_used: ["붓", "이형제"] },
        ),
        mockStep(
          "restoration-3",
          "복원재 충전",
          "과도한 복원을 피하고 결손부 안쪽부터 채워 넣습니다.",
          { tools_used: ["스패츌라", "CDK-520"] },
        ),
        mockStep(
          "restoration-4",
          "형태 성형",
          "경화되기 전 주변 형태를 참고해 원형에 가깝게 다듬습니다.",
          { tools_used: ["조형용 헤라"] },
        ),
        mockStep(
          "restoration-5",
          "경화 후 표면 정리",
          "완전히 경화된 뒤 사포로 단차 없이 매끄럽게 다듬습니다.",
          { tools_used: ["사포"] },
        ),
      ],
      overall_caution:
        "복원재는 원형 표면보다 과도하게 도드라지지 않도록 최소한으로 충전합니다.",
    },
    restorationFinishingGuide: {
      steps: [
        mockStep(
          "finishing-1",
          "밑색 조색",
          "주변 원형 색상을 기준으로 최소한의 안료만 사용해 밑색을 맞춥니다.",
          { tools_used: ["세필", "안료"] },
        ),
        mockStep(
          "finishing-2",
          "단계적 채색",
          "한 번에 진하게 칠하지 않고 얇게 여러 번 덧발라 색을 맞춥니다.",
          { tools_used: ["세필"] },
        ),
        mockStep(
          "finishing-3",
          "광택 조정",
          "원형 표면과 광택 차이가 크지 않도록 국부적으로만 조정합니다.",
          { tools_used: ["광택 코팅제"] },
        ),
        mockStep(
          "finishing-4",
          "최종 검수",
          "밝은 조명과 확대경으로 경계면과 색상 차이를 재확인합니다.",
          { tools_used: ["확대경"] },
        ),
      ],
      overall_caution:
        "채색과 광택 조정은 한 번에 크게 바꾸지 말고 단계적으로 비교하며 진행합니다.",
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
    overall_severity: "mild",
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
      "접합면을 한 번 더 확인한 뒤 현재 배치로 다음 보존처리 단계를 진행할 수 있습니다.",
  };
}
