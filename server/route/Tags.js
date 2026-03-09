const express = require("express");
const router  = express.Router();
const Tag     = require("../models/Tag");

// GET /api/tags
router.get("/", async (req, res) => {
  try {
    const tags = await Tag.find().sort({ isDefault: -1, name: 1 });
    res.json(tags.map((t) => t.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tags
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) 
      return res.status(400).json({ error: "Tag name required" });

    const cleaned = name.trim().slice(0, 24);
    const exists  = await Tag.findOne({ name: cleaned });
    if (exists) return res.status(409).json({ error: "Tag already exists" });

    const tag = await Tag.create({ name: cleaned, isDefault: false });
    res.status(201).json({ ok: true, tag: tag.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;