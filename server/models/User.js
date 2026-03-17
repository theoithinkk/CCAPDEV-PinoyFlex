const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  id:       { type: String, unique: true },
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  avatar:   { type: String, default: "/avatars/default.png" },
  bio:      { type: String, default: "" },
});

module.exports = mongoose.model("User", UserSchema);