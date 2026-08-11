/**
 * 게시판 mock. .env에 VITE_USE_BOARD_MOCK=true로 켠다.
 *
 * 목록/상세/내글/작성/수정/삭제가 서로 같은 데이터를 참조해야 하므로
 * (글쓰기 후 목록에 바로 보여야 함) 모듈 스코프 배열 하나를 공유한다.
 * author 마스킹은 백엔드 PostListResponse/PostDetailResponse의
 * maskNickname과 동일하게 "첫 글자 + **" 규칙을 따른다.
 */
import { readLoginUser } from "../utils/auth";

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const posts = [
  {
    id: 3,
    title: "청자 표면 세척 후 광택 변화 공유합니다",
    content:
      "고려청자 파편 세척 작업 중 저농도 세척액으로도 표면 광택이 눈에 띄게 " +
      "회복되는 사례가 있어 공유합니다. 세척 순서와 사용 도구는 댓글로 정리해두겠습니다.",
    authorEmail: "user@vora.io",
    authorNickname: "김보존",
    viewCount: 24,
    createdAt: "2026-08-05T10:20:00",
    updatedAt: "2026-08-05T10:20:00",
  },
  {
    id: 2,
    title: "접합 강화제 Paraloid B-72 사용 후기",
    content:
      "결손부가 많은 도자기 접합 작업에서 Paraloid B-72를 저농도로 반복 도포했을 때 " +
      "가역성과 강도 모두 만족스러웠습니다. 농도별 도포 횟수를 기록해뒀습니다.",
    authorEmail: "admin@vora.io",
    authorNickname: "관리자",
    viewCount: 41,
    createdAt: "2026-08-03T15:05:00",
    updatedAt: "2026-08-03T15:05:00",
  },
  {
    id: 1,
    title: "X-ray 결합 결과와 실제 결함 위치 비교 사례",
    content:
      "X-ray 결합 결과에서 탐지된 이상영역과 실제 파편 상태를 대조해본 사례입니다. " +
      "결합 경계 근처의 오탐 비율이 낮아 검수 시간이 줄었습니다.",
    authorEmail: "user@vora.io",
    authorNickname: "김보존",
    viewCount: 58,
    createdAt: "2026-08-01T09:12:00",
    updatedAt: "2026-08-01T09:12:00",
  },
];

let nextId = 4;

function maskNickname(nickname) {
  if (!nickname) return "사용자";
  return `${nickname[0]}**`;
}

function toListItem(post) {
  return {
    id: post.id,
    title: post.title,
    author: maskNickname(post.authorNickname),
    viewCount: post.viewCount,
    createdAt: post.createdAt,
  };
}

function toDetail(post) {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    author: maskNickname(post.authorNickname),
    viewCount: post.viewCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function requireLoginUser() {
  const user = readLoginUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  return user;
}

function paginate(list, page, size) {
  const totalElements = list.length;
  const totalPages = Math.max(Math.ceil(totalElements / size), 1);
  const start = page * size;

  return {
    posts: list.slice(start, start + size).map(toListItem),
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
  };
}

function sortByCreatedAtDesc(list) {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function mockFindAllPosts({
  searchType = "TITLE",
  keyword = "",
  page = 0,
  size = 10,
} = {}) {
  await delay(300);

  let filtered = posts;

  if (keyword?.trim()) {
    const kw = keyword.trim().toLowerCase();
    filtered = posts.filter((post) =>
      searchType === "AUTHOR"
        ? post.authorNickname.toLowerCase().includes(kw)
        : post.title.toLowerCase().includes(kw),
    );
  }

  return paginate(sortByCreatedAtDesc(filtered), page, size);
}

export async function mockFindPost(id) {
  await delay(200);

  const post = posts.find((item) => item.id === Number(id));
  if (!post) throw new Error("존재하지 않는 게시글입니다.");

  post.viewCount += 1;
  return toDetail(post);
}

export async function mockAddPost({ title, content }) {
  await delay(300);

  const user = requireLoginUser();
  const now = new Date().toISOString();
  const post = {
    id: nextId++,
    title,
    content,
    authorEmail: user.email,
    authorNickname: user.name,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  posts.unshift(post);
  return toDetail(post);
}

export async function mockUpdatePost(id, { title, content }) {
  await delay(300);

  const user = requireLoginUser();
  const post = posts.find((item) => item.id === Number(id));
  if (!post) throw new Error("존재하지 않는 게시글입니다.");
  if (post.authorEmail !== user.email && user.role !== "ADMIN") {
    throw new Error("게시글을 수정하거나 삭제할 권한이 없습니다.");
  }

  post.title = title;
  post.content = content;
  post.updatedAt = new Date().toISOString();
  return toDetail(post);
}

export async function mockDeletePost(id) {
  await delay(200);

  const user = requireLoginUser();
  const index = posts.findIndex((item) => item.id === Number(id));
  if (index === -1) throw new Error("존재하지 않는 게시글입니다.");
  if (posts[index].authorEmail !== user.email && user.role !== "ADMIN") {
    throw new Error("게시글을 수정하거나 삭제할 권한이 없습니다.");
  }

  posts.splice(index, 1);
  return null;
}

export async function mockFindMyPosts({ page = 0, size = 10 } = {}) {
  await delay(300);

  const user = requireLoginUser();
  const mine = posts.filter((post) => post.authorEmail === user.email);

  return paginate(sortByCreatedAtDesc(mine), page, size);
}
