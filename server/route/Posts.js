const express = require("express");
const router  = express.Router();
const Post    = require("../models/Post");

// GET /api/posts
// Gets all posts
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.tag)    filter.tag    = req.query.tag;
    if (req.query.author) filter.author = req.query.author;
    if (req.query.q) {
      const re = new RegExp(req.query.q, "i");
      filter.$or = [{ title: re }, { body: re }];
    }
    const posts = await Post.find(filter).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/:id
// Gets one specific post
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts
// Creates a post (might refactor when we add actual file uploads instead of using links as a medium)
router.post("/", async (req, res) => {
  try {
    const { title, body, tag, author, authorId, images } = req.body;
    const newPost = await Post.create({
      id:        `post_${Date.now()}`,
      title:     title.trim(),
      body:      body.trim(),
      tag:       tag || "General",
      author,
      authorId:  authorId || null,
      images:    images || [],
      votes:     0,
      voteByUser: {},
      createdAt: Date.now(),
    });
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/posts/:id
// Edit a post
router.patch("/:id", async (req, res) => {
  try {
    const { body } = req.body;
    const post = await Post.findOneAndUpdate(
      { id: req.params.id },
      { $set: { body, lastEdited: Date.now() } },
      { new: true }
    );
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id
// Deletes a post
router.delete("/:id", async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ id: req.params.id });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/posts/:id/vote
// Upvote/downvote posts
router.patch("/:id/vote", async (req, res) => {
  try {
    const { username, direction } = req.body;
    const post = await Post.findOne({ id: req.params.id });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const voteByUser = Object.fromEntries(post.voteByUser || new Map());
    const prevVote   = voteByUser[username] || 0;
    const nextVote   = prevVote === direction ? 0 : direction;

    if (nextVote === 0) delete voteByUser[username];
    else voteByUser[username] = nextVote;

    const newVotes = (post.votes || 0) - prevVote + nextVote;
    const updated  = await Post.findOneAndUpdate(
      { id: req.params.id },
      { $set: { votes: newVotes, voteByUser } },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;