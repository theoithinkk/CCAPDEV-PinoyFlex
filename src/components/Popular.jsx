import React from "react";

const POPULAR_CATEGORIES = [
    { label: "Form/Technique", tag: "Form", postCount: 100},
    { label: "Meal Prep", tag: "Meal Prep", postCount: 81},
    { label: "Physique", tag: "Physique", postCount: 73},
    { label: "Beginner's Guide", tag: "Beginners", postCount: 59},
    { label: "General Discussion", tag: "General", postCount: 50},
    { label: "Success Stories", tag: "Success", postCount: 42},
];

// HARDCODED PLACEHOLDERS TAKEN FROM EXPLORE
const POPULAR_POSTS = {
  "General": [
    {
      id: "ph_General1",
      title: "Post title placeholder",
      body: "Some post discussing which split is better (these are hardcoded, it does not reflect the posts at the home page)",
      author: "user",
      createdAt: Date.now(), // Sets time to "Now" so it counts for today
      tag: "General",
      isPlaceholder: false, // set this to true if you do not want placeholder posts to be navigated, for now I've set this to false
      votes: 22,
      commentCount: 9,
    },
    {
      id: "ph_General2",
      title: "Another post title",
      body: "Some post discussing about science-based lifting (these are hardcoded, it does not reflect the posts at the home page)",
      author: "user",
      createdAt: Date.now(),
      tag: "General",
      isPlaceholder: false,
      votes: 18,
      commentCount: 11,
    }
  ]
}; 

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

export default function Popular() {
    const categories = POPULAR_CATEGORIES;
    const posts = POPULAR_POSTS["General"] || [];

    return (
        <div className="popular-container">
            <div className="popular-header">
                <h1 className="popular-title">Popular</h1>
                <p className="popular-subtext">Most popular posts</p>
            </div>

            {/* MOST POPULAR CATEGORIES */}
            <div className="popular-categs-block">
                <div className="popular-categs-row">
                    <div className="popular-categs-heading">Most popular categories</div>
                    <a className="popular-categs-seeall" href="#/popular">See all</a>
                </div>

                <div className="popular-categs-strip" role="list" aria-label="Popular categories">
                    {categories.map((c) => (
                        <button
                            key={c.tag}
                            className="popular-categs-pill"
                            type="button"
                            title="Most popular from this category"
                        >
                            <div className="popular-categs-name">{c.label}</div>
                            <div className="popular-categs-count">{c.postCount} posts</div>
                        </button>
                    ))}
                </div>
            </div>
            
            {/* POPULAR POSTS FEED */}
            <div className="popular-feed">
                {posts.map((p, idx) => (
                    <PopularPostCard key={p.id} post={p} rank={idx + 1} />
                ))}
            </div>
        </div>
    );
}
    

function PopularPostCard({post, rank}) {
    return (
        <div className="post" role="article">
            <div className="votes">
                <button className="vote-btn upvote" type="button" onClick={(e) => e.preventDefault()}>
                    ▲
                </button>
                <div className="vote-count">{post.votes}</div>
                <button className="vote-btn downvote" type="button" onClick={(e) => e.preventDefault()}>
                    ▼
                </button>
            </div>

            <div className="post-main">
                <div className="post-left">
                    <div className="post-subline post-subline--top">
                        <span className="popular-rank">#{rank}</span>
                        <span className="dot">•</span>
                        <span className="post-author">@{post.author}</span>
                        <span className="dot">•</span>
                        <span className="post-time">{timeAgo(post.createdAt)}</span>
                    </div>

                    <div className="post-title">{post.title}</div>
                    <div className="post-preview">{post.body}</div>

                    <div className="post-comments">
                        💬 <span className="post-comments-count">{post.commentCount}</span>
                    </div>
                </div>

                <div className="post-right">
                    {/* TAG */}
                    {post.tag && <div className="post-tag">{post.tag}</div>}
                </div>
            </div>
        </div>
    );
}
