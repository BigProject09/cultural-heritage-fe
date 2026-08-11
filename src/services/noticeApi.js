import { request } from "./backendApi";
import {
  mockAddNotice,
  mockDeleteNotice,
  mockFindAllNotices,
  mockFindNotice,
  mockUpdateNotice,
} from "./noticeMock";

const USE_MOCK = import.meta.env.VITE_USE_NOTICE_MOCK === "true";

export function findAllNotices({ signal } = {}) {
  if (USE_MOCK) return mockFindAllNotices();

  return request("/api/notices", { signal });
}

export function findNotice(id, { signal } = {}) {
  if (USE_MOCK) return mockFindNotice(id);

  return request(`/api/notices/${id}`, { signal });
}

export function addNotice({ title, content, isPinned }) {
  if (USE_MOCK) return mockAddNotice({ title, content, isPinned });

  return request("/api/notices", {
    method: "POST",
    body: JSON.stringify({ title, content, isPinned }),
  });
}

export function updateNotice(id, { title, content, isPinned }) {
  if (USE_MOCK) return mockUpdateNotice(id, { title, content, isPinned });

  return request(`/api/notices/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title, content, isPinned }),
  });
}

export function deleteNotice(id) {
  if (USE_MOCK) return mockDeleteNotice(id);

  return request(`/api/notices/${id}`, { method: "DELETE" });
}
