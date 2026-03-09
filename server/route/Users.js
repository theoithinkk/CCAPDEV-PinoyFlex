const express = require("express");
const router  = express.Router();
const User    = require("../models/User");

// GET /api/users
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:username
router.get("/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }, "-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username.trim() });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const { password: _pw, ...safeUser } = user.toObject();
    res.json({ ok: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const u = username.trim();
    const exists = await User.findOne({ username: u });
    if (exists) return res.status(409).json({ error: "Username already exists" });
    const newUser = await User.create({
      id: `u_${Date.now()}`,
      username: u,
      password,
      avatar: "/avatars/default.png",
    });
    const { password: _pw, ...safeUser } = newUser.toObject();
    res.status(201).json({ ok: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:username
// might refactor when we add actual file uploads instead of using links as a medium of adding images/files
router.patch("/:username", async (req, res) => {
  try {
    const { avatar, bio } = req.body;
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: { avatar, bio } },
      { new: true, select: "-password" }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;