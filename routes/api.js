import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../model/User.js";
import Post from "../model/Post.js";
import Comment from "../model/Comment.js";
import Tag from "../model/Tag.js";
import WorkoutLog from "../model/WorkoutLog.js";

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  return next();
}

function toPostJSON(post, commentCount = 0) {
  const voteByUser = post.voteByUser ? Object.fromEntries(post.voteByUser.entries()) : {};
  return {
    id: post._id.toString(),
    title: post.title,
    body: post.body,
    tag: post.tag,
    author: post.author?.username || "unknown",
    authorId: post.author?._id?.toString() || null,
    authorAvatar: post.author?.avatar || "/avatars/default.png",
    createdAt: new Date(post.createdAt).getTime(),
    votes: post.votes || 0,
    voteByUser,
    images: Array.isArray(post.images) ? post.images : [],
    commentCount,
    lastEdited: post.lastEdited || null,
  };
}

function toCommentJSON(comment) {
  return {
    id: comment._id.toString(),
    postId: comment.post?.toString?.() || comment.post?._id?.toString?.() || "",
    author: comment.author?.username || "unknown",
    authorId: comment.author?._id?.toString() || null,
    body: comment.body,
    createdAt: new Date(comment.createdAt).getTime(),
    lastEdited: comment.lastEdited || null,
  };
}

const DEFAULT_TAGS = ["Form", "Meal Prep", "Physique", "Beginners", "General", "Success"];

router.get("/session", (req, res) => {
  res.json({ user: req.session.user || null });
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const username = (req.body.username || "").trim();
    const password = req.body.password || "";

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid username or password." });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ error: "Invalid username or password." });

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
    };

    return res.json({ user: req.session.user });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/register", async (req, res, next) => {
  try {
    const username = (req.body.username || "").trim();
    const password = req.body.password || "";

    if (username.length < 3 || password.length < 4) {
      return res.status(400).json({ error: "Username must be at least 3 chars and password at least 4 chars." });
    }

    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ error: "Username already exists." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      passwordHash,
      avatar: "/avatars/default.png",
      bio: "",
    });

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
    };

    return res.status(201).json({ user: req.session.user });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/posts", async (req, res, next) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("author", "username avatar")
      .lean();

    const postIds = posts.map((post) => post._id);
    const counts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));
    const data = posts.map((post) =>
      toPostJSON(
        {
          ...post,
          voteByUser: post.voteByUser ? new Map(Object.entries(post.voteByUser)) : new Map(),
        },
        countMap.get(post._id.toString()) || 0
      )
    );

    res.json({ posts: data });
  } catch (error) {
    next(error);
  }
});

router.post("/posts", requireAuth, async (req, res, next) => {
  try {
    const title = (req.body.title || "").trim();
    const body = (req.body.body || "").trim();
    const tag = (req.body.tag || "General").trim();
    const images = Array.isArray(req.body.images) ? req.body.images.filter((img) => typeof img === "string") : [];

    if (!title || !body) return res.status(400).json({ error: "Title and body are required." });

    const created = await Post.create({
      title,
      body,
      tag,
      images,
      author: new mongoose.Types.ObjectId(req.session.user.id),
    });
    const populated = await Post.findById(created._id).populate("author", "username avatar");
    res.status(201).json({ post: toPostJSON(populated, 0) });
  } catch (error) {
    next(error);
  }
});

router.patch("/posts/:id", requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "username avatar");
    if (!post) return res.status(404).json({ error: "Post not found." });
    if (post.author._id.toString() !== req.session.user.id) return res.status(403).json({ error: "Forbidden." });

    const updates = {};
    if (typeof req.body.title === "string") updates.title = req.body.title.trim();
    if (typeof req.body.body === "string") updates.body = req.body.body.trim();
    if (typeof req.body.tag === "string") updates.tag = req.body.tag.trim();
    if (Array.isArray(req.body.images)) updates.images = req.body.images.filter((img) => typeof img === "string");
    updates.lastEdited = Date.now();

    await Post.findByIdAndUpdate(post._id, updates);
    const updated = await Post.findById(post._id).populate("author", "username avatar");
    const commentCount = await Comment.countDocuments({ post: post._id });
    res.json({ post: toPostJSON(updated, commentCount) });
  } catch (error) {
    next(error);
  }
});

router.delete("/posts/:id", requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found." });
    if (post.author.toString() !== req.session.user.id) return res.status(403).json({ error: "Forbidden." });

    await Comment.deleteMany({ post: post._id });
    await Post.findByIdAndDelete(post._id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/posts/:id/vote", requireAuth, async (req, res, next) => {
  try {
    const direction = Number(req.body.direction);
    if (![1, -1].includes(direction)) return res.status(400).json({ error: "Invalid vote direction." });

    const post = await Post.findById(req.params.id).populate("author", "username avatar");
    if (!post) return res.status(404).json({ error: "Post not found." });

    const voteByUser = post.voteByUser || new Map();
    const userKey = req.session.user.username;
    const prevVote = Number(voteByUser.get(userKey) || 0);
    const nextVote = prevVote === direction ? 0 : direction;

    if (nextVote === 0) voteByUser.delete(userKey);
    else voteByUser.set(userKey, nextVote);

    post.votes = (post.votes || 0) - prevVote + nextVote;
    post.voteByUser = voteByUser;
    await post.save();

    const commentCount = await Comment.countDocuments({ post: post._id });
    res.json({ post: toPostJSON(post, commentCount) });
  } catch (error) {
    next(error);
  }
});

router.get("/posts/:id/comments", async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .populate("author", "username")
      .lean();
    res.json({ comments: comments.map(toCommentJSON) });
  } catch (error) {
    next(error);
  }
});

