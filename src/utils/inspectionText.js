// pottery AI가 매번 토씨 하나 안 틀리고 붙이는 고정 안내 문장들.
// 본문에서 이 문장을 찾아 떼어내고, 대신 "!" 아이콘 툴팁으로 보여준다.
//
// 주의: 이건 정확한 문자열 일치에 의존한다. AI 쪽 문구가 바뀌면 여기
// 목록도 같이 바꿔야 한다.
const KNOWN_CAVEATS = [
  "문양명은 여러 차례 반복 분석에서 위치가 일치한 후보를 기준으로 하며, 반복해서 같은 답이 나왔다는 뜻이지 실제로 맞다는 보장은 아니므로 명칭 확정은 조사자 검토가 필요하다.",
  "이 소견은 클로즈업 사진 한 장을 기준으로 한 AI의 1차 판단이며, 촬영 화질·반사광 등으로 인한 오판일 가능성도 함께 고려해 전문가가 재확인해야 한다.",
  "단일 사진 기준으로 뒷면·내부·미세 결손은 확인할 수 없음.",
];

// "[제목]\n본문..." 형태의 블록들로 나눠서, 알려진 캐비엇 문장이 있으면
// 본문에서 떼어내 caveat 필드로 분리한다.
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