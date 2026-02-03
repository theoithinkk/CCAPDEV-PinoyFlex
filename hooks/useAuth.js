import { useEffect, useState } from "react";
import {
  clearSession,
  loadSession,
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
    const next = { username };
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
