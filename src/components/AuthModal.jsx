import { useEffect, useState } from "react";
import { loadUsers, saveUsers } from "../lib/authStorage";

export default function AuthModal({ mode, onClose, onSwitchMode, onSuccess }) {
  const isLogin = mode === "login";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  /* reset when switching login/register */
  useEffect(() => {
    setUsername("");
    setPassword("");
    setConfirm("");
    setError("");
  }, [mode]);

  /* close on ESC */
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e) {
    e.preventDefault();
    setError("");

    const u = username.trim();
    if (u.length < 3) return setError("Username too short");
    if (password.length < 4) return setError("Password too short");

    const users = loadUsers();
    const found = users.find(x => x.username === u);

    if (isLogin) {
      if (!found) return setError("User not found");
      if (found.password !== password) return setError("Wrong password");
      return onSuccess(u);
    }

    // signup
    if (password !== confirm) return setError("Passwords do not match");
    if (found) return setError("Username already exists");

    saveUsers([...users, { username: u, password }]);
    onSuccess(u);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{isLogin ? "Log in" : "Register"}</h2>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <form className="modal-form" onSubmit={submit}>
          <label className="field">
            <span>Username</span>
            <input value={username} onChange={e => setUsername(e.target.value)} />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>

          {!isLogin && (
            <label className="field">
              <span>Confirm Password</span>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </label>
          )}

          {error && <div className="form-error">{error}</div>}

          <button className="btn btn-primary modal-submit">
            {isLogin ? "Log in" : "Register"}
          </button>

          <div className="modal-footer">
            <button
              type="button"
              className="linkish"
              onClick={() => onSwitchMode(isLogin ? "signup" : "login")}
            >
              {isLogin ? "Create account" : "Already have an account?"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
