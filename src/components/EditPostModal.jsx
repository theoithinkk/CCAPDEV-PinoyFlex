import { useState } from "react";

export default function EditPostModal({ post, onClose, onSave }) {
  const [body, setBody] = useState(post.body);
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (body.trim().length < 10) return setError("Body must be at least 10 characters.");
    
    onSave(post.id, { 
      body: body.trim(),
      lastEdited: Date.now() 
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal modal-create" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">Edit Post</h2>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          <div className="field">
            <label>Title (Cannot be changed)</label>
            <input value={post.title} disabled className="field-input disabled" style={{opacity: 0.7}} />
          </div>
          <label className="field">
            <span>Body</span>
            <textarea
              className="field-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary modal-submit">Save Changes</button>
        </form>
      </div>
    </div>
  );
}