const express    = require("express");
const router     = express.Router();
const WorkoutLog = require("../models/WorkoutLog");

// GET /api/workout-logs/:userKey
// returns workout logs
router.get("/:userKey", async (req, res) => {
  try {
    const doc = await WorkoutLog.findOne({ userKey: req.params.userKey });
    res.json(doc ? Object.fromEntries(doc.logs) : {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workout-logs/:userKey/:dateKey
// saves a log for a specific day
router.put("/:userKey/:dateKey", async (req, res) => {
  try {
    const { text } = req.body;
    if (text === undefined) 
      return res.status(400).json({ error: "text is required" });

    const doc = await WorkoutLog.findOneAndUpdate(
      { userKey: req.params.userKey },
      { $set: { [`logs.${req.params.dateKey}`]: text } },
      { new: true, upsert: true }
    );
    res.json(Object.fromEntries(doc.logs));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;