
const KNOWN_CAVEATS = [
  "문양명은 여러 차례 반복 분석에서 위치가 일치한 후보를 기준으로 하며, 반복해서 같은 답이 나왔다는 뜻이지 실제로 맞다는 보장은 아니므로 명칭 확정은 조사자 검토가 필요하다.",
  "이 소견은 클로즈업 사진 한 장을 기준으로 한 AI의 1차 판단이며, 촬영 화질·반사광 등으로 인한 오판일 가능성도 함께 고려해 전문가가 재확인해야 한다.",
];

export function parseInspectionSections(text) {
  if (!text) return [];

  const blocks = text.split(/\n\n(?=\[)/).map((b) => b.trim());

  return blocks.map((block) => {
    const match = block.match(/^\[([^\]]+)\]\s*([\s\S]*)/);
    const title = match ? match[1] : null;
    let body = (match ? match[2] : block).trim();

    let caveat = null;
    for (const known of KNOWN_CAVEATS) {
      if (body.includes(known)) {
        caveat = known;
        body = body.replace(known, "").trim();
        break; // 섹션당 캐비엇 하나만 가정
      }
    }

    return { title, body, caveat };
  });
}

export function compareEra(registeredPeriod, aiEra) {
  if (!registeredPeriod || !aiEra) return null;
  const normalized = registeredPeriod.replace(/시대$/, "");
  return { match: normalized === aiEra, normalized };
}