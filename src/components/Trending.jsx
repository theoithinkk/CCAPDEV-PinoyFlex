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

function getVoteBySession(post, session) {
  if (!post || !session) return 0;
  const byUser = post.voteByUser || {};
  return byUser[session.id] ?? byUser[session.username] ?? 0;
}

export default function Trending({ posts = [], isLoggedIn, session, onVote, onRequireLogin }) {
  const displayPosts = [...posts].sort((a, b) => {
    const voteDelta = Number(b.votes || 0) - Number(a.votes || 0);
    if (voteDelta !== 0) return voteDelta;
    return Number(b.createdAt || 0) - Number(a.createdAt || 0);
  });

  function handleVote(postId, direction) {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    onVote?.(postId, direction);
  }

  return (
    <div className="trending-container">
      <div className="trending-header">
        <h1 className="trending-title">Trending</h1>
        <p className="trending-subtext">Most trending posts</p>
      </div>

      <div className="trending-feed">
        {displayPosts.map((post, idx) => (
          <TrendingPostCard
            key={post.id}
            post={post}
            rank={idx + 1}
            userVote={getVoteBySession(post, session)}
            onVote={handleVote}
          />
        ))}
      </div>
    </div>
  );
}

function TrendingPostCard({ post, rank, userVote = 0, onVote }) {
  const commentCount = post.commentCount || 0;

  function handleClick(e) {
    if (e.target.closest("button")) return;
    window.location.hash = `#/post/${post.id}`;
  }

  return (
    <div className="post" role="article" onClick={handleClick} style={{ cursor: "pointer" }}>
      <div className="votes">
        <button
          className={"vote-btn upvote" + (userVote === 1 ? " is-active" : "")}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onVote?.(post.id, 1);
          }}
        >
          ▲
        </button>
        <div className="vote-count">{post.votes || 0}</div>
        <button
          className={"vote-btn downvote" + (userVote === -1 ? " is-active" : "")}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onVote?.(post.id, -1);
          }}
        >
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

        <div className="post-right">{post.tag && <div className="post-tag">{post.tag}</div>}</div>
      </div>
    </div>
  );
}
