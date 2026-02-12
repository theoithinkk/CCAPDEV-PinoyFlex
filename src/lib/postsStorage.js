import { SAMPLE_POSTS } from "./sampleData";
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

export function seedPostsIfEmpty() {
  if (loadPosts().length === 0) {
    savePosts(SAMPLE_POSTS);
  }
}

export function addPost(newPost) {
  const posts = loadPosts();
  const next = [newPost, ...posts]; 
  savePosts(next);
  return next;
}

export function deletePost(postId) {
  const posts = loadPosts();
  const next = posts.filter((p) => p.id !== postId);
  savePosts(next);
  return next;
}

export function voteOnPost(postId, username, direction) {
  if (!username || (direction !== 1 && direction !== -1)) return loadPosts();

  const posts = loadPosts();
  const next = posts.map((post) => {
    if (post.id !== postId) return post;

    const voteByUser = { ...(post.voteByUser || {}) };
    const prevVote = voteByUser[username] || 0;
    const nextVote = prevVote === direction ? 0 : direction;

    if (nextVote === 0) {
      delete voteByUser[username];
    } else {
      voteByUser[username] = nextVote;
    }

    const votes = (post.votes || 0) - prevVote + nextVote;
    return { ...post, votes, voteByUser };
  });

  savePosts(next);
  return next;
}

export function updatePost(postId, updates) {
  const posts = loadPosts();
  const index = posts.findIndex(p => p.id === postId);
  if (index === -1) return posts;
  
  posts[index] = { ...posts[index], ...updates };
  savePosts(posts);
  return posts;
}
