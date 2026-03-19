import { useState } from "react";
import { uploadPostImage } from "../lib/api";

export default function EditPostModal({ post, onClose, onSave }) {
  const [title] = useState(post.title);
  const [body] = useState(post.body);
  const [newsReference] = useState(post.newsReference || "");
  const [error, setError] = useState("");
  const isNews = post.postType === "news";
  const [images, setImages] = useState(post.images || []);
  const [imageFiles, setImageFiles] = useState((post.images || []).map((_, i) => `Image ${i + 1}`));
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (images.length + files.length > 6) { setError("Maximum 6 images."); return; }
    setUploading(true); setError("");
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const uploadedFile = await uploadPostImage(file);
        return { url: uploadedFile.url, name: file.name };
      }));
      setImages(prev => [...prev, ...uploaded.map(u => u.url)]);
      setImageFiles(prev => [...prev, ...uploaded.map(u => u.name)]);
    } catch (err) { setError(err.message || "Upload failed."); }
    finally { setUploading(false); e.target.value = ""; }
  }

  function submit(e) {
    e.preventDefault();
    if (body.trim().length < 10) return setError("Body must be at least 10 characters.");
    
    onSave(post.id, { 
      title: title.trim(),
      body: body.trim(),
      images,
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
                      setImages(prev => prev.filter((_, idx) => idx !== i));
                      setImageFiles(prev => prev.filter((_, idx) => idx !== i));
                    }} aria-label="Remove image">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary modal-submit">Save Changes</button>
        </form>
      </div>
    </div>
  );
}
