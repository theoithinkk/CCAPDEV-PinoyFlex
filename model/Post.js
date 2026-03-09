import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    tag: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    votes: {
      type: Number,
      default: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    voteByUser: {
      type: Map,
      of: Number,
      default: {},
    },
    lastEdited: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ tag: 1, createdAt: -1 });
postSchema.index({ title: "text", body: "text", tag: "text" });

const Post = mongoose.model("Post", postSchema);
export default Post;
