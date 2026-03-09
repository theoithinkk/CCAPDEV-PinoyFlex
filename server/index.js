require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Route imports
const usersRouter = require("./routes/users");
const postsRouter = require("./routes/posts");
const commentsRouter = require("./routes/comments");
const tagsRouter = require("./routes/tags");
const workoutLogsRouter = require("./routes/workoutLogs");

const app  = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/users", usersRouter);
app.use("/api/posts", postsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/workout-logs", workoutLogsRouter);

// Checker
app.get("/", (req, res) => res.json({ status: "API running" }));

app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});