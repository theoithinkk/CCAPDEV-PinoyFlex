const mongoose = require("mongoose");

const WorkoutLogSchema = new mongoose.Schema({
  userKey: { type: String, required: true, unique: true },
  logs:    { type: Map, of: String, default: {} },
});

module.exports = mongoose.model("WorkoutLog", WorkoutLogSchema);