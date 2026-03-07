const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  id:         { type: String, unique: true },
  postId:     { type: String, required: true },
  author:     { type: String, required: true },
  body:       { type: String, required: true },
  createdAt:  { type: Number, default: () => Date.now() },
  lastEdited: { type: Number, default: null },
});

module.exports = mongoose.model("Comment", CommentSchema);