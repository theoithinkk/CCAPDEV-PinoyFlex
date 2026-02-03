const LS_POSTS = "pf_posts_v1";

export function loadPosts() {
  const raw = localStorage.getItem(LS_POSTS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePosts(posts) {
  localStorage.setItem(LS_POSTS, JSON.stringify(posts));
}

export function addPost(newPost) {
  const posts = loadPosts();
  const next = [newPost, ...posts]; // newest first
  savePosts(next);
  return next;
}

export function deletePost(postId) {
  const posts = loadPosts();
  const next = posts.filter((p) => p.id !== postId);
  savePosts(next);
  return next;
}
