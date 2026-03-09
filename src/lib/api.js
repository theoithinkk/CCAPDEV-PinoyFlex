async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
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
