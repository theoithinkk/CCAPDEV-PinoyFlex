import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthModal from "./components/AuthModal";
import CreatePostModal from "./components/CreatePostModal";
import Profile from "./components/Profile";
import Explore from "./components/Explore";
import Trending from "./components/Trending";
import logoLight from "./assets/logo/lightmode.png";
import logoDark from "./assets/logo/darkmode.png";
import notifInactiveLight from "./assets/webelements/notifInactiveLight.svg";
import EditPostModal from "./components/EditPostModal";
import EditProfileModal from "./components/EditProfileModal";
import {
  createComment,
  createPost,
  editComment,
  editPost,
  followUser,
  getFollowers,
  getFollowing,
  getNotifications,
  getPostComments,
  getPosts,
  getUserProfile,
  markAllNotificationsRead,
  searchAll,
  submitReport as submitUserReport,
  unfollowUser,
  getWorkoutLogs,
  uploadMyAvatar,
  removeComment,
  removePost,
  upsertWorkoutLog,
  updateMyProfile,
  votePost,
} from "./lib/api";

async function adminRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let data = {};
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data?.error || "Request failed");
  return data;
}
const adminGetUsers = (page = 1, q = "") => adminRequest(`/api/admin/users?page=${page}&q=${encodeURIComponent(q)}`);
const adminModerateUser = (id, action) => adminRequest(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ action }) });
const adminDeleteUser = (id) => adminRequest(`/api/admin/users/${id}`, { method: "DELETE" });
const adminGetReports = (page = 1, status = "") => adminRequest(`/api/admin/reports?page=${page}&status=${encodeURIComponent(status)}`);
const adminUpdateReport = (id, payload) => adminRequest(`/api/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

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

function getCurrentUserVote(post, session) {
  if (!post || !session) return 0;
  const byUser = post.voteByUser || {};
  return byUser[session.id] ?? byUser[session.username] ?? 0;
}

// Admin parts
function AdminPanel({ session, posts, setPosts, onToast, onRefreshPosts, adminGetUsers, adminModerateUser, adminDeleteUser, adminGetReports, adminUpdateReport }) {
  const [tab, setTab] = useState("posts");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (tab !== "users") return;
    let mounted = true;
    setUsersLoading(true);
    adminGetUsers(1, userSearch)
      .then((data) => { if (mounted) setUsers(data.users || []); })
      .catch(() => { if (mounted) setUsers([]); })
      .finally(() => { if (mounted) setUsersLoading(false); });
    return () => { mounted = false; };
  }, [tab, userSearch]);

  useEffect(() => {
    if (tab !== "reports") return;
    let mounted = true;
    setReportsLoading(true);
    adminGetReports(1, reportFilter)
      .then((data) => { if (mounted) setReports(data.reports || []); })
      .catch(() => { if (mounted) setReports([]); })
      .finally(() => { if (mounted) setReportsLoading(false); });
    return () => { mounted = false; };
  }, [tab, reportFilter]);

  async function handleDeletePost(postId) {
    try {
      await fetch(`/api/posts/${postId}`, { method: "DELETE", credentials: "include" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      onToast("Post deleted.");
    } catch { onToast("Failed to delete post."); }
    setConfirmAction(null);
  }

  async function handleUserAction(userId, action, label) {
    try {
      await adminModerateUser(userId, action);
      onToast(`${label} applied.`);
      const data = await adminGetUsers(1, userSearch);
      setUsers(data.users || []);
    } catch (err) { onToast(err?.message || "Action failed."); }
    setConfirmAction(null);
  }

  async function handleDeleteUser(userId) {
    try {
      await adminDeleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      onToast("User deleted.");
    } catch (err) { onToast(err?.message || "Failed to delete user."); }
    setConfirmAction(null);
  }

  async function handleReportAction(reportId, status, action) {
    try {
      await adminUpdateReport(reportId, { status, action: action || "", reviewNote: "" });
      onToast("Report updated.");
      const data = await adminGetReports(1, reportFilter);
      setReports(data.reports || []);
      if (action === "remove_comment" || action === "remove_post") {
        await onRefreshPosts?.();
      }
    } catch (err) { onToast(err?.message || "Failed to update report."); }
  }

  const isSuspended = (u) => u.suspendedUntil && u.suspendedUntil > Date.now();

  return (
    <div className="block" style={{ padding: "1.5rem" }}>
      <h2 style={{ marginTop: 0 }}>Admin Panel</h2>

      <div className="profile-tabs" role="tablist" style={{ marginBottom: "1.5rem" }}>
        {["posts", "users", "reports"].map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            className={"profile-tab" + (tab === t ? " is-active" : "")}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* POSTS TAB */}
      {tab === "posts" && (
        <div>
          <p className="detail-muted" style={{ marginTop: 0 }}>All posts — {posts.length} total. Admins can delete any post.</p>
          <div className="profile-list">
            {posts.map((p) => (
              <div key={p.id} className="profile-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a className="profile-item-title" href={`#/post/${p.id}`}>{p.title}</a>
                  <div className="profile-item-meta">by @{p.author} · {p.votes} votes · {p.commentCount} comments · {p.tag}</div>
                </div>
                <button className="btn btn-danger" style={{ marginLeft: "1rem", padding: "4px 10px", fontSize: "0.85rem" }}
                  onClick={() => setConfirmAction({ type: "delete_post", id: p.id, label: `Delete post "${p.title}"` })}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === "users" && (
        <div>
          <input
            className="nav-search"
            style={{ marginBottom: "1rem", maxWidth: "300px" }}
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
          {usersLoading ? (
            <p className="detail-muted">Loading...</p>
          ) : (
            <div className="profile-list">
              {users.map((u) => (
                <div key={u.id} className="profile-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a className="profile-item-title" href={`#/user/${u.username}`}>@{u.username}</a>
                    <div className="profile-item-meta">
                      {u.role === "admin" && <span style={{ color: "var(--primary)", fontWeight: 700, marginRight: 6 }}>ADMIN</span>}
                      {isSuspended(u) && <span style={{ color: "#dc2626", fontWeight: 700, marginRight: 6 }}>SUSPENDED</span>}
                      {u.postCount} posts · {u.commentCount} comments
                    </div>
                  </div>
                  {u.id !== session?.id && (
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {isSuspended(u) ? (
                        <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                          onClick={() => setConfirmAction({ type: "user_action", id: u.id, action: "unsuspend", label: `Unsuspend @${u.username}` })}
                        >Unsuspend</button>
                      ) : (
                        <>
                          <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                            onClick={() => setConfirmAction({ type: "user_action", id: u.id, action: "suspend_7d", label: `Suspend @${u.username} for 7 days` })}
                          >7d Suspend</button>
                          <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                            onClick={() => setConfirmAction({ type: "user_action", id: u.id, action: "suspend_30d", label: `Suspend @${u.username} for 30 days` })}
                          >30d Suspend</button>
                          <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                            onClick={() => setConfirmAction({ type: "user_action", id: u.id, action: "ban", label: `Permanently ban @${u.username}` })}
                          >Ban</button>
                        </>
                      )}
                      {u.role !== "admin" ? (
                        <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                          onClick={() => setConfirmAction({ type: "user_action", id: u.id, action: "make_admin", label: `Make @${u.username} admin` })}
                        >Make Admin</button>
                      ) : (
                        <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                          onClick={() => setConfirmAction({ type: "user_action", id: u.id, action: "remove_admin", label: `Remove admin from @${u.username}` })}
                        >Remove Admin</button>
                      )}
                      <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        onClick={() => setConfirmAction({ type: "delete_user", id: u.id, label: `Delete account @${u.username} and all their content` })}
                      >Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REPORTS TAB */}
      {tab === "reports" && (
        <div>
          <select className="field-select" style={{ marginBottom: "1rem", maxWidth: "200px" }}
            value={reportFilter} onChange={(e) => setReportFilter(e.target.value)}
          >
            <option value="">All reports</option>
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
            <option value="actioned">Actioned</option>
          </select>
          {reportsLoading ? (
            <p className="detail-muted">Loading...</p>
          ) : reports.length === 0 ? (
            <p className="detail-muted">No reports found.</p>
          ) : (
            <div className="profile-list">
              {reports.map((r) => (
                <div key={r.id} className="profile-item">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ flex: 1 }}>
                      <div className="profile-item-title">
                        <span style={{ textTransform: "capitalize" }}>{r.targetType}</span> report by @{r.reporter}
                        <span className="detail-tag" style={{ marginLeft: 8, fontSize: "0.75rem", padding: "2px 6px" }}>{r.status}</span>
                      </div>
                      <div className="profile-item-body">{r.reason}</div>
                      <div className="profile-item-meta" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                        {r.linkPostId && (
                          
                            <a href={r.targetType === "comment" ? `#/post/${r.linkPostId}?highlight=${r.targetId}` : `#/post/${r.linkPostId}`}
                            className="btn btn-secondary"
                            style={{ padding: "2px 8px", fontSize: "0.8rem" }}
                          >
                            View {r.targetType === "comment" ? "Comment's Post" : "Post"}
                          </a>
                        )}
                        {r.linkUsername && (
                          <a href={`#/user/${r.linkUsername}`} className="btn btn-secondary" style={{ padding: "2px 8px", fontSize: "0.8rem" }}>
                            View User
                          </a>
                        )}
                      </div>
                    </div>
                    {r.status === "open" && (
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                          onClick={() => handleReportAction(r.id, "dismissed", "")}
                        >Dismiss</button>
                        {r.targetType === "post" && (
                          <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                            onClick={() => handleReportAction(r.id, "actioned", "remove_post")}
                          >Remove Post</button>
                        )}
                        {r.targetType === "comment" && (
                          <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                            onClick={() => handleReportAction(r.id, "actioned", "remove_comment")}
                          >Remove Comment</button>
                        )}
                        {r.targetType === "user" && (
                          <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                            onClick={() => handleReportAction(r.id, "actioned", "suspend_user_7d")}
                          >Suspend 7d</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmAction && (
        <div className="modal-backdrop" onMouseDown={() => setConfirmAction(null)}>
          <div className="modal modal-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">Confirm Action</h2>
              <button className="modal-x" onClick={() => setConfirmAction(null)}>✕</button>
            </div>
            <p className="modal-confirm-text">{confirmAction.label}</p>
            <div className="modal-confirm-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => {
                if (confirmAction.type === "delete_post") handleDeletePost(confirmAction.id);
                else if (confirmAction.type === "user_action") handleUserAction(confirmAction.id, confirmAction.action, confirmAction.label);
                else if (confirmAction.type === "delete_user") handleDeleteUser(confirmAction.id);
              }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  const { session, isLoggedIn, login, register, logout, updateSession } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login | signup
  const [toast, setToast] = useState("");

  /* ===== Edit States (Post & Profile) ===== */
  const [editPostData, setEditPostData] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [viewingUser, setViewingUser] = useState(null); // For #/user/:username
  const [profilePosts, setProfilePosts] = useState([]);
  const [profileComments, setProfileComments] = useState([]);
  const [profileHistory, setProfileHistory] = useState([]);
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

  /* ===== Search UI ===== */
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchWrapRef = useRef(null);
  const notifWrapRef = useRef(null);
  const [searchSuggest, setSearchSuggest] = useState({ posts: [], users: [], tags: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({ posts: [], users: [], tags: [] });
  const [searchResultsLoading, setSearchResultsLoading] = useState(false);
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

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsData, setNotificationsData] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [followListOpen, setFollowListOpen] = useState(false);
  const [followListTitle, setFollowListTitle] = useState("");
  const [followListUsers, setFollowListUsers] = useState([]);
  const [followBusy, setFollowBusy] = useState(false);

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

  useEffect(() => {
    if (!notificationsOpen) return;
    function handleDocClick(event) {
      if (!notifWrapRef.current) return;
      if (!notifWrapRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!searchOpen || !searchValue.trim()) {
      setSearchSuggest({ posts: [], users: [], tags: [] });
      return;
    }

    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const data = await searchAll(searchValue.trim());
        if (!mounted) return;
        setSearchSuggest({
          posts: (data.posts || []).slice(0, 5),
          users: (data.users || []).slice(0, 5),
          tags: (data.tags || []).slice(0, 5),
        });
      } catch {
        if (!mounted) return;
        setSearchSuggest({ posts: [], users: [], tags: [] });
      } finally {
        if (mounted) setSearchLoading(false);
      }
    }, 220);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [searchOpen, searchValue]);

  /* ===== Routing + posts ===== */
  const [posts, setPosts] = useState([]);
  const [route, setRoute] = useState(getRoute());

    const sortedPosts = useMemo(() => {
    const now = Date.now();
    const copy = [...posts];
    if (sortBy === "New") {
      return copy.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    }
    if (sortBy === "Top") {
      return copy.sort((a, b) => Number(b.votes || 0) - Number(a.votes || 0));
    }
   if (sortBy === "Hot") {
  // Score = votes + recency bonus (newer posts gets a bonus score of +20 and goes down for each hour past)
  const score = (p) => {
    const hoursOld = (now - Number(p.createdAt || 0)) / 3600000;
    const recencyBonus = Math.max(0, 20 - hoursOld);
    return Number(p.votes || 0) + recencyBonus;
  };
  return copy.sort((a, b) => score(b) - score(a));
}
    if (sortBy === "Best") {
  // Score = votes + (comments * 0.5), favors posts with both votes and comment
  const score = (p) => Number(p.votes || 0) + Number(p.commentCount || 0) * 0.5;
  return copy.sort((a, b) => score(b) - score(a));
}
    return copy;
  }, [posts, sortBy]);

  useEffect(() => {
    function onHashChange() {
      setRoute(getRoute());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // -- Parse Route Params --
  const activePostId = parsePostIdFromHash(route);
  const highlightCommentId = parseHighlightCommentFromHash(route);
  const activePost = activePostId ? posts.find((p) => p.id === activePostId) : null;
  
  const searchQuery = route.startsWith("#/search") 
    ? new URLSearchParams(route.split("?")[1]).get("q") || "" 
    : "";
    
  const userProfileTarget = route.startsWith("#/user/") 
    ? route.split("/user/")[1] 
    : null;

  useEffect(() => {
    if (!route.startsWith("#/search")) {
      setSearchResults({ posts: [], users: [], tags: [] });
      return;
    }
    if (!searchQuery.trim()) {
      setSearchResults({ posts: [], users: [], tags: [] });
      return;
    }

    let mounted = true;
    setSearchResultsLoading(true);
    searchAll(searchQuery.trim())
      .then((data) => {
        if (!mounted) return;
        setSearchResults({
          posts: data.posts || [],
          users: data.users || [],
          tags: data.tags || [],
        });
      })
      .catch(() => {
        if (!mounted) return;
        setSearchResults({ posts: [], users: [], tags: [] });
      })
      .finally(() => {
        if (mounted) setSearchResultsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [route, searchQuery]);

  // -- Data Loading --
  useEffect(() => {
    const now = typeof performance !== "undefined" && performance.now ? () => performance.now() : () => Date.now();
    const start = now();
    let mounted = true;

    getPosts()
      .then((loaded) => {
        if (mounted) setPosts(loaded);
      })
      .catch(() => {
        if (mounted) setPosts([]);
      });

    const minMs = 600;
    const elapsed = now() - start;
    const delay = Math.max(0, minMs - elapsed);

    const t = setTimeout(() => setAppReady(true), delay);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, []);

  // -- Load User Profile Data --
  useEffect(() => {
    let mounted = true;
    const username = userProfileTarget || (route === "#/profile" ? session?.username : null);
    if (!username) {
      setViewingUser(null);
      setProfilePosts([]);
      setProfileComments([]);
      setProfileHistory([]);
      return undefined;
    }

    getUserProfile(username)
      .then((data) => {
        if (!mounted) return;
        setViewingUser(data.user || null);
        setProfilePosts(data.posts || []);
        setProfileComments(data.comments || []);
        setProfileHistory(data.history || []);
      })
      .catch(() => {
        if (!mounted) return;
        setViewingUser(null);
        setProfilePosts([]);
        setProfileComments([]);
        setProfileHistory([]);
      });

    return () => {
      mounted = false;
    };
  }, [userProfileTarget, route, session?.username]);

  useEffect(() => {
    if (!isLoggedIn) {
      setWorkoutLogs({});
      return;
    }
    let mounted = true;
    getWorkoutLogs()
      .then((logs) => {
        if (mounted) setWorkoutLogs(logs);
      })
      .catch(() => {
        if (mounted) setWorkoutLogs({});
      });
    return () => {
      mounted = false;
    };
  }, [isLoggedIn, session?.id]);

  useEffect(() => {
    if (!isLoggedIn && route === "#/history") {
      window.location.hash = "#/";
    }
  }, [isLoggedIn, route]);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotificationsData([]);
      setUnreadNotifications(0);
      return;
    }

    let mounted = true;
    async function loadNotifications() {
      try {
        const data = await getNotifications(1, 20);
        if (!mounted) return;
        setNotificationsData(data.notifications || []);
        setUnreadNotifications(data.unreadCount || 0);
      } catch {
        if (!mounted) return;
        setNotificationsData([]);
        setUnreadNotifications(0);
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isLoggedIn, session?.id]);


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

  async function handleCreate({ title, tag, body, images }) {
    try {
      const created = await createPost({
        title: title.trim(),
        tag,
        body: body.trim(),
        images: images || [],
      });
      setPosts((prev) => [created, ...prev]);
      setCreateOpen(false);
    } catch (err) {
      setToast(err?.message || "Failed to create post.");
    }
  }

  /* ===== Editing Handlers ===== */
  function handleEditPost(post) {
    setEditPostData(post);
  }

  async function saveEditedPost(postId, updates) {
    try {
      const updated = await editPost(postId, updates);
      setPosts((prev) => prev.map((post) => (post.id === postId ? updated : post)));
      setEditPostData(null);
    } catch (err) {
      setToast(err?.message || "Failed to update post.");
    }
  }

  function updatePostCommentCount(postId, count) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: count } : p)));
  }

  async function handleVote(postId, direction) {
    if (!isLoggedIn) {
      setToast("You need to log in before voting.");
      openLogin();
      return;
    }
    try {
      const updated = await votePost(postId, direction);
      setPosts((prev) => prev.map((post) => (post.id === postId ? updated : post)));
    } catch (err) {
      setToast(err?.message || "Failed to vote.");
    }
  }

  async function saveWorkoutLogEntry(dateKey, text) {
    if (!isLoggedIn) {
      setToast("You need to log in before saving a workout log.");
      openLogin();
      return false;
    }

    const cleaned = (text || "").trim();
    if (!dateKey || cleaned.length < 1 || cleaned.length > 30) return false;

    try {
      const next = await upsertWorkoutLog(dateKey, cleaned);
      setWorkoutLogs(next);
      return true;
    } catch {
      return false;
    }
  }

  async function handleQuickLogSave() {
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

    const ok = await saveWorkoutLogEntry(logDate, cleaned);
    if (!ok) return;
    setLogText("");
    setToast("Workout log saved.");
  }

  function openReportModal(target) {
    setReportTarget(target || null);
    setReportOpen(true);
  }

  async function submitReport(payload) {
    const target = payload?.target || reportTarget;
    const reason = payload?.reason || "";
    if (!target?.id || !target?.type) {
      setToast("Unable to submit report.");
      return;
    }
    try {
      await submitUserReport({
        targetType: target.type,
        targetId: target.id,
        reason,
      });
      setToast("Report submitted.");
    } catch (err) {
      setToast(err?.message || "Failed to submit report.");
    } finally {
      setReportOpen(false);
      setReportTarget(null);
    }
  }

  async function handleFollowToggle(targetUsername, isFollowing) {
    if (!isLoggedIn) {
      setToast("You need to log in first.");
      openLogin();
      return;
    }
    if (!targetUsername || followBusy) return;
    try {
      setFollowBusy(true);
      if (isFollowing) {
        await unfollowUser(targetUsername);
      } else {
        await followUser(targetUsername);
      }
      const data = await getUserProfile(targetUsername);
      setViewingUser(data.user || null);
      setProfilePosts(data.posts || []);
      setProfileComments(data.comments || []);
      setProfileHistory(data.history || []);
    } catch (err) {
      setToast(err?.message || "Failed to update follow state.");
    } finally {
      setFollowBusy(false);
    }
  }

  async function openFollowList(kind, username) {
    if (!username) return;
    try {
      const data = kind === "followers" ? await getFollowers(username, 1, 100) : await getFollowing(username, 1, 100);
      setFollowListTitle(kind === "followers" ? `Followers of @${username}` : `Following @${username}`);
      setFollowListUsers(data.users || []);
      setFollowListOpen(true);
    } catch (err) {
      setToast(err?.message || "Failed to load users.");
    }
  }

  async function openNotifications() {
    setNotificationsOpen((v) => !v);
    if (unreadNotifications > 0) {
      try {
        await markAllNotificationsRead();
        setUnreadNotifications(0);
        setNotificationsData((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || Date.now() })));
      } catch {
        // noop
      }
    }
  }

  const recentLogEntries = useMemo(
    () =>
      Object.entries(workoutLogs)
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .slice(0, 3),
    [workoutLogs]
  );

  const notifIconSrc = notifInactiveLight;

  /* Lock background scroll when any modal is open */
  useEffect(() => {
    const anyOpen = authOpen || createOpen || editPostData || isEditingProfile || reportOpen || followListOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [authOpen, createOpen, editPostData, isEditingProfile, reportOpen, followListOpen]);

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
            {session?.role === "admin" && (
              <a className={"navlink navlink-admin" + (route.startsWith("#/admin") ? " is-active" : "")} href="#/admin">
                Admin
              </a>
            )}
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
                {searchLoading && <div className="search-empty">Searching...</div>}
                {searchValue.trim() && !searchLoading && searchSuggest.users.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-title">Users</div>
                    {searchSuggest.users.map((u) => (
                      <button
                        key={u.id}
                        className="search-item"
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          window.location.hash = `#/user/${encodeURIComponent(u.username)}`;
                        }}
                      >
                        <span className="search-item-icon">@</span>
                        <span className="search-item-text">{u.username}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchValue.trim() && !searchLoading && searchSuggest.tags.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-title">Tags</div>
                    {searchSuggest.tags.map((tag) => (
                      <button
                        key={tag}
                        className="search-item"
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          window.location.hash = `#/search?q=${encodeURIComponent(tag)}`;
                        }}
                      >
                        <span className="search-item-icon">#</span>
                        <span className="search-item-text">{tag}</span>
                      </button>
                    ))}
                  </div>
                )}
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
                <div className="notif-wrap" ref={notifWrapRef}>
                  <button className="notif-trigger" type="button" onClick={openNotifications} aria-label="Notifications">
                    <img className="notif-icon-img" src={notifIconSrc} alt="" aria-hidden="true" />
                    {unreadNotifications > 0 && (
                      <span className="notif-count">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>
                    )}
                  </button>
                  <div className={"notif-panel" + (notificationsOpen ? " show" : "")}>
                    <div className="notif-head">
                      <h3>Notifications</h3>
                      <button className="notif-close" type="button" onClick={() => setNotificationsOpen(false)}>
                        Close
                      </button>
                    </div>
                    {notificationsData.length === 0 ? (
                      <div className="notif-empty">No notifications yet.</div>
                    ) : (
                      <div className="notif-list">
                        {notificationsData.map((n) => (
                          <a
                            key={n.id}
                            className={"notif-item" + (n.readAt ? "" : " is-unread")}
                            href={n.refType === "post" && n.refId ? `#/post/${n.refId}` : "#/"}
                            onClick={(e) => {
                              if (!(n.refType === "post" && n.refId)) e.preventDefault();
                              setNotificationsOpen(false);
                            }}
                          >
                            <div className="notif-item-title">{n.title}</div>
                            <div className="notif-item-body">{n.body}</div>
                            <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
                  onSaveEntry={async (dateKey, text) => {
                    const ok = await saveWorkoutLogEntry(dateKey, text);
                    if (ok) setToast("Workout log saved.");
                    return ok;
                  }}
                />
              ) : route.startsWith("#/search") ? (
                // === SEARCH RESULTS ===
                <div className="feed-header">
                    <h2>Search Results: "{searchQuery}"</h2>
                    {searchResultsLoading ? (
                      <p className="detail-muted">Searching...</p>
                    ) : (
                      <>
                        {searchResults.users.length > 0 && (
                          <div className="block" style={{ marginBottom: "1rem" }}>
                            <h3>Users</h3>
                            <div className="profile-list">
                              {searchResults.users.map((u) => (
                                <a key={u.id} className="profile-item" href={`#/user/${u.username}`}>
                                  <div className="profile-item-title">@{u.username}</div>
                                  <div className="profile-item-body">{u.bio || "No bio yet."}</div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {searchResults.posts.length > 0 && (
                          searchResults.posts.map((p) => (
                            <PostCard
                              key={p.id}
                              {...p}
                              userVote={getCurrentUserVote(p, session)}
                              onVote={handleVote}
                              onReport={(target) => openReportModal(target)}
                            />
                          ))
                        )}
                        {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                          <p className="detail-muted">No matches found.</p>
                        )}
                      </>
                    )}
                </div>
              ) : route === "#/history" ? (
                <div className="feed-header">
                  <h2>Your Interaction History</h2>
                  {!isLoggedIn ? (
                    <p className="detail-muted">Redirecting to home...</p>
                  ) : profileHistory.length === 0 ? (
                    <p className="detail-muted">No interactions yet.</p>
                  ) : (
                    <div className="profile-list">
                      {profileHistory.map((item) => (
                        <a key={`${item.type}-${item.postId}`} className="profile-item" href={`#/post/${item.postId}`}>
                          <div className="profile-item-title">{item.title}</div>
                          <div className="profile-item-body">
                            {item.type === "voted" ? "You voted on this post" : "You commented on this post"}
                          </div>
                          <div className="profile-item-meta">{timeAgo(item.createdAt)}</div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : route.startsWith("#/user/") ? (
                // === VIEW USER PROFILE ===
                <Profile 
                    user={viewingUser} 
                    isCurrentUser={session?.username === viewingUser?.username}
                    isLoggedIn={isLoggedIn}
                    onEdit={() => setIsEditingProfile(true)}
                    onToggleFollow={handleFollowToggle}
                    onOpenFollowers={(username) => openFollowList("followers", username)}
                    onOpenFollowing={(username) => openFollowList("following", username)}
                    followBusy={followBusy}
                    userPosts={profilePosts}
                    userComments={profileComments}
                    userHistory={profileHistory}
                />
              ) : route === "#/profile" ? (
                // === MY PROFILE ===
                <Profile 
                    user={viewingUser || session} 
                    isCurrentUser={true}
                    isLoggedIn={isLoggedIn}
                    onEdit={() => setIsEditingProfile(true)}
                    onToggleFollow={handleFollowToggle}
                    onOpenFollowers={(username) => openFollowList("followers", username)}
                    onOpenFollowing={(username) => openFollowList("following", username)}
                    followBusy={followBusy}
                    userPosts={profilePosts}
                    userComments={profileComments}
                    userHistory={profileHistory}
                />
              ) : route.startsWith("#/explore") ? (
                <Explore
                  posts={posts}
                  isLoggedIn={isLoggedIn}
                  session={session}
                  onVote={handleVote}
                  onRequireLogin={openLogin}
                />
              ) : route === "#/trending" ? (
                <Trending
                  posts={posts}
                  isLoggedIn={isLoggedIn}
                  session={session}
                  onVote={handleVote}
                  onRequireLogin={openLogin}
                />
              ) : route.startsWith("#/admin") ? (
                session?.role === "admin" ? (
                  <AdminPanel
                    session={session}
                    posts={posts}
                    setPosts={setPosts}
                    onToast={setToast}
                    onRefreshPosts={async () => { const p = await getPosts(); setPosts(p); }}
                    adminGetUsers={adminGetUsers}
                    adminModerateUser={adminModerateUser}
                    adminDeleteUser={adminDeleteUser}
                    adminGetReports={adminGetReports}
                    adminUpdateReport={adminUpdateReport}
                  />
                ) : (
                  <div className="detail-card"><h2>Access Denied</h2><p className="detail-muted">Admins only.</p></div>
                )
              ) : activePostId ? (
              <PostDetail
                post={activePost}
                isLoggedIn={isLoggedIn}
                session={session}
                openLogin={openLogin}
                onVotePost={handleVote}
                onReportPost={(target) => openReportModal(target)}
                currentUserVote={getCurrentUserVote(activePost, session)}
                onEditPost={() => handleEditPost(activePost)}
                highlightCommentId={highlightCommentId}
                onDeletePost={async (postId) => {
                  try {
                    await removePost(postId);
                    setPosts((prev) => prev.filter((post) => post.id !== postId));
                    window.location.hash = "#/";
                  } catch (err) {
                    setToast(err?.message || "Failed to delete post.");
                  }
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

                {sortedPosts.length === 0 ? (
                  <div className="detail-muted">No posts yet.</div>
                ) : (
                  sortedPosts.map((p) => (
                  <PostCard
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    author={p.author}
                    authorAvatar={p.authorAvatar}
                    createdAt={p.createdAt}
                    preview={(p.body || "").slice(0, 120) + ((p.body || "").length > 120 ? "…" : "")}
                    votes={p.votes || 0}
                    userVote={getCurrentUserVote(p, session)}
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
          onSuccess={async ({ mode, username, password }) => {
            if (mode === "login") {
              await login(username, password);
            } else {
              await register(username, password);
            }
            setAuthOpen(false);
            try {
              const refreshedPosts = await getPosts();
              setPosts(refreshedPosts);
            } catch {
              // keep existing feed if refresh fails
            }
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
          user={viewingUser || session}
          onClose={() => setIsEditingProfile(false)}
          onSave={updateMyProfile}
          onUploadAvatar={uploadMyAvatar}
          onSuccess={(updatedUser) => {
            updateSession({
              id: updatedUser.id || session?.id,
              username: updatedUser.username || session?.username,
              avatar: updatedUser.avatar || session?.avatar,
            });
            setViewingUser(updatedUser);
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

      {followListOpen && (
        <div className="modal-backdrop" onMouseDown={() => setFollowListOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">{followListTitle}</h2>
              <button className="modal-x" type="button" onClick={() => setFollowListOpen(false)}>
                X
              </button>
            </div>
            {followListUsers.length === 0 ? (
              <div className="detail-muted">No users yet.</div>
            ) : (
              <div className="profile-list">
                {followListUsers.map((u) => (
                  <a
                    key={u.id}
                    className="profile-item"
                    href={`#/user/${u.username}`}
                    onClick={() => setFollowListOpen(false)}
                  >
                    <div className="profile-item-title">@{u.username}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
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

  async function handleSave() {
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

    const ok = await onSaveEntry?.(selectedDate, cleaned);
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
  authorAvatar = "/avatars/default.png",
  createdAt = 0,
  images = [],
  onVote,
  onReport,
}) {
  const timeText = createdAt ? timeAgo(createdAt) : meta;
  const postHref = `#/post/${id}`;
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
  onEditPost,
  highlightCommentId = null,
}) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [detailIdx, setDetailIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);

  // Comment Editing State
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editBody, setEditBody] = useState("");

  // Highlight comment from report link
  useEffect(() => {
    if (!highlightCommentId || comments.length === 0) return;
    setHighlightedId(highlightCommentId);
    const el = document.getElementById(`comment-${highlightCommentId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightedId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightCommentId, comments]);

  useEffect(() => {
    if (!post) return;
    let mounted = true;
    getPostComments(post.id)
      .then((loaded) => {
        if (mounted) setComments(loaded);
      })
      .catch(() => {
        if (mounted) setComments([]);
      });
    return () => {
      mounted = false;
    };
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

  async function submitComment(e) {
    e.preventDefault();
    if (!isLoggedIn) {
      openLogin();
      return;
    }
    const body = text.trim();
    if (body.length < 2) return;
    try {
      const created = await createComment(post.id, body);
      setComments((prev) => {
        const next = [...prev, created];
        onUpdatePostCommentCount(post.id, next.length);
        return next;
      });
      setText("");
    } catch {
      // noop
    }
  }
  
  async function saveCommentEdit(cId) {
      try {
        const updated = await editComment(post.id, cId, editBody);
        setComments((prev) => prev.map((comment) => (comment.id === cId ? updated : comment)));
        setEditingCommentId(null);
      } catch {
        // noop
      }
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

  async function confirmDeletePost() {
    if (!isLoggedIn || !isOwner) return;
    await onDeletePost(post.id);
    setConfirmOpen(false);
  }

  async function handleDeleteComment(commentId, commentAuthor) {
    if (!isLoggedIn) { openLogin(); return; }
    const canDelete = isOwner || session?.username === commentAuthor;
    if (!canDelete) return;
    try {
      await removeComment(post.id, commentId);
      setComments((prev) => {
        const next = prev.filter((comment) => comment.id !== commentId);
        onUpdatePostCommentCount(post.id, next.length);
        return next;
      });
    } catch {
      // noop
    }
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
              <div
                className="comment"
                key={c.id}
                id={`comment-${c.id}`}
                style={highlightedId === c.id ? { background: "rgba(234, 179, 8, 0.2)", borderRadius: "8px", transition: "background 0.4s" } : { transition: "background 0.4s" }}
              >
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
                    {isLoggedIn && c.author !== session?.username && (
                      <button className="comment-delete" type="button" style={{ marginLeft: "10px", color: "var(--text-secondary)" }}
                        onClick={() => onReportPost?.({ type: "comment", id: c.id, title: `Comment by @${c.author}` })}
                      >
                        Report
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
  const m = hash.match(/^#\/post\/([^?]+)/);
  return m ? m[1] : null;
}

function parseHighlightCommentFromHash(hash) {
  const m = hash.match(/[?&]highlight=([^&]+)/);
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
