import { useEffect, useState } from "react";
import { getSession, loginUser, logoutUser, registerUser } from "../lib/api";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    getSession()
      .then((user) => { 
        if (mounted) setSession(user); 
      })
      .catch(() => { 
        if (mounted) setSession(null); 
      })
      .finally(() => { 
        if (mounted) setAuthReady(true); 
      });
    return () => { 
      mounted = false; 
    };
  }, []);

  const isLoggedIn = !!session?.username;

  async function login(username, password) {
    const next = await loginUser(username, password);
    setSession(next);
    return next;
  }

  async function register(username, password) {
    const next = await registerUser(username, password);
    setSession(next);
    return next;
  }

  async function logout() {
    await logoutUser();
    setSession(null);
  }

  function updateSession(nextSession) {
    setSession(nextSession);
  }

  return {
    session,
    isLoggedIn,
    authReady,
    login,
    register,
    logout,
    updateSession,
  };
}
