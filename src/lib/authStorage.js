const LS_USERS = "pf_users";
const LS_SESSION = "pf_session";

export function loadUsers() {
  const raw = localStorage.getItem(LS_USERS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

export function seedUsersIfEmpty() {
  const existing = loadUsers();
  if (existing.length === 0) {
    saveUsers([
      { username: "theo", password: "1234" },
      { username: "jane", password: "1234" },
      { username: "mark", password: "1234" },
      { username: "angel", password: "1234" },
      { username: "admin", password: "admin" },
    ]);
  }
}

export function loadSession() {
  const raw = localStorage.getItem(LS_SESSION);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.username ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(LS_SESSION, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(LS_SESSION);
}
