import { useEffect, useState } from "react";
import {
  clearSession,
  loadSession,
  loadUsers,
  saveSession,
  seedUsersIfEmpty
} from "../lib/authStorage";

export function useAuth() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    seedUsersIfEmpty();
    setSession(loadSession());
  }, []);

  const isLoggedIn = !!session?.username;

  function login(username) {
    const users = loadUsers();
    const user = users.find((u) => u.username === username);
    const next = { id: user?.id || null, username, avatar: user?.avatar };
    saveSession(next);
    setSession(next);
  }

  function logout() {
    clearSession();
    setSession(null);
  }

  function updateSession(nextSession) {
    saveSession(nextSession);
    setSession(nextSession);
  }

  return {
    session,
    isLoggedIn,
    login,
    logout,
    updateSession 
  };
}
