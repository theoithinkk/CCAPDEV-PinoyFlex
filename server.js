import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./model/db.js";
import { seedDatabase } from "./model/seed.js";
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/users.js";
import apiRoutes from "./routes/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pinoyflex";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret_change_me";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.path = req.path;
  next();
});

app.get("/", async (req, res, next) => {
  try {
    const { default: Post } = await import("./model/Post.js");
    const { default: Comment } = await import("./model/Comment.js");
    const { default: User } = await import("./model/User.js");

    const [postsCount, commentsCount, usersCount, latestPosts] = await Promise.all([
      Post.countDocuments(),
      Comment.countDocuments(),
      User.countDocuments(),
      Post.find().sort({ createdAt: -1 }).limit(5).populate("author", "username").lean(),
    ]);

    res.render("index", {
      title: "PinoyFlex",
      stats: {
        users: usersCount,
        posts: postsCount,
        comments: commentsCount,
      },
      latestPosts,
    });
  } catch (error) {
    next(error);
  }
});

app.use("/auth", authRoutes);
app.use("/posts", postRoutes);
app.use("/users", userRoutes);
app.use("/api", apiRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    title: "Server Error",
    message: "An unexpected error occurred.",
  });
});

async function start() {
  await connectDB(MONGODB_URI);
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`PinoyFlex backend running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
