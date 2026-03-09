import bcrypt from "bcryptjs";
import User from "./User.js";
import Post from "./Post.js";
import Comment from "./Comment.js";
import Tag from "./Tag.js";

const SAMPLE_USERS = [
  { username: "theo", password: "1234", avatar: "/avatars/blank.png", bio: "Beginner lifter in Manila." },
  { username: "marc", password: "1234", avatar: "/avatars/mj.png", bio: "Meal prep and cutting tips." },
  { username: "nathaniel", password: "1234", avatar: "/avatars/blank.png", bio: "Form-check enthusiast." },
  { username: "ian", password: "1234", avatar: "/avatars/blank.png", bio: "Tracking recomposition progress." },
  { username: "arturo", password: "1234", avatar: "/avatars/arturo.png", bio: "Powerlifting milestones." },
];

const SAMPLE_POSTS = [
  {
    key: "p1",
    title: "Need help choosing a beginner split",
    body: "I can train 3 days/week. Should I run full body or an adjusted PPL?",
    tag: "Beginners",
    author: "theo",
    votes: 16,
  },
  {
    key: "p2",
    title: "Weekly meal prep for a budget cut",
    body: "Can I improve this 1700-1900 kcal setup without increasing cost?",
    tag: "Meal Prep",
    author: "marc",
    votes: 21,
  },
  {
    key: "p3",
    title: "Deadlift form check",
    body: "My hips rise too early near lockout. Which cues fixed this for you?",
    tag: "Form",
    author: "nathaniel",
    votes: 11,
  },
  {
    key: "p4",
    title: "8-week recomposition progress",
    body: "Sharing progress after staying on a structured upper/lower split.",
    tag: "Physique",
    author: "ian",
    votes: 28,
  },
  {
    key: "p5",
    title: "First 100kg bench milestone",
    body: "Hit 100kg bench today. What should the next training milestone be?",
    tag: "Success",
    author: "arturo",
    votes: 24,
  },
];

const SAMPLE_COMMENTS = [
  { post: "p1", author: "marc", body: "Full body is easier to recover from at 3x/week." },
  { post: "p1", author: "arturo", body: "Use squat, press, hinge, pull, then core each session." },
  { post: "p2", author: "theo", body: "Rotate tofu and monggo to improve variety." },
  { post: "p3", author: "ian", body: "Pull slack first, brace hard, then push the floor away." },
  { post: "p4", author: "nathaniel", body: "Keep protein high and track weekly average weight." },
];

const DEFAULT_TAGS = ["Form", "Meal Prep", "Physique", "Beginners", "General", "Success"];

export async function seedDatabase() {
  const usersCount = await User.countDocuments();
  const postsCount = await Post.countDocuments();
  const commentsCount = await Comment.countDocuments();
  const tagsCount = await Tag.countDocuments();

  if (usersCount >= 5 && postsCount >= 5 && commentsCount >= 5 && tagsCount >= DEFAULT_TAGS.length) {
    return;
  }

  await Comment.deleteMany({});
  await Post.deleteMany({});
  await User.deleteMany({});

  const userMap = new Map();
  for (const user of SAMPLE_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const created = await User.create({
      username: user.username,
      passwordHash,
      avatar: user.avatar,
      bio: user.bio,
    });
    userMap.set(user.username, created);
  }

  const postMap = new Map();
  for (const post of SAMPLE_POSTS) {
    const created = await Post.create({
      title: post.title,
      body: post.body,
      tag: post.tag,
      author: userMap.get(post.author)._id,
      votes: post.votes,
    });
    postMap.set(post.key, created);
  }

  for (const comment of SAMPLE_COMMENTS) {
    await Comment.create({
      post: postMap.get(comment.post)._id,
      author: userMap.get(comment.author)._id,
      body: comment.body,
    });
  }

  await Tag.deleteMany({});
  await Tag.insertMany(DEFAULT_TAGS.map((name) => ({ name, isDefault: true })));

  console.log("Database seeded with sample users, posts, and comments");
}
