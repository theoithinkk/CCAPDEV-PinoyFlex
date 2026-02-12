import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthModal from "./components/AuthModal";
import CreatePostModal from "./components/CreatePostModal";
import { addPost, deletePost, loadPosts, savePosts, seedPostsIfEmpty, voteOnPost } from "./lib/postsStorage";
import { addComment, deleteComment, deleteCommentsForPost, loadComments, seedCommentsIfEmpty } from "./lib/commentsStorage";
import { loadUserWorkoutLogs, upsertUserWorkoutLog } from "./lib/workoutLogStorage";
import Profile from "./components/Profile";
import Explore from "./components/Explore";
import Trending from "./components/Trending";
import logoLight from "./assets/logo/lightmode.png";
import logoDark from "./assets/logo/darkmode.png";
import EditPostModal from "./components/EditPostModal";
import EditProfileModal from "./components/EditProfileModal";
import { updatePost } from "./lib/postsStorage";
import { updateComment } from "./lib/commentsStorage";
import { getUserByUsername } from "./lib/authStorage";

const tagColorCache = new Map();
const FEATURED_NEWS_ROUTE = "#/news/periodized-upper-lower-brief";
const FEATURED_NEWS_POST = {
  id: "news_featured_2026_01",
  title: "Push Pull Legs no longer default for intermediates? New 12-week trial says periodized upper/lower may edge ahead",
  author: "PinoyFlex Editorial",
  createdAt: new Date("2026-01-25T09:00:00+08:00").getTime(),
  tag: "Research Brief",
  votes: 184,
  body:
    "A controlled 12-week intervention tracked 96 intermediate lifters across two commonly used split models: a classic push/pull/legs routine and a periodized upper/lower schedule.\n\nThe researchers reported that both groups improved lean mass, but the periodized upper/lower group showed stronger average hypertrophy markers in the quads and upper back while maintaining similar strength progression. Weekly fatigue scores were also slightly lower in the periodized group.\n\nThe authors note that this does not make PPL obsolete. Their conclusion focuses on workload management and progression quality for intermediates with limited recovery bandwidth.\n\nPractical takeaway: if progression has stalled on a static split, a periodized upper/lower setup may offer a better stimulus-to-fatigue ratio without increasing training days.",
};
const FEATURED_NEWS_REFERENCE =
  "M. Reyes, J. Dela Cruz, T. Navarro (2026). Split Strategy and Hypertrophy Outcomes in Intermediate Lifters. Journal of Applied Strength Science, 14(2), 77-91.";

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
  else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
  else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
  else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
  else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// Design wise I suggest we use static colors for tags
