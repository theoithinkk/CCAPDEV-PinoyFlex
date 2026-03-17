import { useMemo, useState } from "react";

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

const BADGE_LABELS = {
  "bench-225": "225 lb Bench",
  "squat-315": "315 lb Squat",
  "deadlift-405": "405 lb Deadlift",
  "bodyweight-pullup-20": "20 Pull-Ups",
};

function formatBadgeLabel(key) {
  if (!key) return "Badge";
  if (BADGE_LABELS[key]) return BADGE_LABELS[key];
  return key
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export default function Profile({
  user,
  isCurrentUser,
  isLoggedIn,
  onEdit,
  onToggleFollow,
  onOpenFollowers,
  onOpenFollowing,
  followBusy = false,
  userPosts = [],
  userComments = [],
  userHistory = [],
}) {
  if (!user) {
    return (
      <div className="profile-card">
        <h2>User not found</h2>
      </div>
    );
  }

  const tabs = useMemo(
    () =>
      isCurrentUser
        ? [
            { id: "overview", label: "Overview" },
            { id: "posts", label: "Posts" },
            { id: "comments", label: "Comments" },
            { id: "history", label: "Interaction History" },
          ]
        : [
            { id: "overview", label: "Overview" },
            { id: "posts", label: "Posts" },
            { id: "comments", label: "Comments" },
          ],
    [isCurrentUser]
  );
  const [activeTab, setActiveTab] = useState("overview");

  const recentPosts = userPosts.slice(0, 3);
  const recentComments = userComments.slice(0, 3);
  const recentHistory = userHistory.slice(0, 4);

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

        {isCurrentUser ? (
          <button className="btn btn-secondary" onClick={onEdit}>
            Edit Profile
          </button>
        ) : (
          isLoggedIn && (
            <button
              className="btn btn-primary"
              onClick={() => onToggleFollow?.(user.username, !!user.isFollowing)}
              disabled={followBusy}
            >
              {user.isFollowing ? "Unfollow" : "Follow"}
            </button>
          )
        )}
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">Community</h3>
        <div className="profile-stats">
          <div className="profile-stat">
            <button
              className="profile-stat-value"
              style={{ border: 0, background: "transparent", cursor: "pointer" }}
              onClick={() => onOpenFollowers?.(user.username)}
            >
              {user.followersCount ?? 0}
            </button>
            <div className="profile-stat-label">Followers</div>
          </div>
          <div className="profile-stat">
            <button
              className="profile-stat-value"
              style={{ border: 0, background: "transparent", cursor: "pointer" }}
              onClick={() => onOpenFollowing?.(user.username)}
            >
              {user.followingCount ?? 0}
            </button>
            <div className="profile-stat-label">Following</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{userPosts.length}</div>
            <div className="profile-stat-label">Posts</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{userComments.length}</div>
            <div className="profile-stat-label">Comments</div>
          </div>
        </div>
      </div>

      <div className="profile-tabs" role="tablist" aria-label="Profile sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={"profile-tab" + (activeTab === tab.id ? " is-active" : "")}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <div className="profile-section">
            <h3 className="profile-section-title">Badge Collection</h3>
            {(user.badges || []).length === 0 ? (
              <div className="detail-muted">No badges yet.</div>
            ) : (
              <div className="profile-list">
                {(user.badges || []).map((badgeKey) => (
                  <div key={badgeKey} className="profile-item">
                    <div className="profile-item-title">{formatBadgeLabel(badgeKey)}</div>
                    <div className="profile-item-meta">{badgeKey}</div>
                  </div>
                ))}
              </div>
            )}
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
              Recent Posts ({userPosts.length})
            </h3>
            {recentPosts.length === 0 ? (
              <div className="detail-muted">No posts yet.</div>
            ) : (
              <div className="profile-list">
                {recentPosts.map((p) => (
                  <a key={p.id} className="profile-item" href={p.postType === "news" ? `#/news/${p.id}` : `#/post/${p.id}`}>
                    <div className="profile-item-title">{p.title}</div>
                    <div className="profile-item-meta">
                      {timeAgo(p.createdAt)}{" "}
                      {p.lastEdited && <span style={{ fontSize: "0.8em", opacity: 0.7 }}>(edited)</span>}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="profile-section">
            <h3 className="profile-section-title">
              Recent Comments ({userComments.length})
            </h3>
            {recentComments.length === 0 ? (
              <div className="detail-muted">No comments yet.</div>
            ) : (
              <div className="profile-list">
                {recentComments.map((c) => (
                  <a key={c.id} className="profile-item" href={c.postType === "news" ? `#/news/${c.postId}` : `#/post/${c.postId}`}>
                    <div className="profile-item-title">{c.postTitle}</div>
                    <div className="profile-item-body">{c.body}</div>
                    <div className="profile-item-meta">{timeAgo(c.createdAt)}</div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {isCurrentUser && (
            <div className="profile-section">
              <h3 className="profile-section-title">
                Recent Interaction History ({userHistory.length})
              </h3>
              {recentHistory.length === 0 ? (
                <div className="detail-muted">No interactions yet.</div>
              ) : (
                <div className="profile-list">
                  {recentHistory.map((item, index) => (
                    <a
                      key={`${item.type}-${item.postId}-${item.createdAt || 0}-${index}`}
                      className="profile-item"
                      href={`#/post/${item.postId}`}
                    >
                      <div className="profile-item-title">{item.title || "Post interaction"}</div>
                      <div className="profile-item-body">
                        {item.type === "voted"
                          ? "You voted on this post"
                          : "You commented on this post"}
                      </div>
                      <div className="profile-item-meta">{timeAgo(item.createdAt)}</div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "posts" && (
        <div className="profile-section">
          <h3 className="profile-section-title">
            {isCurrentUser ? "Your Posts" : "Posts"} ({userPosts.length})
          </h3>
          {userPosts.length === 0 ? (
            <div className="detail-muted">No posts yet.</div>
          ) : (
            <div className="profile-list">
              {userPosts.map((p) => (
                <a key={p.id} className="profile-item" href={p.postType === "news" ? `#/news/${p.id}` : `#/post/${p.id}`}>
                  <div className="profile-item-title">{p.title}</div>
                  <div className="profile-item-meta">
                    {timeAgo(p.createdAt)}{" "}
                    {p.lastEdited && <span style={{ fontSize: "0.8em", opacity: 0.7 }}>(edited)</span>}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "comments" && (
        <div className="profile-section">
          <h3 className="profile-section-title">
            {isCurrentUser ? "Your Comments" : "Comments"} ({userComments.length})
          </h3>
          {userComments.length === 0 ? (
            <div className="detail-muted">No comments yet.</div>
          ) : (
            <div className="profile-list">
              {userComments.map((c) => (
                <a key={c.id} className="profile-item" href={c.postType === "news" ? `#/news/${c.postId}` : `#/post/${c.postId}`}>
                  <div className="profile-item-title">{c.postTitle}</div>
                  <div className="profile-item-body">{c.body}</div>
                  <div className="profile-item-meta">{timeAgo(c.createdAt)}</div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && isCurrentUser && (
        <div className="profile-section">
          <h3 className="profile-section-title">
            Interaction History ({userHistory.length})
          </h3>
          {userHistory.length === 0 ? (
            <div className="detail-muted">No interactions yet.</div>
          ) : (
            <div className="profile-list">
              {userHistory.map((item, index) => (
                <a
                  key={`${item.type}-${item.postId}-${item.createdAt || 0}-${index}`}
                  className="profile-item"
                  href={item.postType === "news" ? `#/news/${item.postId}` : `#/post/${item.postId}`}
                >
                  <div className="profile-item-title">{item.title || "Post interaction"}</div>
                  <div className="profile-item-body">
                    {item.type === "voted"
                      ? "You voted on this post"
                      : "You commented on this post"}
                  </div>
                  <div className="profile-item-meta">{timeAgo(item.createdAt)}</div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
