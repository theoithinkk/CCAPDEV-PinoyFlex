const LS_COMMENTS = "pf_comments_v1";

/**
 * Stored as an object:
 * {
 *   "postId1": [ { id, postId, author, body, createdAt }, ... ],
 *   "postId2": [ ... ]
 * }
 */

function loadAll() {
  const raw = localStorage.getItem(LS_COMMENTS);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAll(map) {
  localStorage.setItem(LS_COMMENTS, JSON.stringify(map));
}

export function loadComments(postId) {
  const map = loadAll();
  const arr = map[postId];
  return Array.isArray(arr) ? arr : [];
}

export function addComment(postId, comment) {
  const map = loadAll();
  const existing = Array.isArray(map[postId]) ? map[postId] : [];
  const next = [...existing, comment]; // oldest -> newest
  map[postId] = next;
  saveAll(map);
  return next;
}

export function deleteComment(postId, commentId) {
  const map = loadAll();
  const existing = Array.isArray(map[postId]) ? map[postId] : [];
  const next = existing.filter((c) => c.id !== commentId);
  map[postId] = next;
  saveAll(map);
  return next;
}

export function countComments(postId) {
  return loadComments(postId).length;
}

export function deleteCommentsForPost(postId) {
  const map = loadAll();
  if (map[postId]) {
    delete map[postId];
    saveAll(map);
  }
}
