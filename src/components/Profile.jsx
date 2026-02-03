import { useAuth } from "../hooks/useAuth";
import { loadComments } from "../lib/commentsStorage";
import { loadPosts } from "../lib/postsStorage";

export default function Profile() {
  const { session, isLoggedIn } = useAuth();

  if (!isLoggedIn || !session) {
    return (
      <div className="profile-card">
        <h2>Please log in to view your profile</h2>
      </div>
    );
  }

  const allPosts = loadPosts();
  const posts = allPosts.filter((p) => p.author === session.username);

  const comments = [];
  allPosts.forEach((p) => {
    const postComments = loadComments(p.id);
    postComments.forEach((c) => {
      if (c.author === session.username) {
        comments.push({ ...c, postTitle: p.title });
      }
    });
  });

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="block profile-edit-card">
      <h2 className="profile-title">@{session.username}</h2>

      <div className="profile-section">
        <h3 className="profile-section-title">Your Posts ({posts.length})</h3>
        {posts.length === 0 ? (
          <div className="detail-muted">No posts yet.</div>
        ) : (
          <div className="profile-list">
            {posts.map((p) => (
              <a key={p.id} className="profile-item" href={`#/post/${p.id}`}>
                <div className="profile-item-title">{p.title}</div>
                <div className="profile-item-meta">{timeAgo(p.createdAt)}</div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">Your Comments ({comments.length})</h3>
        {comments.length === 0 ? (
          <div className="detail-muted">No comments yet.</div>
        ) : (
          <div className="profile-list">
            {comments.map((c) => (
              <a key={c.id} className="profile-item" href={`#/post/${c.postId}`}>
                <div className="profile-item-title">{c.postTitle}</div>
                <div className="profile-item-body">{c.body}</div>
                <div className="profile-item-meta">{timeAgo(c.createdAt)}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
