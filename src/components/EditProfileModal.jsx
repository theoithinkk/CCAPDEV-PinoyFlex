import { useState } from "react";
import { updateUserProfile } from "../lib/authStorage";
import blankAvatar from "../assets/avatars/blank.png";

export default function EditProfileModal({ user, onClose, onSuccess }) {
  const [avatar, setAvatar] = useState(user.avatar || blankAvatar);
  const [bio, setBio] = useState(user.bio || "");

  function save() {
    const updates = { 
      avatar: avatar.trim() === "" ? blankAvatar : avatar, 
      bio 
    };
    updateUserProfile(user.username, updates);
    onSuccess(updates);
    onClose();
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
            <span>Profile Picture URL</span>
            <input 
              value={avatar} 
              onChange={e => setAvatar(e.target.value)} 
              placeholder="https://example.com/my-photo.jpg"
              autoFocus
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

          <button className="btn btn-primary" onClick={save}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}