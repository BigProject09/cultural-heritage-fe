/**
 * 공지사항 mock. .env에 VITE_USE_NOTICE_MOCK=true로 켠다.
 *
 * 정렬 규칙(고정 우선, 그다음 id 역순)은 백엔드
 * NoticeRepository.findAllByOrderByIsPinnedDescIdDesc와 동일하게 맞춘다.
 */
const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const notices = [
  {
    id: 3,
    title: "AI 결함 분석 정확도 개선 안내",
    content:
      "X-ray 결함 분석 모델의 오탐률을 낮추는 업데이트를 적용했습니다. " +
      "기존 대비 검수 시간이 단축될 것으로 예상됩니다.",
    pinned: true,
  },
  {
    id: 2,
    title: "정기 점검 안내 (매주 화요일 새벽 2시~4시)",
    content:
      "서비스 안정화를 위해 매주 화요일 새벽 2시부터 4시까지 정기 점검을 진행합니다. " +
      "해당 시간에는 서비스 이용이 제한될 수 있습니다.",
    pinned: false,
  },
  {
    id: 1,
    title: "VORA 보존처리 워크스페이스 오픈",
    content:
      "문화유산 보존처리 기록을 한 곳에서 관리할 수 있는 VORA 워크스페이스를 오픈했습니다. " +
      "많은 이용 바랍니다.",
    pinned: false,
  },
];

let nextId = 4;

function sortNotices() {
  return [...notices].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.id - a.id;
  });
}

export async function mockFindAllNotices() {
  await delay(300);
  return sortNotices();
}

export async function mockFindNotice(id) {
  await delay(200);

  const notice = notices.find((item) => item.id === Number(id));
  if (!notice) throw new Error("존재하지 않는 공지사항입니다.");

  return { ...notice };
}

export async function mockAddNotice({ title, content, isPinned }) {
  await delay(300);

  const notice = { id: nextId++, title, content, pinned: Boolean(isPinned) };
  notices.push(notice);

  return { ...notice };
}

export async function mockUpdateNotice(id, { title, content, isPinned }) {
  await delay(300);

  const notice = notices.find((item) => item.id === Number(id));
  if (!notice) throw new Error("존재하지 않는 공지사항입니다.");

  notice.title = title;
  notice.content = content;
  notice.pinned = Boolean(isPinned);

  return { ...notice };
}

export async function mockDeleteNotice(id) {
  await delay(200);

  const index = notices.findIndex((item) => item.id === Number(id));
  if (index === -1) throw new Error("존재하지 않는 공지사항입니다.");

  notices.splice(index, 1);
  return null;
}