function getTagStyle(tag) {
  if (!tag) return undefined;
  if (!tagColorCache.has(tag)) {
    const hue = Math.floor(Math.random() * 360);
    const sat = 0.7 + Math.random() * 0.2;
    const light = 0.42 + Math.random() * 0.28;
    const { r, g, b } = hslToRgb(hue, sat, light);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const text = luminance < 0.55 ? "#fff" : "#111";
    const bg = `rgb(${r}, ${g}, ${b})`;
    tagColorCache.set(tag, { backgroundColor: bg, color: text });
  }
  return tagColorCache.get(tag);
}


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

  /* ===== Edit States (Post & Profile) ===== */
  const [editPostData, setEditPostData] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [viewingUser, setViewingUser] = useState(null); // For #/user/:username
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  function openLogin() {
    setAuthMode("login");
    setAuthOpen(true);
  }
  function openSignup() {
    setAuthMode("signup");
    setAuthOpen(true);
  }

  /* ===== Badge verification (static demo) ===== */
  const badgeOptions = useMemo(
    () => ["225 lb Bench", "315 lb Squat", "405 lb Deadlift", "10 Strict Pullups"],
    []
  );
  const [selectedBadge, setSelectedBadge] = useState("225 lb Bench");

  /* ===== Personal workout logs ===== */
  const [logDate, setLogDate] = useState(() => formatDateKey(Date.now()));
  const [logText, setLogText] = useState("");
  const [logError, setLogError] = useState("");
  const [workoutLogs, setWorkoutLogs] = useState({});
  const logUserKey = session?.id || session?.username || "guest";

  /* ===== Search UI (static suggestions) ===== */
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchWrapRef = useRef(null);
  const recentSearches = useMemo(
    () => ["Body recomposition", "Meal prep on a budget", "5x5 program", "Calisthenics PH"],
    []
  );
  const trendingTopics = useMemo(
    () => ["#BalikGym", "#DirtyBulk", "#UpperLower", "#HomeWorkout", "#CutSeason"],
    []
  );

  const normalizedQuery = searchValue.trim().toLowerCase();
  const filteredRecent = normalizedQuery
    ? recentSearches.filter((item) => item.toLowerCase().includes(normalizedQuery))
    : recentSearches;
  const filteredTrending = normalizedQuery
    ? trendingTopics.filter((item) => item.toLowerCase().includes(normalizedQuery))
    : trendingTopics;

  useEffect(() => {
    if (!searchOpen) return;
    function handleDocClick(event) {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [searchOpen]);

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

  // -- Parse Route Params --
  const activePostId = parsePostIdFromHash(route);
  const activePost = activePostId ? posts.find((p) => p.id === activePostId) : null;
  
  const searchQuery = route.startsWith("#/search") 
    ? new URLSearchParams(route.split("?")[1]).get("q") || "" 
    : "";
    
  const userProfileTarget = route.startsWith("#/user/") 
    ? route.split("/user/")[1] 
    : null;

  // -- Data Loading --
  useEffect(() => {
    const now = typeof performance !== "undefined" && performance.now ? () => performance.now() : () => Date.now();
    const start = now();

    let loaded = [];
    try {
      seedPostsIfEmpty();
      seedCommentsIfEmpty();
      loaded = loadPosts();
    } catch {
      loaded = [];
    }
    setPosts(loaded);

    const minMs = 600;
    const elapsed = now() - start;
    const delay = Math.max(0, minMs - elapsed);

    const t = setTimeout(() => setAppReady(true), delay);
    return () => clearTimeout(t);
  }, []);

  // -- Load User Profile Data --
  useEffect(() => {
    if (userProfileTarget) {
      const u = getUserByUsername(userProfileTarget);
      setViewingUser(u);
    }
  }, [userProfileTarget, posts]);

  useEffect(() => {
    if (!isLoggedIn) {
      setWorkoutLogs({});
      return;
    }
    setWorkoutLogs(loadUserWorkoutLogs(logUserKey));
  }, [isLoggedIn, logUserKey]);


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
      title: title.trim(),
      tag,
      body: body.trim(),
      author: session?.username || "user",
      authorId: session?.id || null,
      createdAt: now,
      votes: 0,
      voteByUser: {},
      images,
      commentCount: 0,
    };

    const next = addPost(newPost);
    setPosts(next);
    setCreateOpen(false);
  }

  /* ===== Editing Handlers ===== */
  function handleEditPost(post) {
    setEditPostData(post);
  }

  function saveEditedPost(postId, updates) {
    const next = updatePost(postId, updates);
    setPosts(next);
    setEditPostData(null);
  }

  function updatePostCommentCount(postId, count) {
    setPosts((prev) => {
      const next = prev.map((p) => (p.id === postId ? { ...p, commentCount: count } : p));
      savePosts(next);
      return next;
    });
  }

  function handleVote(postId, direction) {
    if (!isLoggedIn) {
      setToast("You need to log in before voting.");
      openLogin();
      return;
    }
    const next = voteOnPost(postId, session?.username, direction);
    setPosts(next);
  }

  function saveWorkoutLogEntry(dateKey, text) {
    if (!isLoggedIn) {
      setToast("You need to log in before saving a workout log.");
      openLogin();
      return false;
    }

    const cleaned = (text || "").trim();
    if (!dateKey || cleaned.length < 1 || cleaned.length > 30) return false;

    const next = upsertUserWorkoutLog(logUserKey, dateKey, cleaned);
    setWorkoutLogs(next);
    return true;
  }

  function handleQuickLogSave() {
    setLogError("");
    const cleaned = logText.trim();

    if (!cleaned) {
      setLogError("Please add a short workout note.");
      return;
    }
    if (cleaned.length > 30) {
      setLogError("Workout note must be at most 30 characters.");
      return;
    }

    const ok = saveWorkoutLogEntry(logDate, cleaned);
    if (!ok) return;
    setLogText("");
    setToast("Workout log saved.");
  }

  function openReportModal(target) {
    setReportTarget(target || null);
    setReportOpen(true);
  }

  function submitReport() {
    setReportOpen(false);
    setReportTarget(null);
    setToast("Report submitted.");
  }

  const recentLogEntries = useMemo(
    () =>
      Object.entries(workoutLogs)
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .slice(0, 3),
    [workoutLogs]
  );

  /* Lock background scroll when any modal is open */
  useEffect(() => {
    const anyOpen = authOpen || createOpen || editPostData || isEditingProfile || reportOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [authOpen, createOpen, editPostData, isEditingProfile, reportOpen]);

/* ===== Render ===== */
  return (
    <div className={"app " + (appReady ? "app-ready" : "app-loading")}>
      {!appReady && (
        <div className="splash" role="status" aria-label="Loading">
          <div className="splash-card">
            {/* Logo Section */}
            <div className="splash-logo" style={{ width: '100px', height: '100px' }}>
              <img 
                src={logoLight} 
                alt="PinoyFlex" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            </div>
            
            {/* Title */}
            <div className="splash-title">
              Pinoy<span className="splash-flex">Flex</span>
            </div>
            
            {/* Spinner */}
            <div className="splash-spinner" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* ===== Header ===== */}
      <header className="brandbar">
        <div className="brandbar-inner">
          <div className="brand-logo">
            <img src={logoDark} alt="PinoyFlex" />
          </div>
          <div className="brand-text">
            Pinoy<span className="brand-flex">Flex</span>
          </div>
        </div>
      </header>

      {/* ===== Navigation ===== */}
      <header className="navstrip">
        <div className="navstrip-inner">
          <nav className="navlinks" aria-label="Primary">
            <a className={"navlink" + (route === "#/" ? " is-active" : "")} href="#/">
              Home
            </a>
            <a className={"navlink" + (route.startsWith("#/explore") ? " is-active" : "")} href="#/explore">
              Explore
            </a>
            <a className={"navlink" + (route.startsWith("#/trending") ? " is-active" : "")} href="#/trending">
              Trending
            </a>
          </nav>

          <div className="nav-center">
            <div className="nav-search-wrap" ref={searchWrapRef}>
              <input
                type="text"
                className="nav-search"
                placeholder="Search PinoyFlex"
                aria-label="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                     setSearchOpen(false);
                     window.location.hash = `#/search?q=${encodeURIComponent(searchValue)}`;
                  }
                  if (e.key === "Escape") setSearchOpen(false);
                }}
              />
              <div
                className={"nav-search-panel" + (searchOpen ? " show" : "")}
                role="listbox"
                aria-label="Search suggestions"
              >
                <div className="search-section">
                  <div className="search-section-title">Trending topics</div>
                  {filteredTrending.length === 0 ? (
                    <div className="search-empty">No matches yet.</div>
                  ) : (
                    filteredTrending.map((item) => (
                      <button
                        key={item}
                        className="search-item"
                        type="button"
                        onClick={() => {
                          setSearchValue(item);
                          setSearchOpen(false);
                          window.location.hash = `#/search?q=${encodeURIComponent(item)}`;
                        }}
                      >
                        <span className="search-item-icon">#</span>
                        <span className="search-item-text">{item.replace(/^#/, "")}</span>
                      </button>
                    ))
                  )}
                </div>

                <div className="search-section">
                  <div className="search-section-title">Recent searches</div>
                  {filteredRecent.length === 0 ? (
                    <div className="search-empty">No recent matches.</div>
                  ) : (
                    filteredRecent.map((item) => (
                      <button
                        key={item}
                        className="search-item"
                        type="button"
                        onClick={() => {
                          setSearchValue(item);
                          setSearchOpen(false);
                          window.location.hash = `#/search?q=${encodeURIComponent(item)}`;
                        }}
                      >
                        <span className="search-item-icon">R</span>
                        <span className="search-item-text">{item}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
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
              <div className="news-priority">2/11/2026</div>
              <a className="news-forum-link" href={FEATURED_NEWS_ROUTE}>
                <div className="news-forum-head">
                  <span className="news-forum-pill">Forum Brief</span>
                  <span className="news-forum-meta">@pinoyflex_editorial | 2d ago</span>
                </div>
                <div className="news-link">
                  Push Pull Legs Vaulted?
                </div>
                <p className="news-summary">
                  A 12-week controlled trial found stronger average growth outcomes from a periodized upper/lower split than a standard PPL setup in intermediate lifters.
                  <span className="news-readmore"> Read more...</span>
                </p>
                <div className="news-citation">
                  Reference: Journal of Applied Strength Science, Vol. 14(2), pp. 77-91.
                </div>
                <div className="news-cta">Open full breakdown</div>
              </a>
            </div>

            <div className="block block-categories">
              <h3>Popular Categories</h3>
              <p className="categories-subtext">Jump into focused discussions.</p>
              <a href="#/explore?cat=Form" className="category-link">
                <span className="category-link-title">Form / Technique</span>
                <span className="category-link-meta">Form checks and lifting cues</span>
              </a>
              <a href="#/explore?cat=Meal%20Prep" className="category-link">
                <span className="category-link-title">Meal Prep</span>
                <span className="category-link-meta">Budget meals and macros</span>
              </a>
              <a href="#/explore?cat=Physique" className="category-link">
                <span className="category-link-title">Physique</span>
                <span className="category-link-meta">Recomp and progress tracking</span>
              </a>
              <a href="#/explore?cat=Beginners" className="category-link">
                <span className="category-link-title">Beginners Guide</span>
                <span className="category-link-meta">Start here and avoid mistakes</span>
              </a>
              <a href="#/explore?cat=General" className="category-link">
                <span className="category-link-title">General Discussion</span>
                <span className="category-link-meta">Any fitness topic</span>
              </a>
              <a href="#/explore?cat=Success" className="category-link">
                <span className="category-link-title">Success Stories</span>
                <span className="category-link-meta">PRs, milestones, and wins</span>
              </a>
            </div>  
          </aside>

          {/* ===== Main feed ===== */}
          <main className="feed">
              {route === "#/verify" ? (
                <div className="verify-page">
                  <div className="verify-card">
                    <div className="verify-header">
                      <div className="verify-header-main">
                        <div className="verify-kicker">Athlete Verification</div>
                        <h2 className="verify-title">Apply for a Verified Badge</h2>
                        <div className="verify-muted">
                          Submit one clean lift video and get milestone badges added to your profile.
                        </div>
                        <div className="verify-steps" aria-label="How verification works">
                          <span className="verify-step">1. Pick badge</span>
                          <span className="verify-step">2. Upload lift video</span>
                          <span className="verify-step">3. Wait for review</span>
                        </div>
                      </div>
                      <a className="btn btn-secondary" href="#/">
                        Back to Feed
                      </a>
                    </div>

                    <div className="verify-section">
                      <div className="verify-label">Pick a badge to verify</div>
                      <div className="verify-badges" role="listbox" aria-label="Badge options">
                        {badgeOptions.map((badge) => (
                          <button
                            key={badge}
                            className={"verify-badge" + (selectedBadge === badge ? " is-selected" : "")}
                            type="button"
                            onClick={() => setSelectedBadge(badge)}
                            role="option"
                            aria-selected={selectedBadge === badge}
                          >
                            {badge}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="verify-section">
                      <label className="verify-field">
                        <span className="verify-label">Upload your lift video</span>
                        <span className="verify-help">Use a clear side angle and show full lockout.</span>
                        <input className="verify-input" type="file" accept="video/*" />
                      </label>
                      <label className="verify-field">
                        <span className="verify-label">Notes (optional)</span>
                        <textarea
                          className="verify-textarea"
                          rows="4"
                          placeholder="Add equipment used, gym setup, and any useful context for reviewers."
                        />
                      </label>
                    </div>

                    <div className="verify-actions">
                      <button className="btn btn-primary" type="button">
                        Submit for Review
                      </button>
                      <div className="verify-hint">
                         Your submission will be reviewed within 3-5 days.
                      </div>
                    </div>
                    <div className="verify-trust-row" aria-label="Verification standards">
                      <span className="verify-trust-pill">Manual review</span>
                      <span className="verify-trust-pill">No hidden fees</span>
                      <span className="verify-trust-pill">Profile badge unlock</span>
                    </div>
                  </div>
                </div>
              ) : route.startsWith("#/news") ? (
                <NewsDetailPost news={FEATURED_NEWS_POST} reference={FEATURED_NEWS_REFERENCE} />
              ) : route === "#/log-calendar" ? (
                <WorkoutLogCalendar
                  logs={workoutLogs}
                  isLoggedIn={isLoggedIn}
                  onRequireLogin={() => {
                    setToast("You need to log in before saving a workout log.");
                    openLogin();
                  }}
                  onSaveEntry={(dateKey, text) => {
                    const ok = saveWorkoutLogEntry(dateKey, text);
                    if (ok) setToast("Workout log saved.");
                    return ok;
                  }}
                />
              ) : route.startsWith("#/search") ? (
                // === SEARCH RESULTS ===
                <div className="feed-header">
                    <h2>Search Results: "{searchQuery}"</h2>
                    {posts.filter(p => 
                        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.body.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 ? (
                        <p className="detail-muted">No matches found.</p>
                    ) : (
                        posts.filter(p => 
                            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.body.toLowerCase().includes(searchQuery.toLowerCase())
                        ).map(p => (
                            <PostCard
                                key={p.id}
                                {...p}
                                userVote={p.voteByUser?.[session?.username] || 0}
                                onVote={handleVote}
                                onReport={(target) => openReportModal(target)}
                            />
                        ))
                    )}
                </div>
              ) : route.startsWith("#/user/") ? (
                // === VIEW USER PROFILE ===
                <Profile 
                    user={viewingUser} 
                    isCurrentUser={session?.username === viewingUser?.username}
                    onEdit={() => setIsEditingProfile(true)}
                />
              ) : route === "#/profile" ? (
                // === MY PROFILE ===
                <Profile 
                    user={session} 
                    isCurrentUser={true}
                    onEdit={() => setIsEditingProfile(true)}
                />
              ) : route.startsWith("#/explore") ? (
                <Explore />
              ) : route === "#/trending" ? (
                <Trending />
              ) : activePostId ? (
              <PostDetail
                post={activePost}
                isLoggedIn={isLoggedIn}
                session={session}
                openLogin={openLogin}
                onVotePost={handleVote}
                onReportPost={(target) => openReportModal(target)}
                currentUserVote={activePost?.voteByUser?.[session?.username] || 0}
                onEditPost={() => handleEditPost(activePost)}
                onDeletePost={(postId) => {
                  const next = deletePost(postId);
                  setPosts(next);
                  window.location.hash = "#/";
                }}
                onUpdatePostCommentCount={updatePostCommentCount}
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

                {posts.length === 0 ? (
                  <div className="detail-muted">No posts yet.</div>
                ) : (
                  posts.map((p) => (
                  <PostCard
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    author={p.author}
                    createdAt={p.createdAt}
                    preview={(p.body || "").slice(0, 120) + ((p.body || "").length > 120 ? "…" : "")}
                    votes={p.votes || 0}
                    userVote={p.voteByUser?.[session?.username] || 0}
                    tag={p.tag}
                    commentCount={p.commentCount || 0}
                    images={p.images || []}
                    onVote={handleVote}
                    onReport={(target) => openReportModal(target)}
                  />
                  ))
                )}
              </>
            )}
          </main>

          <aside className="panel panel-right">
            <div className="block block-verify">
              <div className="verify-kicker">Verification Program</div>
              <h3>Apply for a Verified Badge</h3>
              <p className="verify-copy">
                Submit a lift video and unlock profile badges for milestone lifts.
              </p>
              <div className="verify-pill-row" aria-label="Popular badge targets">
                <span className="verify-pill">225 Bench</span>
                <span className="verify-pill">315 Squat</span>
                <span className="verify-pill">405 Deadlift</span>
              </div>
              <div className="verify-stats">
                <div className="verify-stat">
                  <strong>3-5 days</strong>
                  <span>Review time</span>
                </div>
                <div className="verify-stat">
                  <strong>Video proof</strong>
                  <span>Simple process</span>
                </div>
              </div>
              <a className="btn btn-primary verify-cta" href="#/verify">
                Start Verification
              </a>
            </div>

            <div className="block block-worklog">
              <h3>Daily Workout Log</h3>
              <p className="worklog-copy">Save one short note per day (max 30 chars).</p>

              <label className="worklog-field">
                <span>Date</span>
                <input
                  className="worklog-input"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </label>

              <label className="worklog-field">
                <span>What did you do?</span>
                <input
                  className="worklog-input"
                  type="text"
                  maxLength={30}
                  value={logText}
                  onChange={(e) => setLogText(e.target.value)}
                  placeholder="Upper day, 5x5 squats, etc."
                />
              </label>
              <div className="worklog-count">{logText.length}/30</div>

              {logError && <div className="form-error">{logError}</div>}

              <div className="worklog-actions">
                <button className="btn btn-primary" type="button" onClick={handleQuickLogSave}>
                  Save Log
                </button>
                <a className="btn btn-primary" href="#/log-calendar">
                  View Calendar
                </a>
              </div>

              <div className="worklog-recent">
                <div className="worklog-recent-title">Recent logs</div>
                {recentLogEntries.length === 0 ? (
                  <div className="worklog-empty">No logs yet.</div>
                ) : (
                  recentLogEntries.map(([dateKey, entry]) => (
                    <div key={dateKey} className="worklog-item">
                      <span className="worklog-item-date">{dateKey}</span>
                      <span className="worklog-item-text">{entry}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

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

      {createOpen && (
        <CreatePostModal
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
      )}
      
      {editPostData && (
        <EditPostModal 
          post={editPostData} 
          onClose={() => setEditPostData(null)} 
          onSave={saveEditedPost} 
        />
      )}

      {isEditingProfile && session && (
        <EditProfileModal
          user={session}
          onClose={() => setIsEditingProfile(false)}
          onSuccess={(updates) => {
             window.location.reload(); 
          }}
        />
      )}

      {reportOpen && (
        <ReportModal
          target={reportTarget}
          onClose={() => setReportOpen(false)}
          onSubmit={submitReport}
        />
      )}
    </div>
  );
}

function ReportModal({ target, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const targetText = target?.title ? `Post: ${target.title}` : "this content";

  function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please add a short report reason.");
      return;
    }
    onSubmit?.({ target, reason: reason.trim() });
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal modal-report" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">Report Content</h2>
          <button className="modal-x" type="button" onClick={onClose} aria-label="Close">
            X
          </button>
        </div>

        <div className="report-target">{targetText}</div>
        <p className="report-help">Tell us what is wrong.</p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <textarea
            className="field-textarea report-textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Example: Spam, harassment, misleading info..."
            rows={5}
          />
          {error && <div className="form-error">{error}</div>}
          <div className="modal-confirm-actions">
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit">
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewsDetailPost({ news, reference }) {
  return (
    <div className="post-detail">
      <a className="btn btn-secondary" href="#/">
        Back
      </a>

      <div className="detail-card news-detail-card">
        <div className="detail-head">
          <h2 className="detail-title">{news.title}</h2>
          <span className="detail-tag">{news.tag}</span>
        </div>

        <div className="detail-meta">
          by <strong>{news.author}</strong> · {timeAgo(news.createdAt)}
          <span className="detail-tag">{news.votes} upvotes</span>
          <span className="detail-tag">Research Digest</span>
        </div>

        <div className="detail-body">{news.body}</div>

        <div className="news-detail-section">
          <h3 className="detail-subtitle">Key points</h3>
          <ul className="news-detail-points">
            <li>Hypertrophy results were slightly stronger in the periodized upper/lower group.</li>
            <li>Strength gains were similar across both split models by week 12.</li>
            <li>Participants on periodized programming reported lower average fatigue.</li>
            <li>Authors recommend split choice based on recoverability and progression quality.</li>
          </ul>
        </div>

        <div className="news-detail-reference">
          <strong>Reference (mock): </strong>
          {reference}
        </div>
      </div>
    </div>
  );
}

function WorkoutLogCalendar({ logs, isLoggedIn, onRequireLogin, onSaveEntry }) {
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(Date.now()));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(logs[selectedDate] || "");
    setError("");
  }, [selectedDate, logs]);

  const cells = useMemo(() => buildCalendarCells(monthStart), [monthStart]);
  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayKey = formatDateKey(Date.now());

  function handleSave() {
    setError("");
    const cleaned = draft.trim();

    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    if (!cleaned) {
      setError("Please add a short workout note.");
      return;
    }
    if (cleaned.length > 30) {
      setError("Workout note must be at most 30 characters.");
      return;
    }

    const ok = onSaveEntry?.(selectedDate, cleaned);
    if (!ok) {
      setError("Unable to save this entry.");
    }
  }

  return (
    <div className="worklog-page">
      <div className="worklog-page-header">
        <h2 className="worklog-page-title">Workout Log Calendar</h2>
        <a className="btn btn-secondary" href="#/">
          Back to Feed
        </a>
      </div>

      <div className="worklog-calendar-card">
        <div className="worklog-calendar-top">
          <button
            className="worklog-month-nav"
            type="button"
            aria-label="Previous month"
            onClick={() => setMonthStart((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          >
            ‹
          </button>
          <div className="worklog-month-label">{monthLabel}</div>
          <button
            className="worklog-month-nav"
            type="button"
            aria-label="Next month"
            onClick={() => setMonthStart((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          >
            ›
          </button>
        </div>

        <div className="worklog-weekdays">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        <div className="worklog-grid">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={`blank-${idx}`} className="worklog-day worklog-day-blank" />;
            const isSelected = cell.dateKey === selectedDate;
            const isToday = cell.dateKey === todayKey;
            const hasEntry = Boolean(logs[cell.dateKey]);

            return (
              <button
                key={cell.dateKey}
                type="button"
                className={
                  "worklog-day" +
                  (isSelected ? " is-selected" : "") +
                  (isToday ? " is-today" : "") +
                  (hasEntry ? " has-entry" : "")
                }
                onClick={() => setSelectedDate(cell.dateKey)}
                title={logs[cell.dateKey] || "No entry"}
              >
                <span className="worklog-day-num">{cell.day}</span>
                {hasEntry && <span className="worklog-day-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="worklog-editor-card">
        <div className="worklog-editor-head">
          <h3>Entry for {selectedDate}</h3>
          {logs[selectedDate] && <span className="detail-tag">Saved</span>}
        </div>
        <input
          className="worklog-input"
          type="text"
          maxLength={30}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Upper day, deadlift focus, etc."
        />
        <div className="worklog-count">{draft.length}/30</div>
        {error && <div className="form-error">{error}</div>}
        <div className="worklog-editor-actions">
          <button className="btn btn-primary" type="button" onClick={handleSave}>
            Save Entry
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({
  id,
  title,
  meta,
  votes,
  userVote = 0,
  tag,
  commentCount = 0,
  preview = "",
  author = "",
  createdAt = 0,
  images = [],
  onVote,
  onReport,
}) {
  const timeText = createdAt ? timeAgo(createdAt) : meta;
  const postHref = `#/post/${id}`;
  const authorAvatar = getUserByUsername(author)?.avatar || "/avatars/default.png";
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

  function openPost() {
    window.location.hash = postHref;
  }

  function handlePostKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPost();
    }
  }

  return (
    <div
      className="post"
      role="article"
      tabIndex={0}
      aria-label={`Open post: ${title}`}
      onClick={openPost}
      onKeyDown={handlePostKeyDown}
    >

      <div className="votes">
        <button
          className={"vote-btn upvote" + (userVote === 1 ? " is-active" : "")}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onVote?.(id, 1);
          }}
        >
          ↑
        </button>
        <div className="vote-count">{votes}</div>
        <button
          className={"vote-btn downvote" + (userVote === -1 ? " is-active" : "")}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onVote?.(id, -1);
          }}
        >
          ↓
        </button>
      </div>

      <div className="post-main">
        <div className="post-left">
          <div className="post-subline post-subline--top">
            <img className="userchip" src={authorAvatar} alt={`${author || "user"} avatar`} loading="lazy" />
            <a href={`#/user/${author}`} onClick={e => e.stopPropagation()} className="post-author">{author || "user"}</a>
            <span className="dot">•</span>
            <span className="post-time">{timeText || "just now"}</span>
          </div>

          <div className="post-title">{title}</div>

          {preview && <div className="post-preview">{preview}</div>}

          {images.length > 0 && <PostMedia images={images} />}

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
            <button
              className="post-menu-item"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              Save
            </button>
            <button
              className="post-menu-item"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              Hide
            </button>
            <button
              className="post-menu-item"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                onReport?.({ type: "post", id, title });
              }}
            >
              Report
            </button>
          </div>

          {tag && (
            <div className="post-tag post-tag--corner" style={getTagStyle(tag)}>
              {tag}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


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


function PostDetail({
  post,
  isLoggedIn,
  session,
  openLogin,
  onDeletePost,
  onUpdatePostCommentCount,
  onVotePost,
  onReportPost,
  currentUserVote = 0,
  onEditPost 
}) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [detailIdx, setDetailIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  // Comment Editing State
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editBody, setEditBody] = useState("");

  useEffect(() => {
    if (!post) return;
    const loaded = loadComments(post.id);
    setComments(loaded);
  }, [post?.id]);

  if (!post) {
    return (
      <div className="post-detail">
        <a className="btn btn-secondary" href="#/" style={{marginBottom:'1rem', display:'inline-block'}}>← Back</a>
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
  
  function saveCommentEdit(cId) {
      const next = updateComment(post.id, cId, editBody);
      setComments(next);
      setEditingCommentId(null);
  }

  const images = post?.images || [];
  const detailTotal = images.length;
  const isOwner =
    isLoggedIn &&
    (session?.username === post.author || (session?.id && post.authorId && session.id === post.authorId));

  function handleDeletePost() {
    if (!isLoggedIn) { openLogin(); return; }
    if (!isOwner) return;
    setConfirmOpen(true);
  }

  function confirmDeletePost() {
    if (!isLoggedIn || !isOwner) return;
    deleteCommentsForPost(post.id);
    onDeletePost(post.id);
    setConfirmOpen(false);
  }

  function handleDeleteComment(commentId, commentAuthor) {
    if (!isLoggedIn) { openLogin(); return; }
    const canDelete = isOwner || session?.username === commentAuthor;
    if (!canDelete) return;
    const next = deleteComment(post.id, commentId);
    setComments(next);
    onUpdatePostCommentCount(post.id, next.length);
  }

  function detailPrev(e) {
    e.preventDefault(); e.stopPropagation();
    if (detailTotal < 2) return;
    setDetailIdx((v) => (v - 1 + detailTotal) % detailTotal);
  }
  function detailNext(e) {
    e.preventDefault(); e.stopPropagation();
    if (detailTotal < 2) return;
    setDetailIdx((v) => (v + 1) % detailTotal);
  }

  return (
    <div className="post-detail">
      <a className="btn btn-secondary" href="#/" style={{marginBottom:'1rem', display:'inline-block'}}>← Back</a>

      <div className="detail-card">
        <div className="detail-head">
          <h2 className="detail-title">{post.title}</h2>
          <div className="detail-actions">
            
            {/* === EDITED BUTTON HERE === */}
            {isOwner && (
              <button 
                className="btn-edit-action" 
                onClick={onEditPost}
              >
                Edit Post
              </button>
            )}

            <div style={{position: 'relative'}}>
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
                <div className={"detail-menu" + (menuOpen ? " show" : "")} role="menu">
                  <button className="detail-menu-item" type="button">Save</button>
                  <button className="detail-menu-item" type="button">Hide</button>
                  <button
                    className="detail-menu-item"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onReportPost?.({ type: "post", id: post.id, title: post.title });
                    }}
                  >
                    Report
                  </button>
                  {isOwner && (
                    <button className="detail-menu-item danger" type="button" onClick={() => { setMenuOpen(false); handleDeletePost(); }}>
                      Delete Post
                    </button>
                  )}
                </div>
            </div>
          </div>
        </div>

        <div className="detail-meta">
          by <a href={`#/user/${post.author}`}><strong>{post.author}</strong></a> · {timeAgo(post.createdAt)} {post.lastEdited && "(edited)"}
          <span className="detail-tag" style={getTagStyle(post.tag)}>{post.tag}</span>
          <span className="detail-tag">{comments.length} comments</span>
        </div>

        <div className="detail-votes">
          <button className={"vote-btn upvote" + (currentUserVote === 1 ? " is-active" : "")} type="button" onClick={() => onVotePost?.(post.id, 1)}>↑</button>
          <span className="vote-count">{post.votes || 0}</span>
          <button className={"vote-btn downvote" + (currentUserVote === -1 ? " is-active" : "")} type="button" onClick={() => onVotePost?.(post.id, -1)}>↓</button>
        </div>

        {detailTotal > 0 && (
          <div className="detail-media">
            <div className="detail-media-frame" aria-label="Post images">
              <button className="detail-media-imgwrap" type="button" onClick={() => setLightboxOpen(true)}>
                <img className="detail-media-img" key={images[detailIdx] || detailIdx} src={images[detailIdx]} alt="Post media" />
              </button>
              {detailTotal > 1 && (
                <>
                  <button className="detail-media-nav detail-prev" type="button" onClick={detailPrev}>‹</button>
                  <button className="detail-media-nav detail-next" type="button" onClick={detailNext}>›</button>
                  <div className="detail-media-dots">
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
          <input className="comment-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={isLoggedIn ? "Write a comment…" : "Log in to comment…"} disabled={!isLoggedIn} />
          <button className="btn btn-primary" type="submit" disabled={!isLoggedIn}>Comment</button>
        </form>

        <div className="comment-list">
          {comments.length === 0 ? (
            <div className="detail-muted">Be the first to comment.</div>
          ) : (
            comments.map((c) => (
              <div className="comment" key={c.id}>
                <div className="comment-head">
                  <div className="comment-meta">
                    <a href={`#/user/${c.author}`}><strong>{c.author}</strong></a> · {timeAgo(c.createdAt)} {c.lastEdited && <span style={{fontSize:'0.8em', opacity:0.7}}> (edited)</span>}
                  </div>
                  <div className="comment-actions">
                     {isLoggedIn && c.author === session?.username && (
                       <button className="comment-delete" style={{marginRight:'10px', color:'var(--text-secondary)'}} onClick={() => { setEditingCommentId(c.id); setEditBody(c.body); }}>
                         Edit
                       </button>
                     )}
                     {(isOwner || session?.username === c.author) && (
                      <button className="comment-delete" type="button" onClick={() => handleDeleteComment(c.id, c.author)}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {editingCommentId === c.id ? (
                    <div className="comment-edit-box" style={{marginTop:'5px'}}>
                        <textarea value={editBody} onChange={e => setEditBody(e.target.value)} className="field-textarea" style={{width: '100%', marginBottom: '5px'}}/>
                        <div style={{display:'flex', gap:'5px'}}>
                            <button className="btn btn-primary btn-sm" style={{padding:'4px 8px'}} onClick={() => saveCommentEdit(c.id)}>Save</button>
                            <button className="btn btn-secondary btn-sm" style={{padding:'4px 8px'}} onClick={() => setEditingCommentId(null)}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="comment-body">{c.body}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {lightboxOpen && (
        <div className="lightbox">
          <button className="lightbox-backdrop" onClick={() => setLightboxOpen(false)} />
          <div className="lightbox-body">
            <img className="lightbox-img" src={images[detailIdx]} alt="" />
            <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="modal-backdrop" onMouseDown={() => setConfirmOpen(false)}>
          <div className="modal modal-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">Delete post?</h2>
              <button className="modal-x" onClick={() => setConfirmOpen(false)}>X</button>
            </div>
            <p className="modal-confirm-text">Permanently delete this post?</p>
            <div className="modal-confirm-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDeletePost}>Delete</button>
            </div>
          </div>
        </div>
      )}
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

function formatDateKey(ts) {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = formatDateKey(new Date(year, month, day).getTime());
    cells.push({ day, dateKey: key });
  }
  return cells;
} 