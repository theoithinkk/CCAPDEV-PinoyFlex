import express from "express";
import mongoose from "mongoose";
import Post from "../model/Post.js";
import Comment from "../model/Comment.js";

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  return next();
}

router.get("/", async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).populate("author", "username").lean();
    const postIds = posts.map((post) => post._id);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(commentCounts.map((entry) => [entry._id.toString(), entry.count]));
    const decoratedPosts = posts.map((post) => ({
      ...post,
      commentCount: countMap.get(post._id.toString()) || 0,
    }));

    res.render("posts", {
      title: "Posts",
      posts: decoratedPosts,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/new", requireAuth, (req, res) => {
  res.render("post-new", { title: "Create Post", error: null });
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const title = (req.body.title || "").trim();
    const tag = (req.body.tag || "General").trim();
    const body = (req.body.body || "").trim();

    if (!title || !body) {
      return res.status(400).render("post-new", {
        title: "Create Post",
        error: "Title and body are required.",
      });
    }

    const created = await Post.create({
      title,
      tag,
      body,
      author: new mongoose.Types.ObjectId(req.session.user.id),
      votes: 0,
    });

    res.redirect(`/posts/${created._id.toString()}`);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "username").lean();
    if (!post) {
      return res.status(404).render("error", { title: "Not Found", message: "Post not found." });
    }

    const comments = await Comment.find({ post: post._id })
      .sort({ createdAt: 1 })
      .populate("author", "username")
      .lean();

    res.render("post-detail", {
      title: post.title,
      post,
      comments,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/vote", requireAuth, async (req, res, next) => {
  try {
    const direction = Number(req.body.direction);
    if (![1, -1].includes(direction)) {
      return res.status(400).redirect(`/posts/${req.params.id}`);
    }

    await Post.findByIdAndUpdate(req.params.id, { $inc: { votes: direction } });
    res.redirect(`/posts/${req.params.id}`);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const body = (req.body.body || "").trim();
    if (!body) {
      return res.redirect(`/posts/${req.params.id}`);
    }

    await Comment.create({
      post: new mongoose.Types.ObjectId(req.params.id),
      author: new mongoose.Types.ObjectId(req.session.user.id),
      body,
    });

    res.redirect(`/posts/${req.params.id}`);
  } catch (error) {
    next(error);
  }
});

export default router;
