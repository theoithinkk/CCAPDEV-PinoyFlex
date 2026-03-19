async function request(path, options = {}) {
  const isFormDataBody = options.body instanceof FormData;
  const response = await fetch(path, {
    credentials: "include",
    headers: isFormDataBody
      ? { ...(options.headers || {}) }
      : {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
    ...options,
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}

async function uploadFile(path, fieldName, file, fallbackMessage = "Upload failed") {
  const body = new FormData();
  body.append(fieldName, file);

  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    body,
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }

  if (data?.file) {
    return data.file;
  }

  // Backward compatibility with older backend responses while dev servers restart.
  if (typeof data?.url === "string" && data.url.trim()) {
    return { url: data.url.trim() };
  }
  if (typeof data?.proofUrl === "string" && data.proofUrl.trim()) {
    return { url: data.proofUrl.trim() };
  }

  throw new Error("Upload succeeded but no file URL was returned.");
}

export async function getSession() {
  const data = await request("/api/session");
  return data.user || null;
}

export async function loginUser(username, password) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return data.user;
}

export async function registerUser(username, password) {
  const data = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return data.user;
}

export async function logoutUser() {
  await request("/api/auth/logout", { method: "POST" });
}

export async function getPosts() {
  const data = await request("/api/posts");
  return data.posts || [];
}

export async function createPost(payload) {
  const data = await request("/api/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.post;
}

export async function editPost(postId, updates) {
  const data = await request(`/api/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return data.post;
}

export async function removePost(postId) {
  await request(`/api/posts/${postId}`, { method: "DELETE" });
}

export async function votePost(postId, direction) {
  const data = await request(`/api/posts/${postId}/vote`, {
    method: "POST",
    body: JSON.stringify({ direction }),
  });
  return data.post;
}

export async function getPostComments(postId) {
  const data = await request(`/api/posts/${postId}/comments`);
  return data.comments || [];
}

export async function createComment(postId, body) {
  const data = await request(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return data.comment;
}

export async function editComment(postId, commentId, body) {
  const data = await request(`/api/posts/${postId}/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
  return data.comment;
}

export async function removeComment(postId, commentId) {
  await request(`/api/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

export async function getUserProfile(username) {
  const data = await request(`/api/users/${encodeURIComponent(username)}/profile`);
  return data;
}

export async function updateMyProfile(updates) {
  const data = await request("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return data.user;
}

export async function uploadMyAvatar(file) {
  const form = new FormData();
  form.append("avatar", file);
  const data = await request("/api/users/me/avatar", {
    method: "POST",
    body: form,
  });
  return data.user;
}

export function uploadPostImage(file) {
  return uploadFile("/api/posts/upload-image", "image", file, "Image upload failed.");
}

export async function getTags() {
  const data = await request("/api/tags");
  return data.tags || [];
}

export async function createTag(name) {
  const data = await request("/api/tags", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return data.tag;
}

export async function getWorkoutLogs() {
  const data = await request("/api/workout-logs");
  return data.logs || {};
}

export async function upsertWorkoutLog(dateKey, text) {
  const data = await request(`/api/workout-logs/${encodeURIComponent(dateKey)}`, {
    method: "PUT",
    body: JSON.stringify({ text }),
  });
  return data.logs || {};
}

export async function searchAll(query) {
  const data = await request(`/api/search?q=${encodeURIComponent(query || "")}`);
  return data;
}

export async function getSearchMeta() {
  return request("/api/search/meta");
}

export async function saveSearchHistory(query) {
  return request("/api/search/history", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export async function getFeaturedNews() {
  return request("/api/news/featured");
}

export async function getNewsById(newsId) {
  return request(`/api/news/${encodeURIComponent(newsId)}`);
}

export async function getTrendingFeed({ limit = 10, windowDays = 7 } = {}) {
  const data = await request(`/api/feed/trending?limit=${limit}&windowDays=${windowDays}`);
  return data.items || [];
}

export async function getExploreFeed({ tag = "", page = 1, limit = 20 } = {}) {
  const qs = new URLSearchParams();
  if (tag) qs.set("tag", tag);
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  return request(`/api/feed/explore?${qs.toString()}`);
}

export async function followUser(username) {
  return request(`/api/users/${encodeURIComponent(username)}/follow`, { method: "POST" });
}

export async function unfollowUser(username) {
  return request(`/api/users/${encodeURIComponent(username)}/follow`, { method: "DELETE" });
}

export async function getFollowers(username, page = 1, limit = 20) {
  return request(`/api/users/${encodeURIComponent(username)}/followers?page=${page}&limit=${limit}`);
}

export async function getFollowing(username, page = 1, limit = 20) {
  return request(`/api/users/${encodeURIComponent(username)}/following?page=${page}&limit=${limit}`);
}

export async function submitReport(payload) {
  return request("/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getNotifications(page = 1, limit = 20) {
  return request(`/api/notifications?page=${page}&limit=${limit}`);
}

export async function markNotificationRead(id) {
  return request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  return request("/api/notifications/read-all", { method: "POST" });
}

export async function getBadges() {
  return request("/api/badges");
}

export async function getUserBadges(username) {
  return request(`/api/users/${encodeURIComponent(username)}/badges`);
}

export async function createVerification(payload) {
  return request("/api/verifications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyVerifications(page = 1, limit = 20) {
  return request(`/api/verifications/me?page=${page}&limit=${limit}`);
}

export async function uploadVerificationProof(file) {
  return uploadFile("/api/verifications/upload", "proof", file, "Upload failed.");
}

export function uploadBadgeImage(file) {
  return uploadFile("/api/admin/badges/upload", "image", file, "Image upload failed.");
}