router.post("/posts/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const body = (req.body.body || "").trim();
    if (body.length < 2) return res.status(400).json({ error: "Comment is too short." });

    const created = await Comment.create({
      post: new mongoose.Types.ObjectId(req.params.id),
      author: new mongoose.Types.ObjectId(req.session.user.id),
      body,
    });
    const populated = await Comment.findById(created._id).populate("author", "username");
    res.status(201).json({ comment: toCommentJSON(populated) });
  } catch (error) {
    next(error);
  }
});

router.patch("/posts/:id/comments/:commentId", requireAuth, async (req, res, next) => {
  try {
    const body = (req.body.body || "").trim();
    if (body.length < 2) return res.status(400).json({ error: "Comment is too short." });

    const comment = await Comment.findById(req.params.commentId).populate("author", "username");
    if (!comment) return res.status(404).json({ error: "Comment not found." });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found." });

    const canEdit = comment.author._id.toString() === req.session.user.id;
    if (!canEdit) return res.status(403).json({ error: "Forbidden." });

    comment.body = body;
    comment.lastEdited = Date.now();
    await comment.save();
    res.json({ comment: toCommentJSON(comment) });
  } catch (error) {
    next(error);
  }
});

router.delete("/posts/:id/comments/:commentId", requireAuth, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId).populate("author", "username");
    if (!comment) return res.status(404).json({ error: "Comment not found." });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found." });

    const isPostOwner = post.author.toString() === req.session.user.id;
    const isCommentOwner = comment.author._id.toString() === req.session.user.id;
    if (!isPostOwner && !isCommentOwner) return res.status(403).json({ error: "Forbidden." });

    await Comment.findByIdAndDelete(comment._id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/users/:username/profile", async (req, res, next) => {
  try {
    const username = req.params.username;
    const user = await User.findOne({ username }).lean();
    if (!user) return res.status(404).json({ error: "User not found." });

    const posts = await Post.find({ author: user._id }).sort({ createdAt: -1 }).lean();
    const postIds = posts.map((post) => post._id);

    const comments = await Comment.find({ author: user._id })
      .sort({ createdAt: -1 })
      .lean();
    const postTitleMap = new Map(
      (await Post.find({ _id: { $in: [...new Set(comments.map((c) => c.post.toString()))] } }).lean()).map((p) => [
        p._id.toString(),
        p.title,
      ])
    );

    const postCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(postCounts.map((item) => [item._id.toString(), item.count]));

    const serializedPosts = posts.map((post) =>
      toPostJSON(
        {
          ...post,
          author: { _id: user._id, username: user.username, avatar: user.avatar },
          voteByUser: post.voteByUser ? new Map(Object.entries(post.voteByUser)) : new Map(),
        },
        countMap.get(post._id.toString()) || 0
      )
    );
    const serializedComments = comments.map((comment) => ({
      ...toCommentJSON(comment),
      postTitle: postTitleMap.get(comment.post.toString()) || "Deleted post",
    }));

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        bio: user.bio || "",
      },
      posts: serializedPosts,
      comments: serializedComments,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/me", requireAuth, async (req, res, next) => {
  try {
    const avatar = typeof req.body.avatar === "string" ? req.body.avatar.trim() : undefined;
    const bio = typeof req.body.bio === "string" ? req.body.bio.trim() : undefined;

    const updates = {};
    if (avatar !== undefined) updates.avatar = avatar || "/avatars/default.png";
    if (bio !== undefined) updates.bio = bio;

    const user = await User.findByIdAndUpdate(req.session.user.id, updates, { new: true }).lean();
    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
    };

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        bio: user.bio || "",
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/tags", async (req, res, next) => {
  try {
    const tags = await Tag.find().sort({ isDefault: -1, name: 1 }).lean();
    if (tags.length === 0) {
      await Tag.insertMany(DEFAULT_TAGS.map((name) => ({ name, isDefault: true })));
      const seeded = await Tag.find().sort({ isDefault: -1, name: 1 }).lean();
      return res.json({ tags: seeded.map((tag) => tag.name) });
    }
    return res.json({ tags: tags.map((tag) => tag.name) });
  } catch (error) {
    return next(error);
  }
});

router.post("/tags", requireAuth, async (req, res, next) => {
  try {
    const name = (req.body.name || "").trim().slice(0, 24);
    if (!name) return res.status(400).json({ error: "Tag cannot be empty." });

    const exists = await Tag.findOne({ name });
    if (exists) return res.status(409).json({ error: "Tag already exists." });

    const created = await Tag.create({ name, isDefault: false });
    return res.status(201).json({ tag: created.name });
  } catch (error) {
    return next(error);
  }
});

router.get("/workout-logs", requireAuth, async (req, res, next) => {
  try {
    const logs = await WorkoutLog.find({ user: req.session.user.id }).lean();
    const map = {};
    logs.forEach((entry) => {
      map[entry.dateKey] = entry.text;
    });
    return res.json({ logs: map });
  } catch (error) {
    return next(error);
  }
});

router.put("/workout-logs/:dateKey", requireAuth, async (req, res, next) => {
  try {
    const dateKey = (req.params.dateKey || "").trim();
    const text = (req.body.text || "").trim();

    if (!dateKey) return res.status(400).json({ error: "Invalid date." });
    if (!text || text.length > 30) return res.status(400).json({ error: "Text must be 1-30 characters." });

    await WorkoutLog.findOneAndUpdate(
      { user: req.session.user.id, dateKey },
      { text },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const logs = await WorkoutLog.find({ user: req.session.user.id }).lean();
    const map = {};
    logs.forEach((entry) => {
      map[entry.dateKey] = entry.text;
    });
    return res.json({ logs: map });
  } catch (error) {
    return next(error);
  }
});

export default router;
