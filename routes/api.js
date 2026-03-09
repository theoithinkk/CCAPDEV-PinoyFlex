import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import User from "../model/User.js";
import Post from "../model/Post.js";
import Comment from "../model/Comment.js";
import Tag from "../model/Tag.js";
import WorkoutLog from "../model/WorkoutLog.js";
import Follow from "../model/Follow.js";
import Report from "../model/Report.js";
import Badge from "../model/Badge.js";
import VerificationRequest from "../model/VerificationRequest.js";
import Notification from "../model/Notification.js";

const router = express.Router();
const verificationUploadsDir = path.join(process.cwd(), "uploads", "verifications");
const avatarUploadsDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(verificationUploadsDir)) {
  fs.mkdirSync(verificationUploadsDir, { recursive: true });
}
if (!fs.existsSync(avatarUploadsDir)) {
  fs.mkdirSync(avatarUploadsDir, { recursive: true });
}

function createUpload(destinationDir, maxSizeMb) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, destinationDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || "").slice(0, 10);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      },
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
  });
}

const upload = createUpload(verificationUploadsDir, 25);
const avatarUpload = createUpload(avatarUploadsDir, 5);

const avatarFileTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const avatarUploadMiddleware = (req, res, next) => {
  avatarUpload.single("avatar")(req, res, (err) => {
    if (err) return res.status(400).json({ error: "Avatar upload failed." });
    if (!req.file) return res.status(400).json({ error: "No avatar file uploaded." });
    if (!avatarFileTypes.has(req.file.mimetype)) {
      return res.status(400).json({ error: "Only JPG, PNG, WEBP, and GIF are allowed." });
    }
    return next();
  });
};

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  return next();
}

function parsePagination(query, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const page = Math.max(1, Number(query.page) || defaults.page);
  const limit = Math.min(defaults.maxLimit, Math.max(1, Number(query.limit) || defaults.limit));
  return { page, limit, skip: (page - 1) * limit };
}

function normalizeUsername(value = "") {
  return String(value).trim().toLowerCase();
}

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toSessionUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    avatar: user.avatar,
    role: user.role || "user",
    badges: user.badges || [],
  };
}

async function createNotification(userId, payload) {
  if (!userId) return;
  await Notification.create({
    user: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body || "",
    refType: payload.refType || "",
    refId: payload.refId || "",
  });
}

async function ensureActiveUser(req, res) {
  const user = await User.findById(req.session.user.id);
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session expired." });
    return null;
  }
  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    res.status(403).json({ error: "Account is suspended." });
    return null;
  }
  return user;
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
const ALLOWED_REPORT_TARGETS = new Set(["post", "comment", "user"]);

function toNotificationJSON(notification) {
  return {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    refType: notification.refType,
    refId: notification.refId,
    readAt: notification.readAt ? new Date(notification.readAt).getTime() : null,
    createdAt: new Date(notification.createdAt).getTime(),
  };
}

function toVerificationJSON(item) {
  return {
    id: item._id.toString(),
    userId: item.user?._id?.toString?.() || item.user?.toString?.() || "",
    username: item.user?.username || undefined,
    badgeKey: item.badgeKey,
    proofUrl: item.proofUrl,
    note: item.note || "",
    status: item.status,
    reviewNote: item.reviewNote || "",
    reviewedBy: item.reviewedBy?._id?.toString?.() || item.reviewedBy?.toString?.() || null,
    reviewedByUsername: item.reviewedBy?.username || undefined,
    reviewedAt: item.reviewedAt ? new Date(item.reviewedAt).getTime() : null,
    createdAt: new Date(item.createdAt).getTime(),
  };
}

