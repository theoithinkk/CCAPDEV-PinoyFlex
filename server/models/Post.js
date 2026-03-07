const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    id:           { type: String, unique: true },   
    title:        { type: String, required: true },
    body:         { type: String, required: true },
    tag:          { type: String, default: "General" },
    author:       { type: String, required: true },   
    authorId:     { type: String },
    votes:        { type: Number, default: 0 },
    voteByUser:   { type: Map, of: Number, default: {} },
    images:       { type: [String], default: [] },
    commentCount: { type: Number, default: 0 },
    lastEdited:   { type: Number, default: null },
    createdAt:    { type: Number, default: () => Date.now() },
  }
);

PostSchema.set("timestamps", false);

module.exports = mongoose.model("Post", PostSchema);
