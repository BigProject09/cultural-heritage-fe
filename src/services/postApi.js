import { request } from "./backendApi";
import {
  mockAddPost,
  mockDeletePost,
  mockFindAllPosts,
  mockFindMyPosts,
  mockFindPost,
  mockUpdatePost,
} from "./postMock";

const USE_MOCK = import.meta.env.VITE_USE_BOARD_MOCK === "true";

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function findAllPosts({ searchType, keyword, page = 0, size = 10, signal } = {}) {
  if (USE_MOCK) return mockFindAllPosts({ searchType, keyword, page, size });

  return request(`/api/posts${buildQuery({ searchType, keyword, page, size })}`, {
    signal,
  });
}

export function findPost(id, { signal } = {}) {
  if (USE_MOCK) return mockFindPost(id);

  return request(`/api/posts/${id}`, { signal });
}

export function addPost({ title, content }) {
  if (USE_MOCK) return mockAddPost({ title, content });

  return request("/api/posts", {
    method: "POST",
    body: JSON.stringify({ title, content }),
  });
}

export function updatePost(id, { title, content }) {
  if (USE_MOCK) return mockUpdatePost(id, { title, content });

  return request(`/api/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title, content }),
  });
}

export function deletePost(id) {
  if (USE_MOCK) return mockDeletePost(id);

  return request(`/api/posts/${id}`, { method: "DELETE" });
}

export function findMyPosts({ page = 0, size = 10, signal } = {}) {
  if (USE_MOCK) return mockFindMyPosts({ page, size });

  return request(`/api/posts/me${buildQuery({ page, size })}`, { signal });
}

/** 목록/상세 응답에 작성자 id가 없어, 소유 여부는 /api/posts/me 조회로 판별한다. */
export async function isMyPost(id) {
  const myPosts = await findMyPosts({ size: 1000 });
  return myPosts.posts.some((post) => post.id === Number(id));
}
