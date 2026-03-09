const express = require("express");
const router  = express.Router();
const Comment = require("../models/Comment");
const Post    = require("../models/Post");

// GET /api/comments?postId=xxx
// Gets all comments for a post
router.get("/", async (req, res) => {
  try {
    if (!req.query.postId)
      return res.status(400).json({ error: "postId query param required" });
    const comments = await Comment.find({ postId: req.query.postId }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comments
// Adds a comment
router.post("/", async (req, res) => {
  try {
    const { postId, author, body } = req.body;
    const comment = await Comment.create({
      id:        `comment_${Date.now()}`,
      postId,
      author,
      body:      body.trim(),
      createdAt: Date.now(),
    });
    await Post.findOneAndUpdate({ id: postId }, { $inc: { commentCount: 1 } });
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/comments/:id
// Edit a comment
router.patch("/:id", async (req, res) => {
  try {
    const { body } = req.body;
    const comment = await Comment.findOneAndUpdate(
      { id: req.params.id },
      { $set: { body: body.trim(), lastEdited: Date.now() } },
      { new: true }
    );
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/comments/:id
// Delets a comment
router.delete("/:id", async (req, res) => {
  try {
    const comment = await Comment.findOneAndDelete({ id: req.params.id });
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    await Post.findOneAndUpdate({ id: comment.postId }, { $inc: { commentCount: -1 } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;