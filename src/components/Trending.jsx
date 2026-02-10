import React, { useState, useEffect, useMemo } from "react";
import { loadPosts } from "../lib/postsStorage";
import { loadComments } from "../lib/commentsStorage";


// HARDCODED PLACEHOLDERS TAKEN FROM EXPLORE
const PLACEHOLDER_POSTS = {
  "General": [
    {
      id: "ph_General1",
      title: "Post title placeholder",
      body: "Some post discussing which split is better (these are hardcoded, it does not reflect the posts at the home page)",
      author: "user0",
      createdAt: Date.now(), // Sets time to "Now" so it counts for today
      tag: "General",
      isPlaceholder: true, // set this to true if you do not want placeholder posts to be navigated, for now I've set this to false
      votes: 22,
      commentCount: 12,
    },
    {
      id: "ph_General2",
      title: "Another post title",
      body: "Some post discussing about science-based lifting (these are hardcoded, it does not reflect the posts at the home page)",
      author: "user1",
      createdAt: Date.now(),
      tag: "General",
      isPlaceholder: true,
      votes: 10,
      commentCount: 7,
    },
    {
      id: "ph_General3",
      title: "Another one",
      body: "Some post discussing another fitness thing.",
      author: "user2",
      createdAt: Date.now(),
      tag: "General",
      isPlaceholder: true,
      votes: 12,
      commentCount: 6,
    },
    {
      id: "ph_Physique3",
      title: "Question about physique",
      body: "This is a post asking a physique-related question",
      author: "user3",
      createdAt: Date.now(),
      tag: "Physique",
      isPlaceholder: true,
      votes: 14,
      commentCount: 4,
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

export default function Trending() {
    //const posts = TRENDING_POSTS["General"] || [];
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        const allPosts = loadPosts();
        setPosts(allPosts);
    }, []);

    const realPosts = posts;
    const placeholders = PLACEHOLDER_POSTS["General"] || [];
    const displayPosts = [...realPosts, ...placeholders];

    return (
        <div className="trending-container">
            <div className="trending-header">
                <h1 className="trending-title">Trending</h1>
                <p className="trending-subtext">Most trending posts</p>
            </div>
            
            {/* TRENDING POSTS FEED */}
            <div className="trending-feed">
                {displayPosts.map((post, idx) => (
                    <TrendingPostCard key={post.id} post={post} rank={idx + 1} />
                ))}
            </div>
        </div>
    );
}
    

function TrendingPostCard({post, rank}) {
    const commentCount = post.isPlaceholder ? (post.commentCount || 0) : loadComments(post.id).length;

    function handleClick(e) {
    // If it's a placeholder, don't navigate 
    if (post.isPlaceholder) return;

    // Prevent navigation if the user clicked on a button ( or you can also put anchor tag incase)
    if (e.target.closest("button")) return;

    // Navigate to the post
    window.location.hash = `#/post/${post.id}`;
  }

    return (
        <div className="post" role="article" onClick={handleClick} style={{cursor: "pointer"}}>
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
                        <span className="trending-rank">#{rank}</span>
                        <span className="dot">•</span>
                        <span className="post-author">@{post.author}</span>
                        <span className="dot">•</span>
                        <span className="post-time">{timeAgo(post.createdAt)}</span>
                    </div>

                    <div className="post-title">{post.title}</div>
                    <div className="post-preview">{post.body}</div>

                    <div className="post-comments">
                        💬 <span className="post-comments-count">{commentCount}</span>
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
