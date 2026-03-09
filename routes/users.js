import express from "express";
import mongoose from "mongoose";
import User from "../model/User.js";
import Post from "../model/Post.js";

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  return next();
}

router.get("/", async (req, res, next) => {
  try {
    const users = await User.find().sort({ username: 1 }).lean();
    res.render("users", { title: "Users", users });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id).lean();
    if (!user) {
      req.session.destroy(() => res.redirect("/auth/login"));
      return;
    }

    const posts = await Post.find({ author: new mongoose.Types.ObjectId(req.session.user.id) })
      .sort({ createdAt: -1 })
      .lean();

    res.render("profile", {
      title: "My Profile",
      user,
      posts,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/me", requireAuth, async (req, res, next) => {
  try {
    const bio = (req.body.bio || "").trim();
    const avatar = (req.body.avatar || "").trim() || "/avatars/default.png";

    await User.findByIdAndUpdate(req.session.user.id, { bio, avatar });
    req.session.user.avatar = avatar;

    res.redirect("/users/me");
  } catch (error) {
    next(error);
  }
});

export default router;
