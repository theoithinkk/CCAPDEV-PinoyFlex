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
    saveUsers([
      {
        id: crypto.randomUUID(),
        username: "theo",
        password: "1234",
        avatar: "/avatars/default.png"
      },
      {
        id: crypto.randomUUID(),
        username: "jane",
        password: "1234",
        avatar: "/avatars/default.png"
      },
      {
        id: crypto.randomUUID(),
        username: "admin",
        password: "admin",
        avatar: "/avatars/default.png"
      }
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

