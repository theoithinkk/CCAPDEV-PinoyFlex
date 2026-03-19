import express from "express";
import bcrypt from "bcryptjs";
import User from "../model/User.js";

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("login", { title: "Login", error: null });
});

router.post("/login", async (req, res, next) => {
  try {
    const username = (req.body.username || "").trim();
    const password = req.body.password || "";

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).render("login", { title: "Login", error: "Invalid username or password." });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).render("login", { title: "Login", error: "Invalid username or password." });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      role: user.role || "user",
      badges: user.badges || [],
    };

    res.redirect("/");
  } catch (error) {
    next(error);
  }
});

router.get("/register", (req, res) => {
  res.render("register", { title: "Register", error: null });
});

router.post("/register", async (req, res, next) => {
  try {
    const username = (req.body.username || "").trim();
    const password = req.body.password || "";

    if (username.length < 3 || password.length < 4) {
      return res.status(400).render("register", {
        title: "Register",
        error: "Username must be at least 3 chars and password at least 4 chars.",
      });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).render("register", { title: "Register", error: "Username already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash, avatar: "/avatars/default.png", bio: "" });

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      role: user.role || "user",
      badges: user.badges || [],
    };

    res.redirect("/");
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

export default router;
