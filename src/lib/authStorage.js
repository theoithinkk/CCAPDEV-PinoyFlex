import { SAMPLE_USERS } from "./sampleData";
const LS_USERS = "pf_users";
const LS_SESSION = "pf_session";

export function loadUsers() {
  const raw = localStorage.getItem(LS_USERS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((u) => ({
      ...u,
      avatar: normalizeAvatarPath(u?.avatar),
    }));
  } catch {
    return [];
  }
}

function normalizeAvatarPath(path) {
  if (!path || typeof path !== "string") return "/avatars/default.png";
  if (path.startsWith("/avatars/")) return path;
  if (path.startsWith("src/assets/avatars/")) {
    const file = path.split("/").pop();
    return `/avatars/${file}`;
  }
  return path;
}

export function updateUser(oldUsername, updatedFields) {
  const users = loadUsers();

  // prevent duplicate usernames
  if (
    updatedFields.username &&
    users.some(
      u => u.username === updatedFields.username && u.username !== oldUsername
    )
  ) {
    throw new Error("Username already exists");
  }

  const updatedUsers = users.map(u =>
    u.username === oldUsername
      ? { ...u, ...updatedFields }
      : u
  );

  saveUsers(updatedUsers);

  // update session if current user was updated
  const session = loadSession();
  if (session?.username === oldUsername) {
    saveSession({
      username: updatedFields.username ?? session.username,
      avatar: updatedFields.avatar ?? session.avatar
    });
  }
}

export function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

export function seedUsersIfEmpty() {
  if (loadUsers().length === 0) {
    saveUsers(SAMPLE_USERS);
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

export function getUserByUsername(username) {
  const users = loadUsers();
  return users.find(u => u.username === username);
}

export function updateUserProfile(username, updates) {
  const users = loadUsers();
  const index = users.findIndex(u => u.username === username);
  if (index === -1) return null;

  const updatedUser = { ...users[index], ...updates };
  users[index] = updatedUser;
  saveUsers(users);

  const session = JSON.parse(localStorage.getItem("pf_session"));
  if (session && session.username === username) {
    localStorage.setItem("pf_session", JSON.stringify(updatedUser));
  }
  
  return updatedUser;
}