router.get("/session", async (req, res, next) => {
  try {
    if (!req.session.user) return res.json({ user: null });
    const user = await User.findById(req.session.user.id).lean();
    if (!user) {
      req.session.destroy(() => {});
      return res.json({ user: null });
    }
    return res.json({ user: toSessionUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    const password = req.body.password || "";

    const user = await User.findOne({ normalizedUsername: username });
    if (!user) return res.status(401).json({ error: "Invalid username or password." });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ error: "Invalid username or password." });

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      return res.status(403).json({ error: "Account is suspended." });
    }

    req.session.user = toSessionUser(user);

    return res.json({ user: req.session.user });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/register", async (req, res, next) => {
  try {
    const username = (req.body.username || "").trim();
    const normalizedUsername = normalizeUsername(username);
    const password = req.body.password || "";

    if (username.length < 3 || password.length < 4) {
      return res.status(400).json({ error: "Username must be at least 3 chars and password at least 4 chars." });
    }

    const existing = await User.findOne({ normalizedUsername });
    if (existing) return res.status(409).json({ error: "Username already exists." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      normalizedUsername,
      passwordHash,
      avatar: "/avatars/default.png",
      bio: "",
      role: "user",
    });

    req.session.user = toSessionUser(user);

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
    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 20, maxLimit: 100 });
    const query = {};
    if (req.query.tag) query.tag = String(req.query.tag).trim();

    const [total, posts] = await Promise.all([
      Post.countDocuments(query),
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username avatar")
        .lean(),
    ]);

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

    res.json({
      posts: data,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + data.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/posts", requireAuth, async (req, res, next) => {
  try {
    const activeUser = await ensureActiveUser(req, res);
    if (!activeUser) return;

    const title = (req.body.title || "").trim();
    const body = (req.body.body || "").trim();
    const tag = (req.body.tag || "General").trim();
    const images = Array.isArray(req.body.images)
      ? req.body.images.filter((img) => typeof img === "string").slice(0, 6)
      : [];

    if (title.length < 3 || body.length < 3) {
      return res.status(400).json({ error: "Title and body must both be at least 3 characters." });
    }

    const created = await Post.create({
      title,
      body,
      tag,
      images,
      author: activeUser._id,
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
    const userKey = req.session.user.id;
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
    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 50, maxLimit: 100 });
    const query = { post: req.params.id };
    const [total, comments] = await Promise.all([
      Comment.countDocuments(query),
      Comment.find(query)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username")
        .lean(),
    ]);
    res.json({
      comments: comments.map(toCommentJSON),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + comments.length < total,
      },
    });
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

    const post = await Post.findById(req.params.id).populate("author", "username");
    if (post?.author?._id && post.author._id.toString() !== req.session.user.id) {
      await createNotification(post.author._id, {
        type: "new_comment",
        title: "New comment on your post",
        body: `@${req.session.user.username} commented on "${post.title}"`,
        refType: "post",
        refId: req.params.id,
      });
    }
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
    const username = normalizeUsername(req.params.username);
    const user = await User.findOne({ normalizedUsername: username }).lean();
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
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
    ]);
    let isFollowing = false;
    if (req.session.user?.id) {
      isFollowing = !!(await Follow.findOne({ follower: req.session.user.id, following: user._id }).lean());
    }

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

    let history = [];
    const isOwnProfile = req.session.user?.id && req.session.user.id === user._id.toString();
    if (isOwnProfile) {
      const voterKey = `voteByUser.${user._id.toString()}`;
      const [votedPostsRaw, commentedPostsRaw] = await Promise.all([
        Post.find({ [voterKey]: { $exists: true } })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        Post.find({
          _id: {
            $in: [...new Set(comments.map((c) => c.post))],
          },
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
      ]);

      const votedHistory = votedPostsRaw.map((post) => ({
        type: "voted",
        postId: post._id.toString(),
        title: post.title,
        tag: post.tag,
        createdAt: new Date(post.createdAt).getTime(),
      }));

      const commentedHistory = commentedPostsRaw.map((post) => ({
        type: "commented",
        postId: post._id.toString(),
        title: post.title,
        tag: post.tag,
        createdAt: new Date(post.createdAt).getTime(),
      }));

      const seen = new Set();
      history = [...votedHistory, ...commentedHistory]
        .filter((item) => {
          const key = `${item.type}:${item.postId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 100);
    }

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        bio: user.bio || "",
        role: user.role || "user",
        badges: user.badges || [],
        followersCount,
        followingCount,
        isFollowing,
      },
      posts: serializedPosts,
      comments: serializedComments,
      history,
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
    req.session.user = toSessionUser(user);

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

router.post("/users/me/avatar", requireAuth, avatarUploadMiddleware, async (req, res, next) => {
  try {
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.session.user.id,
      { avatar: avatarPath },
      { new: true }
    ).lean();
    req.session.user = toSessionUser(user);
    return res.status(201).json({
      user: {
        id: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        bio: user.bio || "",
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/feed/trending", async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const windowDays = Math.min(30, Math.max(1, Number(req.query.windowDays) || 7));
    const startAt = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const posts = await Post.find({ createdAt: { $gte: startAt } })
      .sort({ createdAt: -1 })
      .populate("author", "username avatar")
      .lean();

    const postIds = posts.map((post) => post._id);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(commentCounts.map((entry) => [entry._id.toString(), entry.count]));

    const items = posts
      .map((post) => {
        const commentCount = countMap.get(post._id.toString()) || 0;
        const ageHours = Math.max(1, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));
        const freshness = Math.max(0, 24 - ageHours) * 0.15;
        const score = (post.votes || 0) * 2 + commentCount + freshness;
        return {
          post: toPostJSON(
            {
              ...post,
              voteByUser: post.voteByUser ? new Map(Object.entries(post.voteByUser)) : new Map(),
            },
            commentCount
          ),
          score: Number(score.toFixed(3)),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.get("/feed/explore", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 20, maxLimit: 100 });
    const tag = typeof req.query.tag === "string" ? req.query.tag.trim() : "";
    const query = tag ? { tag } : {};

    const [total, posts] = await Promise.all([
      Post.countDocuments(query),
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username avatar")
        .lean(),
    ]);

    const postIds = posts.map((post) => post._id);
    const counts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todaysByTag = await Post.aggregate([
      { $match: { createdAt: { $gte: startOfDay } } },
      { $group: { _id: "$tag", count: { $sum: 1 } } },
    ]);

    res.json({
      posts: posts.map((post) =>
        toPostJSON(
          {
            ...post,
            voteByUser: post.voteByUser ? new Map(Object.entries(post.voteByUser)) : new Map(),
          },
          countMap.get(post._id.toString()) || 0
        )
      ),
      todaysByTag: Object.fromEntries(todaysByTag.map((entry) => [entry._id, entry.count])),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + posts.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ posts: [], users: [], tags: [] });

    const regex = new RegExp(escapeRegex(q), "i");
    const [posts, users, tags] = await Promise.all([
      Post.find({ $or: [{ title: regex }, { body: regex }, { tag: regex }] })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("author", "username avatar")
        .lean(),
      User.find({ username: regex }).sort({ username: 1 }).limit(20).lean(),
      Tag.find({ name: regex }).sort({ isDefault: -1, name: 1 }).limit(20).lean(),
    ]);

    const postIds = posts.map((post) => post._id);
    const counts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));

    res.json({
      posts: posts.map((post) =>
        toPostJSON(
          {
            ...post,
            voteByUser: post.voteByUser ? new Map(Object.entries(post.voteByUser)) : new Map(),
          },
          countMap.get(post._id.toString()) || 0
        )
      ),
      users: users.map((u) => ({ id: u._id.toString(), username: u.username, avatar: u.avatar, bio: u.bio || "" })),
      tags: tags.map((t) => t.name),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/users/:username/follow", requireAuth, async (req, res, next) => {
  try {
    const target = await User.findOne({ normalizedUsername: normalizeUsername(req.params.username) });
    if (!target) return res.status(404).json({ error: "User not found." });
    if (target._id.toString() === req.session.user.id) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    await Follow.updateOne(
      { follower: req.session.user.id, following: target._id },
      { $setOnInsert: { follower: req.session.user.id, following: target._id } },
      { upsert: true }
    );

    await createNotification(target._id, {
      type: "new_follower",
      title: "You have a new follower",
      body: `@${req.session.user.username} started following you`,
      refType: "user",
      refId: req.session.user.id,
    });

    const followersCount = await Follow.countDocuments({ following: target._id });
    res.json({ ok: true, followersCount });
  } catch (error) {
    next(error);
  }
});

router.delete("/users/:username/follow", requireAuth, async (req, res, next) => {
  try {
    const target = await User.findOne({ normalizedUsername: normalizeUsername(req.params.username) });
    if (!target) return res.status(404).json({ error: "User not found." });

    await Follow.deleteOne({ follower: req.session.user.id, following: target._id });
    const followersCount = await Follow.countDocuments({ following: target._id });
    res.json({ ok: true, followersCount });
  } catch (error) {
    next(error);
  }
});

router.get("/users/:username/followers", async (req, res, next) => {
  try {
    const target = await User.findOne({ normalizedUsername: normalizeUsername(req.params.username) }).lean();
    if (!target) return res.status(404).json({ error: "User not found." });

    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 20, maxLimit: 100 });
    const [total, rows] = await Promise.all([
      Follow.countDocuments({ following: target._id }),
      Follow.find({ following: target._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("follower", "username avatar")
        .lean(),
    ]);

    res.json({
      users: rows
        .map((row) => row.follower)
        .filter(Boolean)
        .map((u) => ({ id: u._id.toString(), username: u.username, avatar: u.avatar })),
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users/:username/following", async (req, res, next) => {
  try {
    const target = await User.findOne({ normalizedUsername: normalizeUsername(req.params.username) }).lean();
    if (!target) return res.status(404).json({ error: "User not found." });

    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 20, maxLimit: 100 });
    const [total, rows] = await Promise.all([
      Follow.countDocuments({ follower: target._id }),
      Follow.find({ follower: target._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("following", "username avatar")
        .lean(),
    ]);

    res.json({
      users: rows
        .map((row) => row.following)
        .filter(Boolean)
        .map((u) => ({ id: u._id.toString(), username: u.username, avatar: u.avatar })),
      pagination: { page, limit, total, hasMore: skip + rows.length < total },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reports", requireAuth, async (req, res, next) => {
  try {
    const targetType = String(req.body.targetType || "").trim();
    const targetId = String(req.body.targetId || "").trim();
    const reason = String(req.body.reason || "").trim().slice(0, 600);

    if (!ALLOWED_REPORT_TARGETS.has(targetType)) {
      return res.status(400).json({ error: "Invalid report target type." });
    }
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: "Invalid report target id." });
    }
    if (reason.length < 5) {
      return res.status(400).json({ error: "Report reason must be at least 5 characters." });
    }

    let exists = null;
    if (targetType === "post") exists = await Post.findById(targetId).lean();
    if (targetType === "comment") exists = await Comment.findById(targetId).lean();
    if (targetType === "user") exists = await User.findById(targetId).lean();
    if (!exists) return res.status(404).json({ error: "Target not found." });

    const report = await Report.create({
      reporter: req.session.user.id,
      targetType,
      targetId,
      reason,
    });

    res.status(201).json({ id: report._id.toString(), status: report.status });
  } catch (error) {
    next(error);
  }
});

router.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 20, maxLimit: 100 });
    const query = { user: req.session.user.id };

    const [total, rows, unreadCount] = await Promise.all([
      Notification.countDocuments(query),
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments({ user: req.session.user.id, readAt: null }),
    ]);

    res.json({
      notifications: rows.map(toNotificationJSON),
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + rows.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/notifications/:id/read", requireAuth, async (req, res, next) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, user: req.session.user.id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/notifications/read-all", requireAuth, async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.session.user.id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/badges", async (_req, res, next) => {
  try {
    const badges = await Badge.find({ active: true }).sort({ name: 1 }).lean();
    res.json({
      badges: badges.map((badge) => ({
        key: badge.key,
        name: badge.name,
        description: badge.description || "",
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users/:username/badges", async (req, res, next) => {
  try {
    const user = await User.findOne({ normalizedUsername: normalizeUsername(req.params.username) }).lean();
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ badges: user.badges || [] });
  } catch (error) {
    next(error);
  }
});

router.post("/verifications/upload", requireAuth, upload.single("proof"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  return res.status(201).json({ proofUrl: `/uploads/verifications/${req.file.filename}` });
});

router.post("/verifications", requireAuth, async (req, res, next) => {
  try {
    const badgeKey = String(req.body.badgeKey || "").trim();
    const proofUrl = String(req.body.proofUrl || "").trim();
    const note = String(req.body.note || "").trim().slice(0, 500);

    if (!badgeKey || !proofUrl) {
      return res.status(400).json({ error: "badgeKey and proofUrl are required." });
    }

    const badge = await Badge.findOne({ key: badgeKey, active: true }).lean();
    if (!badge) return res.status(404).json({ error: "Badge not found." });

    const item = await VerificationRequest.create({
      user: req.session.user.id,
      badgeKey,
      proofUrl,
      note,
      status: "pending",
    });

    res.status(201).json({ verification: toVerificationJSON(item) });
  } catch (error) {
    next(error);
  }
});

router.get("/verifications/me", requireAuth, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 20, maxLimit: 100 });
    const query = { user: req.session.user.id };

    const [total, rows] = await Promise.all([
      VerificationRequest.countDocuments(query),
      VerificationRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    res.json({
      verifications: rows.map(toVerificationJSON),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + rows.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/reports", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status || "").trim();
    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 20, maxLimit: 100 });
    const query = status ? { status } : {};

    const [total, rows] = await Promise.all([
      Report.countDocuments(query),
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reporter", "username")
        .populate("reviewedBy", "username")
        .lean(),
    ]);

    res.json({
      reports: rows.map((report) => ({
        id: report._id.toString(),
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        status: report.status,
        reviewNote: report.reviewNote || "",
        reporter: report.reporter?.username || "unknown",
        reviewedBy: report.reviewedBy?.username || null,
        reviewedAt: report.reviewedAt ? new Date(report.reviewedAt).getTime() : null,
        createdAt: new Date(report.createdAt).getTime(),
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + rows.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/reports/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.body.status || "").trim();
    const reviewNote = String(req.body.reviewNote || "").trim().slice(0, 600);
    const action = String(req.body.action || "").trim();

    if (!["open", "reviewed", "dismissed", "actioned"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found." });

    if (action === "remove_post" && report.targetType === "post") {
      await Comment.deleteMany({ post: report.targetId });
      await Post.findByIdAndDelete(report.targetId);
    }
    if (action === "remove_comment" && report.targetType === "comment") {
      await Comment.findByIdAndDelete(report.targetId);
    }
    if (action === "suspend_user_7d" && report.targetType === "user") {
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await User.findByIdAndUpdate(report.targetId, { suspendedUntil: until });
      await createNotification(report.targetId, {
        type: "account_suspension",
        title: "Your account has been suspended",
        body: "Your account is suspended for 7 days due to a moderation action.",
      });
    }
    if (action === "ban_user" && report.targetType === "user") {
      const until = new Date("9999-12-31T00:00:00.000Z");
      await User.findByIdAndUpdate(report.targetId, { suspendedUntil: until });
      await createNotification(report.targetId, {
        type: "account_ban",
        title: "Your account has been suspended",
        body: "Your account is suspended indefinitely due to a moderation action.",
      });
    }

    report.status = status;
    report.reviewNote = reviewNote;
    report.reviewedBy = req.session.user.id;
    report.reviewedAt = new Date();
    await report.save();

    await createNotification(report.reporter, {
      type: "report_update",
      title: "Your report was updated",
      body: `Report status: ${status}`,
      refType: "report",
      refId: report._id.toString(),
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/verifications", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status || "").trim();
    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 20, maxLimit: 100 });
    const query = status ? { status } : {};

    const [total, rows] = await Promise.all([
      VerificationRequest.countDocuments(query),
      VerificationRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username avatar badges")
        .populate("reviewedBy", "username")
        .lean(),
    ]);

    res.json({
      verifications: rows.map(toVerificationJSON),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + rows.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/verifications/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.body.status || "").trim();
    const reviewNote = String(req.body.reviewNote || "").trim().slice(0, 500);

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const item = await VerificationRequest.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Verification request not found." });

    item.status = status;
    item.reviewNote = reviewNote;
    item.reviewedBy = req.session.user.id;
    item.reviewedAt = new Date();
    await item.save();

    if (status === "approved") {
      await User.updateOne({ _id: item.user }, { $addToSet: { badges: item.badgeKey } });
      await createNotification(item.user, {
        type: "badge_approved",
        title: "Badge verification approved",
        body: `Your ${item.badgeKey} verification was approved.`,
        refType: "verification",
        refId: item._id.toString(),
      });
    }

    if (status === "rejected") {
      await createNotification(item.user, {
        type: "badge_rejected",
        title: "Badge verification rejected",
        body: reviewNote || `Your ${item.badgeKey} verification was rejected.`,
        refType: "verification",
        refId: item._id.toString(),
      });
    }

    const hydrated = await VerificationRequest.findById(item._id)
      .populate("user", "username")
      .populate("reviewedBy", "username")
      .lean();
    res.json({ verification: toVerificationJSON(hydrated) });
  } catch (error) {
    next(error);
  }
});

export default router;
