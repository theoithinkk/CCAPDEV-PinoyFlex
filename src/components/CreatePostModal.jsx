import { useEffect, useState } from "react";
import { createTag, getTags } from "../lib/api";

export default function CreatePostModal({ onClose, onCreate, canCreateNews = false }) {
  const [tags, setTags] = useState(["General"]);

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState(tags[0] || "General");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState("post");
  const [newsReference, setNewsReference] = useState("");

  const [customTag, setCustomTag] = useState("");
  const [error, setError] = useState("");

  const [images, setImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;
    getTags()
      .then((loaded) => {
        if (!mounted) return;
        const next = loaded.length > 0 ? loaded : ["General"];
        setTags(next);
        setTag((prev) => (next.includes(prev) ? prev : next[0]));
      })
      .catch(() => {
        if (!mounted) return;
        setTags(["General"]);
        setTag("General");
      });
    return () => {
      mounted = false;
    };
  }, []);

  // If tags list changes, keep selected tag valid
  useEffect(() => {
    if (!tags.includes(tag)) {
      setTag(tags[0] || "General");
    }
  }, [tags, tag]);

  async function handleFileChange(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (images.length + files.length > 6) {
      setError("Maximum 6 images per post.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/posts/upload-image", { method: "POST", credentials: "include", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed.");
        return { url: data.url, name: file.name };
      }));
      setImages((prev) => [...prev, ...uploaded.map(u => u.url)]);
      setImageFiles((prev) => [...prev, ...uploaded.map(u => u.name)]);
    } catch (err) {
      setError(err.message || "Image upload failed.");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset file input so same file can be added again
    }
  }

  function removeImage(idx) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleAddTag() {
    setError("");
    const cleaned = customTag.trim();
    if (!cleaned) {
      setError("Custom tag cannot be empty.");
      return;
    }
    try {
      const created = await createTag(cleaned);
      setTags((prev) => (prev.includes(created) ? prev : [...prev, created]));
      setTag(created);
      setCustomTag("");
    } catch (err) {
      setError(err?.message || "That tag already exists.");
    }
  }

  function submit(e) {
    e.preventDefault();
    setError("");

    const t = title.trim();
    const b = body.trim();

    if (t.length < 5) return setError("Title must be at least 5 characters.");
    if (b.length < 10) return setError("Body must be at least 10 characters.");

    onCreate({ title, tag, body, images, postType, newsReference });
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="modal modal-create" onMouseDown={(e) => e.stopPropagation()}>
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

          {canCreateNews && (
            <label className="field">
              <span>Type</span>
              <select className="field-select" value={postType} onChange={(e) => setPostType(e.target.value)}>
                <option value="post">Post</option>
                <option value="news">Editorial News</option>
              </select>
            </label>
          )}

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

          {postType === "news" && (
            <label className="field">
              <span>Reference</span>
              <input
                value={newsReference}
                onChange={(e) => setNewsReference(e.target.value)}
                placeholder="Journal / article / source"
              />
            </label>
          )}

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
              <div className="field">
                <label>Images (up to 6)</label>
                <input type="file" accept="image/*" multiple onChange={handleFileChange} disabled={uploading || images.length >= 6} />
                {uploading && <div className="detail-muted" style={{ marginTop: "0.4rem" }}>Uploading...</div>}
                {images.length > 0 && (
                  <div className="img-chiprow">
                    {images.map((url, i) => (
                      <div className="img-chip" key={url + i}>
                        <img src={url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, marginRight: 4 }} />
                        <span className="img-chip-text">{imageFiles[i] || `Image ${i + 1}`}</span>
                        <button className="img-chip-x" type="button" onClick={() => {
                          setImages((prev) => prev.filter((_, idx) => idx !== i));
                          setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
                        }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          {error && <div className="form-error" role="alert">{error}</div>}

          <button className="btn btn-primary modal-submit" type="submit">
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
