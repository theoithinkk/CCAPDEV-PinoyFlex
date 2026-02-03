import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { updateUser } from "../lib/authStorage";

export default function Profile() {
  const { session, isLoggedIn, login } = useAuth();

  const [username, setUsername] = useState(session?.username || "");
  const [avatar, setAvatar] = useState(session?.avatar || "/avatars/default.png");
  const [avatarFile, setAvatarFile] = useState(null);

  if (!isLoggedIn || !session) {
    return (
      <div className="profile-card">
        <h2>Please log in to view your profile</h2>
      </div>
    );
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatar(URL.createObjectURL(file)); // preview only
  }

  function handleSave(e) {
    e.preventDefault();

    const newUsername = username.trim();
    if (!newUsername) return;

    updateUser(session.username, {
      username: newUsername,
      avatar
    });

    login(newUsername);

    window.location.reload();
  }

  return (
  <div className="block profile-edit-card">
    <h2 className="profile-title">Edit Profile</h2>

    <div className="profile-avatar-row">
      <img
        src={avatar}
        alt=""
        className="profile-avatar-lg"
      />

      <label className="btn btn-outline avatar-upload-btn">
        Change avatar
        <input
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          hidden
        />
      </label>
    </div>

    <div className="field">
      <label className="field-label">Username</label>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter username"
      />
    </div>

    <div className="profile-actions">
      <button
        type="button"
        className="btn btn-primary btn-save"
        onClick={handleSave}
      >
        Save changes
      </button>
    </div>
  </div>
);
}
