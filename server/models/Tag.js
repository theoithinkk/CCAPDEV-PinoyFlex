const mongoose = require("mongoose");

const TagSchema = new mongoose.Schema({
  name:      { type: String, required: true, unique: true, trim: true },
  isDefault: { type: Boolean, default: false },
});

module.exports = mongoose.model("Tag", TagSchema);