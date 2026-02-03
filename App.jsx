import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthModal from "./components/AuthModal";
import CreatePostModal from "./components/CreatePostModal";
import { addPost, deletePost, loadPosts } from "./lib/postsStorage";
import { addComment, loadComments } from "./lib/commentsStorage";
import Profile from "./components/Profile";


export default function App() {
  /* ===== App boot ===== */
  const [appReady, setAppReady] = useState(false);

  /* ===== Feed sorting (UI only) ===== */
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("Best");
  const sortItems = useMemo(() => ["Best", "Hot", "Top", "New"], []);

  function chooseSort(item) {
    setSortBy(item);
    setSortOpen(false);
  }

  /* ===== Auth state ===== */
  const { session, isLoggedIn, login, logout } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login | signup
  const [toast, setToast] = useState("");

  function openLogin() {
    setAuthMode("login");
    setAuthOpen(true);
  }
  function openSignup() {
    setAuthMode("signup");
    setAuthOpen(true);
  }

  /* ===== Routing + posts ===== */
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
    const start = performance.now();

    const loaded = loadPosts();
    setPosts(loaded);

    const minMs = 600;
    const elapsed = performance.now() - start;
    const delay = Math.max(0, minMs - elapsed);

    const t = setTimeout(() => setAppReady(true), delay);
    return () => clearTimeout(t);
  }, []);


  /* ===== Create post modal ===== */
  const [createOpen, setCreateOpen] = useState(false);

  function openCreatePost() {
    if (!isLoggedIn) {
      setToast("You need to log in before creating a post.");
      openLogin();
      return;
    }
    setCreateOpen(true);
  }

  function handleCreate({ title, tag, body, images }) {
    const now = Date.now();
    const newPost = {
    id: `p_${now}`,
    title,
    body,
    authorId: session.id, 
    votes: 0,
    commentCount: 0,
    };

    const next = addPost(newPost);
    setPosts(next);
    setCreateOpen(false);
  }

  /* Lock background scroll when any modal is open */
  useEffect(() => {
    const anyOpen = authOpen || createOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [authOpen, createOpen]);

  /* ===== Render ===== */
  return (
    <div className={"app " + (appReady ? "app-ready" : "app-loading")}>
      {!appReady && (
        <div className="splash" role="status" aria-label="Loading">
          <div className="splash-card">
            <div className="splash-logo" aria-hidden="true" />
            <div className="splash-title">
              Pinoy<span className="splash-flex">Flex</span>
            </div>
            <div className="splash-spinner" aria-hidden="true" />
          </div>
        </div>
      )}
      {/* ===== Header ===== */}
      <header className="brandbar">
        <div className="brandbar-inner">
          <div className="brand-logo" aria-hidden="true" />
          <div className="brand-text">
            Pinoy<span className="brand-flex">Flex</span>
          </div>
        </div>
      </header>

      {/* ===== Navigation ===== */}
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
                <a className="session-pill" href="#/profile">
                  @{session.username}
                </a>
                <button className="btn btn-logout" type="button" onClick={logout}>
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===== Page layout ===== */}
      <div className="shell">
        <div className="layout">
          {/* ===== Left rail ===== */}
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

          {/* ===== Main feed ===== */}
          <main className="feed">
              {route === "#/profile" ? (
                <Profile />
              ) : activePostId ? (
              <PostDetail
                post={activePost}
                isLoggedIn={isLoggedIn}
                session={session}
                openLogin={openLogin}
                onDeletePost={(postId) => {
                  const next = deletePost(postId);
                  setPosts(next);
                  window.location.hash = "#/";
                }}
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
                    images={p.images || []}
                  />
                  ))
                )}
              </>
            )}
          </main>

          {/* ===== Right rail ===== */}
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

      {/* ===== Footer ===== */}
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

      {/* ===== Auth modal ===== */}
      {toast && (
        <div className="toast" role="status" onAnimationEnd={() => setToast("")}>
          {toast}
        </div>
      )}
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

      {/* ===== Create post modal ===== */}
      {createOpen && (
        <CreatePostModal
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

/* =========================
   Post Card (feed preview)
========================= */
function PostCard({
  id,
  title,
  meta,
  votes,
  tag,
  commentCount = 0,
  preview = "",
  author = "",
  createdAt = 0,
  images = [],
}) {
  const timeText = createdAt ? timeAgo(createdAt) : meta;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuDir, setMenuDir] = useState("up");
  const menuRef = useRef(null);
  const moreBtnRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const t = requestAnimationFrame(() => {
      const btn = moreBtnRef.current;
      const menu = menuRef.current;
      if (!btn || !menu) return;
      const btnRect = btn.getBoundingClientRect();
      const menuHeight = menu.offsetHeight || 140;
      const spaceBelow = window.innerHeight - btnRect.bottom;
      const spaceAbove = btnRect.top;
      const nextDir = spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? "down" : "up";
      setMenuDir(nextDir);
    });
    return () => cancelAnimationFrame(t);
  }, [menuOpen]);

  return (
    <div className="post" role="article">
      <a href={`#/post/${id}`} className="post-link" aria-label="Open post" />

      <div className="votes">
        <button className="vote-btn upvote" type="button">▲</button>
        <div className="vote-count">{votes}</div>
        <button className="vote-btn downvote" type="button">▼</button>
      </div>

      <div className="post-main">
        <div className="post-left">
          {/* username + icon + time ABOVE title */}
          <div className="post-subline post-subline--top">
            <span className="userchip" aria-hidden="true" />
            <span className="post-author">{author || "user"}</span>
            <span className="dot">•</span>
            <span className="post-time">{timeText || "just now"}</span>
          </div>

          <div className="post-title">{title}</div>

          {preview && <div className="post-preview">{preview}</div>}

          {/* ✅ one-image-at-a-time carousel (NO media-strip wrapper) */}
          {images.length > 0 && <PostMedia images={images} />}

          {/* comment count stays where it was */}
          <div className="post-comments">
            💬 <span className="post-comments-count">{commentCount}</span>
          </div>
        </div>

        <div className="post-right">
                    <button
            className="post-more"
            type="button"
            aria-label="Post options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            ref={moreBtnRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            ⋯
          </button>
          <div
            className={"post-menu" + (menuOpen ? " show " : " ") + "open-" + menuDir}
            role="menu"
            ref={menuRef}
          >
            <button className="post-menu-item" type="button">
              Save
            </button>
            <button className="post-menu-item" type="button">
              Hide
            </button>
            <button className="post-menu-item" type="button">
              Report
            </button>
          </div>

          {tag && <div className="post-tag post-tag--corner">{tag}</div>}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Post media (feed carousel)
========================= */
function PostMedia({ images }) {
  const [idx, setIdx] = useState(0);
  const total = images.length;

  function prev(e) {
    e.preventDefault();
    e.stopPropagation();
    setIdx((v) => (v - 1 + total) % total);
  }

  function next(e) {
    e.preventDefault();
    e.stopPropagation();
    setIdx((v) => (v + 1) % total);
  }

  return (
    <div className="media-frame" aria-label="Post images">
      <img
        className="media-frame-img"
        src={images[idx]}
        alt={`Post image ${idx + 1} of ${total}`}
        loading="lazy"
      />

      {total > 1 && (
        <>
          <button className="media-nav media-prev" type="button" onClick={prev} aria-label="Previous image">
            ‹
          </button>
          <button className="media-nav media-next" type="button" onClick={next} aria-label="Next image">
            ›
          </button>

          <div className="media-dots" aria-label="Image position">
            {images.map((_, i) => (
              <span key={i} className={"media-dot" + (i === idx ? " is-active" : "")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================
   Post Detail (open post)
========================= */
function PostDetail({ post, isLoggedIn, session, openLogin, onDeletePost, onUpdatePostCommentCount }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [detailIdx, setDetailIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const images = post?.images || [];
  const detailTotal = images.length;
  const isOwner = isLoggedIn && session?.username === post.author;

  function handleDeletePost() {
    if (!isLoggedIn) {
      openLogin();
      return;
    }
    if (!isOwner) return;
    onDeletePost(post.id);
  }

  function detailPrev(e) {
    e.preventDefault();
    e.stopPropagation();
    if (detailTotal < 2) return;
    setDetailIdx((v) => (v - 1 + detailTotal) % detailTotal);
  }

  function detailNext(e) {
    e.preventDefault();
    e.stopPropagation();
    if (detailTotal < 2) return;
    setDetailIdx((v) => (v + 1) % detailTotal);
  }

  return (
    <div className="post-detail">
      <a className="btn btn-secondary" href="#/">← Back</a>

      <div className="detail-card">
        <div className="detail-head">
          <h2 className="detail-title">{post.title}</h2>
          <div className="detail-actions">
                        <button
              className="detail-more"
              type="button"
              aria-label="Post options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              ⋯
            </button>
            <div
              className={"detail-menu" + (menuOpen ? " show" : "")}
              role="menu"
            >
              <button className="detail-menu-item" type="button">
                Save
              </button>
              <button className="detail-menu-item" type="button">
                Hide
              </button>
              <button className="detail-menu-item" type="button">
                Report
              </button>
            </div>
          </div>
        </div>
        <div className="detail-meta">
          by <strong>{post.author}</strong> · {timeAgo(post.createdAt)}
          <span className="detail-tag">{post.tag}</span>
          <span className="detail-tag">{comments.length} comments</span>
        </div>
        {detailTotal > 0 && (
          <div className="detail-media">
            <div className="detail-media-frame" aria-label="Post images">
              <button
                className="detail-media-imgwrap"
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="Open image"
              >
                <img
                  className="detail-media-img"
                  key={images[detailIdx] || detailIdx}
                  src={images[detailIdx]}
                  alt={`Post image ${detailIdx + 1} of ${detailTotal}`}
                  loading="lazy"
                />
              </button>

              {detailTotal > 1 && (
                <>
                  <button className="detail-media-nav detail-prev" type="button" onClick={detailPrev} aria-label="Previous image">
                    ‹
                  </button>
                  <button className="detail-media-nav detail-next" type="button" onClick={detailNext} aria-label="Next image">
                    ›
                  </button>

                  <div className="detail-media-dots" aria-label="Image position">
                    {images.map((_, i) => (
                      <span key={i} className={"detail-media-dot" + (i === detailIdx ? " is-active" : "")} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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

      {lightboxOpen && (
        <div className="lightbox" role="dialog" aria-label="Image preview">
          <button className="lightbox-backdrop" type="button" onClick={() => setLightboxOpen(false)} aria-label="Close" />
          <div className="lightbox-body">
            <img
              className="lightbox-img"
              key={`lightbox-${images[detailIdx] || detailIdx}`}
              src={images[detailIdx]}
              alt={`Post image ${detailIdx + 1} of ${detailTotal}`}
            />
            {detailTotal > 1 && (
              <>
                <button className="lightbox-nav lightbox-prev" type="button" onClick={detailPrev} aria-label="Previous image">
                  ‹
                </button>
                <button className="lightbox-nav lightbox-next" type="button" onClick={detailNext} aria-label="Next image">
                  ›
                </button>
              </>
            )}
            <button className="lightbox-close" type="button" onClick={() => setLightboxOpen(false)} aria-label="Close">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   Helpers
========================= */
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













