import { useState } from "react";

export default function EditPostModal({ post, onClose, onSave }) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [newsReference, setNewsReference] = useState(post.newsReference || "");
  const [error, setError] = useState("");
  const isNews = post.postType === "news";

  function submit(e) {
    e.preventDefault();
    if (body.trim().length < 10) return setError("Body must be at least 10 characters.");
    
    onSave(post.id, { 
      title: title.trim(),
      body: body.trim(),
      newsReference: isNews ? newsReference.trim() : "",
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
            <label>Title{isNews ? "" : " (Cannot be changed"}</label>
            <input value={isNews ? title : post.title} onChange={(e) => isNews && setTitle(e.target.value)} disabled={!isNews} className={"field-input" + (!isNews ? " disabled" : "")} style={!isNews ? {opacity: 0.7} : undefined} />
          </div>
          
          {isNews && (
            <label className="field">
              <span>Reference</span>
              <input
                value={newsReference}
                onChange={(e) => setNewsReference(e.target.value)}
              />
            </label>
          )}
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