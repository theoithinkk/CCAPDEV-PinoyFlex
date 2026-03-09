import { useEffect, useMemo, useState } from "react";

const CATEGORIES = [
  { label: "Form/Technique", tag: "Form" },
  { label: "Meal Prep", tag: "Meal Prep" },
  { label: "Physique", tag: "Physique" },
  { label: "Beginner's Guide", tag: "Beginners" },
  { label: "General Discussion", tag: "General" },
  { label: "Success Stories", tag: "Success" },
];

function getVoteBySession(post, session) {
  if (!post || !session) return 0;
  const byUser = post.voteByUser || {};
  return byUser[session.id] ?? byUser[session.username] ?? 0;
}

export default function Explore({ posts = [], isLoggedIn, session, onVote, onRequireLogin }) {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    return params.get("cat") || "Form";
  });

  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash;
      if (hash.includes("?cat=")) {
        const catValue = decodeURIComponent(hash.split("?cat=")[1]);
        if (CATEGORIES.some((c) => c.tag === catValue)) {
          setActiveTab(catValue);
        }
      }
    }

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const categoryStats = useMemo(() => {
    const stats = {};
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    CATEGORIES.forEach((cat) => {
      stats[cat.tag] = posts.filter((p) => p.tag === cat.tag && p.createdAt >= startOfDay).length;
    });
    return stats;
  }, [posts]);

  const displayPosts = useMemo(
    () => posts.filter((p) => p.tag === activeTab).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)),
    [posts, activeTab]
  );

  function handleVote(postId, direction) {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    onVote?.(postId, direction);
  }

  return (
    <div className="explore-container">
      <div className="explore-header">
        <h1>Explore Categories</h1>
        <p className="subtext">Select a category to explore today.</p>
      </div>

      <div className="category-grid">
        {CATEGORIES.map((cat) => {
          const count = categoryStats[cat.tag] || 0;
          const isActive = activeTab === cat.tag;
          return (
            <button
              key={cat.tag}
              className={`category-card ${isActive ? "active" : ""}`}
              onClick={() => {
                setActiveTab(cat.tag);
                window.location.hash = `#/explore?cat=${encodeURIComponent(cat.tag)}`;
              }}
            >
              <div className="cat-name">{cat.label}</div>
              <div className="cat-stat">
                {count > 0 ? <span className="stat-highlight">+{count} posts today</span> : <span className="stat-muted">No posts today</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="explore-feed">
        {displayPosts.length === 0 ? (
          <div className="empty-state">
            <p>
              No posts in <strong>{CATEGORIES.find((c) => c.tag === activeTab)?.label}</strong> yet.
            </p>
            <p className="subtext">Be the first to share your journey!</p>
          </div>
        ) : (
          displayPosts.map((post) => (
            <ExploreCard
              key={post.id}
              post={post}
              userVote={getVoteBySession(post, session)}
              onVote={handleVote}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ExploreCard({ post, userVote = 0, onVote }) {
  const commentCount = post.commentCount || 0;

  function handleClick(e) {
    if (e.target.closest("button")) return;
    window.location.hash = `#/post/${post.id}`;
  }

  return (
    <div
      className="explore-card"
      onClick={handleClick}
      style={{ cursor: "pointer" }}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e);
        }
      }}
    >
      <div className="explore-card-main" style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
        <div
          className="votes"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginRight: "16px",
            background: "#f8f9fa",
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid var(--border-subtle)",
            minWidth: "40px",
          }}
        >
          <button
            className={"vote-btn upvote" + (userVote === 1 ? " is-active" : "")}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onVote?.(post.id, 1);
            }}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            ▲
          </button>
          <div className="vote-count" style={{ fontWeight: "bold", margin: "4px 0" }}>
            {post.votes || 0}
          </div>
          <button
            className={"vote-btn downvote" + (userVote === -1 ? " is-active" : "")}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onVote?.(post.id, -1);
            }}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            ▼
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <div className="explore-card-header">
            <span className="user-tag">@{post.author}</span>
            <span className="date-tag">{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
          <h3>
            <a href={`#/post/${post.id}`} onClick={(e) => e.preventDefault()}>
              {post.title}
            </a>
          </h3>
          <p className="preview-text">{post.body.length > 100 ? `${post.body.substring(0, 100)}...` : post.body}</p>
          <div className="explore-card-footer">
            <span>💬 {commentCount} comments</span>
          </div>
        </div>
      </div>
    </div>
  );
}
