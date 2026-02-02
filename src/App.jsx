import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthModal from "./components/AuthModal";
import CreatePostModal from "./components/CreatePostModal";
import { addPost, loadPosts } from "./lib/postsStorage";
import { addComment, loadComments } from "./lib/commentsStorage";

export default function App() {
  /* SORT LOGIC (not done) */
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("Best");
  const sortItems = useMemo(() => ["Best", "Hot", "Top", "New"], []);

  function chooseSort(item) {
    setSortBy(item);
    setSortOpen(false);
  }

  /* LOGIN REGISTRY AUTHORIZATION */
  const { session, isLoggedIn, login, logout } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login | signup

  function openLogin() {
    setAuthMode("login");
    setAuthOpen(true);
  }
  function openSignup() {
    setAuthMode("signup");
    setAuthOpen(true);
  }

  /* POSTS */
  const [posts, setPosts] = useState([]);
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    function onHashChange() {
      setRoute(getRoute());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const activePostId = parsePostIdFromHash(route);
  const activePost = activePostId ? posts.find((p) => p.id === activePostId) : null;

  useEffect(() => {
    setPosts(loadPosts());
  }, []);

  /* CREATE POST */
  const [createOpen, setCreateOpen] = useState(false);

  function openCreatePost() {
    if (!isLoggedIn) {
      openLogin();
      return;
    }
    setCreateOpen(true);
  }

  function handleCreate({ title, tag, body }) {
    const now = Date.now();
    const newPost = {
      id: `p_${now}`,
      title,
      tag,
      body,
      author: session.username,
      createdAt: now,
      votes: 0,
      commentCount: 0,
    };

    const next = addPost(newPost);
    setPosts(next);
    setCreateOpen(false);
  }

  useEffect(() => {
    const anyOpen = authOpen || createOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [authOpen, createOpen]);

  return (
    <div className="app">
      {/* HEADER */}
      <header className="brandbar">
        <div className="brandbar-inner">
          <div className="brand-logo" aria-hidden="true" />
          <div className="brand-text">
            Pinoy<span className="brand-flex">Flex</span>
          </div>
        </div>
      </header>

      {/* NAVIGATION HEADER */}
      <header className="navstrip">
        <div className="navstrip-inner">
          <nav className="navlinks" aria-label="Primary">
            <a className="navlink is-active" href="#/">Home</a>
            <a className="navlink" href="#/explore">Explore</a>
            <a className="navlink" href="#/trending">Trending</a>
            <a className="navlink" href="#/popular">Popular</a>
          </nav>

          <div className="nav-center">
            <input
              type="text"
              className="nav-search"
              placeholder="Search PinoyFlex"
              aria-label="Search"
            />
          </div>

          <div className="navactions">
            {!isLoggedIn ? (
              <>
                <button className="btn btn-login" type="button" onClick={openLogin}>
                  Log in
                </button>
                <button className="btn btn-register" type="button" onClick={openSignup}>
                  Register
                </button>
              </>
            ) : (
              <>
                <div className="session-pill">@{session.username}</div>
                <button className="btn btn-logout" type="button" onClick={logout}>
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* PAGE SHELL */}
      <div className="shell">
        <div className="layout">
          {/* LEFT */}
          <aside className="panel panel-left">
            <div className="block block-news">
              <h2>Current Fitness News</h2>
            </div>

            <div className="block">
              <h3>Popular Categories</h3>
              <a href="#/c/form" className="category-link">Form / Technique</a>
              <a href="#/c/mealprep" className="category-link">Meal Prep</a>
              <a href="#/c/physique" className="category-link">Physique</a>
              <a href="#/c/beginners" className="category-link">Beginners Guide</a>
              <a href="#/c/general" className="category-link">General Discussion</a>
              <a href="#/c/success" className="category-link">Success Stories</a>
            </div>
          </aside>

          {/* CENTER FEED */}
          <main className="feed">
            {activePostId ? (
              <PostDetail
                post={activePost}
                isLoggedIn={isLoggedIn}
                session={session}
                openLogin={openLogin}
                onUpdatePostCommentCount={(postId, count) => {
                  setPosts((prev) =>
                    prev.map((p) => (p.id === postId ? { ...p, commentCount: count } : p))
                  );
                }}
              />
            ) : (
              <>
                <div className="feed-header sort">
                  <button
                    className="sort-btn"
                    type="button"
                    onClick={() => setSortOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={sortOpen}
                  >
                    {sortBy} ▾
                  </button>

                  <div className={"sort-menu" + (sortOpen ? " show" : "")} role="menu">
                    {sortItems.map((item) => (
                      <div
                        key={item}
                        className="sort-item"
                        role="menuitem"
                        tabIndex={0}
                        onClick={() => chooseSort(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") chooseSort(item);
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <button className="btn btn-primary create-btn" type="button" onClick={openCreatePost}>
                    + Create Post
                  </button>
                </div>

                {/* FEED */}
                {posts.length === 0 ? (
                  <>
                    <PostCard id="sample1" title="Post title placeholder" meta="by user · 7 hours ago" votes={18} tag="General" commentCount={0}/>
                    <PostCard id="sample2" title="Another post title" meta="by user · 7 hours ago" votes={22} tag="General" commentCount={0}/>
                  </>
                ) : (
                  posts.map((p) => (
                  <PostCard
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    author={p.author}
                    createdAt={p.createdAt}
                    preview={(p.body || "").slice(0, 120) + ((p.body || "").length > 120 ? "…" : "")}
                    votes={p.votes}
                    tag={p.tag}
                    commentCount={p.commentCount || 0}
                  />
                  ))
                )}
              </>
            )}
          </main>

          {/* RIGHT */}
          <aside className="panel panel-right">
            <div className="block">
              <h3>Top Contributors</h3>
            </div>

            <div className="block">
              <h3>Trending Topics</h3>
              <a href="#/t/topic1" className="topic-link">Topic 1</a>
              <a href="#/t/topic2" className="topic-link">Topic 2</a>
            </div>
          </aside>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <a href="#/about" className="footer-link">About Us</a>
          </div>
          <div className="footer-right">
            <a href="#/guidelines" className="footer-link">Guidelines</a>
            <a href="#/support" className="footer-link">Support</a>
            <a href="#/contact" className="footer-link">Contact</a>
          </div>
        </div>
      </footer>

      {/* AUTH MODAL */}
      {authOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthOpen(false)}
          onSwitchMode={setAuthMode}
          onSuccess={(username) => {
            login(username);
            setAuthOpen(false);
          }}
        />
      )}

      {/* CREATE POST MODAL */}
      {createOpen && (
        <CreatePostModal
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

function PostCard({
  id,
  title,
  meta,
  votes,
  tag,
  commentCount = 0,
  preview = "",
  author = "",
  createdAt = 0
}) {
  const timeText = createdAt ? timeAgo(createdAt) : meta;

  return (
    <div className="post" role="article">
      <a href={`#/post/${id}`} className="post-link" aria-label="Open post" />

      {/* If you still want votes on the far left, keep this. Otherwise delete this whole block */}
      <div className="votes">
        <button className="vote-btn upvote" type="button">▲</button>
        <div className="vote-count">{votes}</div>
        <button className="vote-btn downvote" type="button">▼</button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="post-main">
        {/* LEFT */}
        <div className="post-left">
          <div className="post-title">{title}</div>

          {preview && <div className="post-preview">{preview}</div>}

          <div className="post-subline">
            <span className="post-author">by {author || "user"}</span>
            <span className="dot">•</span>
            <span className="post-time">{timeText || "just now"}</span>
          </div>

          <div className="post-comments">
            💬 <span className="post-comments-count">{commentCount}</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="post-right">
          <button
            className="post-more"
            type="button"
            aria-label="Post options"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              alert("Options: Report / Save / Hide (later)");
            }}
          >
            ⋯
          </button>

          {tag && <div className="post-tag post-tag--corner">{tag}</div>}
        </div>
      </div>
    </div>
  );
}



function PostDetail({ post, isLoggedIn, session, openLogin, onUpdatePostCommentCount }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!post) return;
    setComments(loadComments(post.id));
  }, [post?.id]);

  if (!post) {
    return (
      <div className="post-detail">
        <a className="btn btn-secondary" href="#/">← Back</a>
        <div className="detail-card">
          <h2 className="detail-title">Post not found</h2>
          <div className="detail-muted">This post may have been deleted.</div>
        </div>
      </div>
    );
  }

  function submitComment(e) {
    e.preventDefault();
    if (!isLoggedIn) {
      openLogin();
      return;
    }

    const body = text.trim();
    if (body.length < 2) return;

    const now = Date.now();
    const newComment = {
      id: `c_${now}`,
      postId: post.id,
      author: session.username,
      body,
      createdAt: now,
    };

    const next = addComment(post.id, newComment);
    setComments(next);
    setText("");

    onUpdatePostCommentCount(post.id, next.length);
  }

  return (
    <div className="post-detail">
      <a className="btn btn-secondary" href="#/">← Back</a>

      <div className="detail-card">
        <h2 className="detail-title">{post.title}</h2>
        <div className="detail-meta">
          by <strong>{post.author}</strong> · {timeAgo(post.createdAt)}
          <span className="detail-tag">{post.tag}</span>
          <span className="detail-tag">{comments.length} comments</span>
        </div>
        <div className="detail-body">{post.body}</div>
      </div>

      <div className="detail-card">
        <h3 className="detail-subtitle">Comments</h3>

        <form className="comment-form" onSubmit={submitComment}>
          <input
            className="comment-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isLoggedIn ? "Write a comment…" : "Log in to comment…"}
            disabled={!isLoggedIn}
          />
          <button className="btn btn-primary" type="submit" disabled={!isLoggedIn}>
            Comment
          </button>
        </form>

        <div className="comment-list">
          {comments.length === 0 ? (
            <div className="detail-muted">Be the first to comment.</div>
          ) : (
            comments.map((c) => (
              <div className="comment" key={c.id}>
                <div className="comment-meta">
                  <strong>{c.author}</strong> · {timeAgo(c.createdAt)}
                </div>
                <div className="comment-body">{c.body}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

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

function getRoute() {
  const h = window.location.hash || "#/";
  return h;
}

function parsePostIdFromHash(hash) {
  const m = hash.match(/^#\/post\/(.+)$/);
  return m ? m[1] : null;
}
