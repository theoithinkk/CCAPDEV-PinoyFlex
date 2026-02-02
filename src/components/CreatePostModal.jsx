import { useEffect, useMemo, useState } from "react";
import { addCustomTag, loadTags } from "../lib/tagsStorage";

export default function CreatePostModal({ onClose, onCreate }) {
  const [tags, setTags] = useState(() => loadTags());

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState(tags[0] || "General");
  const [body, setBody] = useState("");

  const [customTag, setCustomTag] = useState("");
  const [error, setError] = useState("");

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // If tags list changes, keep selected tag valid
  useEffect(() => {
    if (!tags.includes(tag)) {
      setTag(tags[0] || "General");
    }
  }, [tags, tag]);

  function handleAddTag() {
    setError("");
    const res = addCustomTag(customTag);
    if (!res.ok) {
      if (res.reason === "empty") setError("Custom tag cannot be empty.");
      else setError("That tag already exists.");
      return;
    }
    const nextTags = loadTags();
    setTags(nextTags);
    setTag(res.tag);
    setCustomTag("");
  }

  function submit(e) {
    e.preventDefault();
    setError("");

    const t = title.trim();
    const b = body.trim();

    if (t.length < 5) return setError("Title must be at least 5 characters.");
    if (b.length < 10) return setError("Body must be at least 10 characters.");

    onCreate({ title: t, tag, body: b });
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">Create Post</h2>
          <button className="modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-form" onSubmit={submit}>
          <label className="field">
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What’s on your mind?"
              autoFocus
            />
          </label>

          <label className="field">
            <span>Tag</span>
            <select className="field-select" value={tag} onChange={(e) => setTag(e.target.value)}>
              {tags.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>

          {/* Add custom tag */}
          <div className="tag-add-row">
            <input
              className="field-input"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Add a custom tag (e.g. Calisthenics)"
            />
            <button className="btn btn-secondary" type="button" onClick={handleAddTag}>
              Add
            </button>
          </div>

          <label className="field">
            <span>Body</span>
            <textarea
              className="field-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share details, tips, progress, etc."
              rows={6}
            />
          </label>

          {error && <div className="form-error" role="alert">{error}</div>}

          <button className="btn btn-primary modal-submit" type="submit">
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
