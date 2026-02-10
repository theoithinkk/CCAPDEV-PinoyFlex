import { useState, useEffect, useMemo } from "react";
import { loadPosts } from "../lib/postsStorage";
import { loadComments } from "../lib/commentsStorage";

// 1. CONFIGURATION
const CATEGORIES = [
  { label: "Form/Technique", tag: "Form" },
  { label: "Meal Prep", tag: "Meal Prep" },
  { label: "Physique", tag: "Physique" },
  { label: "Beginner's Guide", tag: "Beginners" },
  { label: "General Discussion", tag: "General" },
  { label: "Success Stories", tag: "Success" },
];

// HARDCODED PLACEHOLDERS (just add more here if u want)
const PLACEHOLDER_POSTS = {
  "General": [
    {
      id: "ph_General1",
      title: "Post title placeholder",
      body: "Some post discussing which split is better (these are hardcoded, it does not reflect the posts at the home page)",
      author: "user",
      createdAt: Date.now(), // Sets time to "Now" so it counts for today
      tag: "General",
      isPlaceholder: false, // set this to true if you do not want placeholder posts to be navigated, for now I've set this to false
      votes: 18
    },
    {
      id: "ph_General2",
      title: "Another post title",
      body: "Some post discussing about science-based lifting (these are hardcoded, it does not reflect the posts at the home page)",
      author: "user",
      createdAt: Date.now(),
      tag: "General",
      isPlaceholder: false,
      votes: 22
    }
  ]
}; 

export default function Explore() {
  const [activeTab, setActiveTab] = useState("Form");
  const [posts, setPosts] = useState([]);
  
  //  DATA FETCHING
  useEffect(() => {
    // fetch from the API here
    const allPosts = loadPosts();
    setPosts(allPosts);
  }, []);

  // CALCULATE COUNTS (Real + Placeholders)
  const categoryStats = useMemo(() => {
    const stats = {};
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    CATEGORIES.forEach((cat) => {
      // This part counts real posts
      const realCount = posts.filter(
        (p) => p.tag === cat.tag && p.createdAt >= startOfDay
      ).length;

      // This part counts placeholder posts (from 'PLACEHOLDER_POSTS')
      const phCount = PLACEHOLDER_POSTS[cat.tag] ? PLACEHOLDER_POSTS[cat.tag].length : 0;

      stats[cat.tag] = realCount + phCount;
    });
    return stats;
  }, [posts]);

  // PREPARE VIEW DATA
  const realPosts = posts.filter((p) => p.tag === activeTab);
  const placeholders = PLACEHOLDER_POSTS[activeTab] || [];
  const displayPosts = [...realPosts, ...placeholders];

  return (
    <div className="explore-container">
      <div className="explore-header">
        <h1>Explore Categories</h1>
        <p className="subtext">Select a category to explore today.</p>
      </div>

      {/* CARDS GRID */}
      <div className="category-grid">
        {CATEGORIES.map((cat) => {
          const count = categoryStats[cat.tag] || 0;
          const isActive = activeTab === cat.tag;
          return (
            <button
              key={cat.tag}
              className={`category-card ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(cat.tag)}
            >
              <div className="cat-name">{cat.label}</div>
              <div className="cat-stat">
                {count > 0 ? (
                  <span className="stat-highlight">+{count} posts today</span>
                ) : (
                  <span className="stat-muted">No posts today</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* FEED */}
      <div className="explore-feed">
        {displayPosts.length === 0 ? (
          <div className="empty-state">
            <p>No posts in <strong>{CATEGORIES.find(c => c.tag === activeTab)?.label}</strong> yet.</p>
            <p className="subtext">Be the first to share your journey!</p>
          </div>
        ) : (
          displayPosts.map((post) => (
            <ExploreCard key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
  );
}

function ExploreCard({ post }) {
  const commentCount = post.isPlaceholder ? 0 : loadComments(post.id).length;
  
  function handleClick(e) {
    // If it's a placeholder, don't navigate 
    if (post.isPlaceholder) return;

    // Prevent navigation if the user clicked on a button ( or you can also put anchor tag incase)
    if (e.target.closest("button")) return;

    // Navigate to the post
    window.location.hash = `#/post/${post.id}`;
  }

  return (
    <div 
      className="explore-card"
      onClick={handleClick}
      style={{ cursor: post.isPlaceholder ? "default" : "pointer" }}
      role={post.isPlaceholder ? "presentation" : "link"}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e);
        }
      }}
    >
      <div className="explore-card-main" style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
        <div className="votes" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          marginRight: '16px',
          background: '#f8f9fa',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          minWidth: '40px'
        }}>
          <button className="vote-btn upvote" type="button" disabled={post.isPlaceholder} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>▲</button>
          <div className="vote-count" style={{ fontWeight: 'bold', margin: '4px 0' }}>{post.votes || 0}</div>
          <button className="vote-btn downvote" type="button" disabled={post.isPlaceholder} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>▼</button>
        </div>

        <div style={{ flex: 1 }}>
          <div className="explore-card-header">
            <span className="user-tag">@{post.author}</span>
            <span className="date-tag">{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
          <h3>
            {post.isPlaceholder ? (
              <span>{post.title}</span>
            ) : (
              <a href={`#/post/${post.id}`} onClick={(e) => e.preventDefault()}>
                {post.title}
              </a>
            )}
          </h3>
          <p className="preview-text">
            {post.body.length > 100 ? post.body.substring(0, 100) + "..." : post.body}
          </p>
          <div className="explore-card-footer">
            <span>💬 {commentCount} comments</span>
          </div>
        </div>
      </div>
    </div>
  );
}