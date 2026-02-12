import { loadComments } from "../lib/commentsStorage";
import { loadPosts } from "../lib/postsStorage";
import EarlyLifter from "../assets/badges/EarlyLifter.png";
import Streak7 from "../assets/badges/Streak7.png";
import TopContributor from "../assets/badges/TopContributor.png";
import MealPrepPro from "../assets/badges/MealPrepPro.png";
import FormGuru from "../assets/badges/FormGuru.png";

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

export default function Profile({ user, isCurrentUser, onEdit }) {
  if (!user) {
    return (
      <div className="profile-card">
        <h2>User not found</h2>
      </div>
    );
  }

  const allPosts = loadPosts();
  const posts = allPosts.filter((p) => p.author === user.username);

  const comments = [];
  allPosts.forEach((p) => {
    const postComments = loadComments(p.id);
    postComments.forEach((c) => {
      if (c.author === user.username) {
        comments.push({ ...c, postTitle: p.title });
      }
    });
  });

  return (
    <div className="block profile-edit-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img 
            src={user.avatar || "/avatars/default.png"} 
            alt={user.username} 
            style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} 
          />
          <div>
            <h2 className="profile-title" style={{ margin: 0 }}>@{user.username}</h2>
            {user.bio && (
              <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '400px' }}>
                {user.bio}
              </p>
            )}
          </div>
        </div>

        {isCurrentUser && (
          <button className="btn btn-secondary" onClick={onEdit}>
            Edit Profile
          </button>
        )}
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">Community</h3>
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-value">128</div>
            <div className="profile-stat-label">Followers</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{posts.length}</div>
            <div className="profile-stat-label">Posts</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{comments.length}</div>
            <div className="profile-stat-label">Comments</div>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">Badge Collection</h3>
        <div className="badge-grid">
          <div className="badge-photo">
            <img src={EarlyLifter} alt="Early Lifter badge" />
            <span>Early Lifter</span>
          </div>
          <div className="badge-photo">
            <img src={Streak7} alt="Streak 7 badge" />
            <span>Streak 7</span>
          </div>
          <div className="badge-photo">
            <img src={TopContributor} alt="Top Contributor badge" />
            <span>Top Contributor</span>
          </div>
          <div className="badge-photo">
            <img src={MealPrepPro} alt="Meal Prep Pro badge" />
            <span>Meal Prep Pro</span>
          </div>
          <div className="badge-photo">
            <img src={FormGuru} alt="Form Guru badge" />
            <span>Form Guru</span>
          </div>
        </div>
      </div>

      {isCurrentUser && (
        <div className="profile-section">
          <h3 className="profile-section-title">Settings</h3>
          <div className="profile-settings">
            <div className="setting-row">
              <div>
                <div className="setting-title">Dark Mode</div>
                <div className="setting-subtitle">Coming soon</div>
              </div>
              <label className="toggle">
                <input type="checkbox" disabled />
                <span className="toggle-track" />
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="profile-section">
        <h3 className="profile-section-title">
          {isCurrentUser ? "Your Posts" : "Posts"} ({posts.length})
        </h3>
        {posts.length === 0 ? (
          <div className="detail-muted">No posts yet.</div>
        ) : (
          <div className="profile-list">
            {posts.map((p) => (
              <a key={p.id} className="profile-item" href={`#/post/${p.id}`}>
                <div className="profile-item-title">{p.title}</div>
                <div className="profile-item-meta">
                  {timeAgo(p.createdAt)} {p.lastEdited && <span style={{fontSize:'0.8em', opacity:0.7}}>(edited)</span>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">
          {isCurrentUser ? "Your Comments" : "Comments"} ({comments.length})
        </h3>
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