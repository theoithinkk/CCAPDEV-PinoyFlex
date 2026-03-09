import { useState } from "react";
import blankAvatar from "../assets/avatars/blank.png";

export default function EditProfileModal({ user, onClose, onSuccess, onSave, onUploadAvatar }) {
  const [avatar, setAvatar] = useState(user.avatar || blankAvatar);
  const [bio, setBio] = useState(user.bio || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    try {
      let nextAvatar = avatar;
      if (avatarFile && onUploadAvatar) {
        setAvatarUploading(true);
        const uploaded = await onUploadAvatar(avatarFile);
        nextAvatar = uploaded?.avatar || nextAvatar;
        setAvatar(nextAvatar);
      }

      const updates = { 
        avatar: (nextAvatar || "").trim() === "" ? blankAvatar : nextAvatar,
        bio 
      };

      if (onSave) {
        const updatedUser = await onSave(updates);
        onSuccess(updatedUser || updates);
      } else {
        onSuccess(updates);
      }
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    setAvatarFile(file);
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setAvatar(objectUrl);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{maxWidth: '400px'}} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Edit Profile</h2>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-form">
          
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1.5rem'}}>
             <img 
               src={avatar || blankAvatar} 
               alt="Avatar Preview" 
               style={{
                 width: 100, 
                 height: 100, 
                 borderRadius: '50%', 
                 objectFit: 'cover',
                 border: '4px solid var(--border-subtle)',
                 backgroundColor: '#f0f0f0'
               }} 
               onError={(e) => e.target.src = blankAvatar} 
             />
          </div>

          <label className="field">
            <span>Upload Profile Picture</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            <p className="detail-muted" style={{fontSize: '0.85rem', marginTop: '6px'}}>
              Choose an image from your device (JPG, PNG, WEBP, GIF).
            </p>
          </label>

          <label className="field">
            <span>Or use Profile Picture URL</span>
            <input 
              value={avatar} 
              onChange={e => setAvatar(e.target.value)} 
              placeholder="https://example.com/my-photo.jpg"
            />
            <p className="detail-muted" style={{fontSize: '0.85rem', marginTop: '6px'}}>
              Paste any direct image link from the web.
            </p>
          </label>

          <label className="field">
            <span>Bio</span>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              rows={3} 
              placeholder="Tell us about your fitness journey..." 
              className="field-textarea" 
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="btn btn-primary" onClick={save} disabled={avatarUploading}>
            {avatarUploading ? "Uploading..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
