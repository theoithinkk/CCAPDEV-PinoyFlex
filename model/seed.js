import bcrypt from "bcryptjs";
import User from "./User.js";
import Post from "./Post.js";
import Comment from "./Comment.js";
import Tag from "./Tag.js";
import Badge from "./Badge.js";
import Follow from "./Follow.js";
import Notification from "./Notification.js";
import WorkoutLog from "./WorkoutLog.js";
import Report from "./Report.js";
import VerificationRequest from "./VerificationRequest.js";

const SAMPLE_USERS = [
  {
    username: "theo",
    password: "1234",
    avatar: "/avatars/blank.png",
    bio: "Coach and admin. Focused on clear progression and clean form.",
    role: "admin",
    badges: ["bench-225"],
  },
  {
    username: "marc",
    password: "1234",
    avatar: "/avatars/mj.png",
    bio: "Meal prep and sustainable cutting.",
    role: "user",
    badges: ["bodyweight-pullup-20"],
  },
  {
    username: "nathaniel",
    password: "1234",
    avatar: "/avatars/blank.png",
    bio: "Form checks and strength block planning.",
    role: "user",
    badges: [],
  },
  {
    username: "ian",
    password: "1234",
    avatar: "/avatars/blank.png",
    bio: "Tracking body recomposition week by week.",
    role: "user",
    badges: [],
  },
  {
    username: "arturo",
    password: "1234",
    avatar: "/avatars/arturo.png",
    bio: "Powerlifting milestones and recovery notes.",
    role: "user",
    badges: ["squat-315"],
  },
  {
    username: "pinoyflex_editorial",
    password: "1234",
    avatar: "/avatars/blank.png",
    bio: "Official PinoyFlex editorial desk.",
    role: "editorial",
    badges: [],
  },
];

const DEFAULT_TAGS = ["Form", "Meal Prep", "Physique", "Beginners", "General", "Success"];

const DEFAULT_BADGES = [
  {
    key: "bench-225",
    name: "225 lb Bench",
    description: "Verified 225 lb bench press milestone.",
    imageUrl: "/uploads/badges/bench225badge.png",
  },
  {
    key: "squat-315",
    name: "315 lb Squat",
    description: "Verified 315 lb squat milestone.",
    imageUrl: "/uploads/badges/squat315badge.png",
  },
  {
    key: "deadlift-405",
    name: "405 lb Deadlift",
    description: "Verified 405 lb deadlift milestone.",
    imageUrl: "/uploads/badges/deadlift405badge.png",
  },
  { key: "bodyweight-pullup-20", name: "20 Pull-Ups", description: "Verified strict 20 pull-ups." },
];

async function syncDefaultBadges() {
  await Promise.all(
    DEFAULT_BADGES.map((badge) =>
      Badge.updateOne(
        { key: badge.key },
        {
          $set: {
            name: badge.name,
            description: badge.description,
            imageUrl: badge.imageUrl || "",
            active: true,
          },
        },
        { upsert: true }
      )
    )
  );
}

const SAMPLE_POSTS = [
  {
    key: "p1",
    title: "Need help choosing a beginner split",
    body: "I can train 3 days per week. Should I use full body or an adjusted upper/lower split?",
    tag: "Beginners",
    author: "theo",
    images: [],
    votes: 0,
  },
  {
    key: "p2",
    title: "Weekly meal prep for a budget cut",
    body: "Any low-cost protein swaps that keep meals easy to repeat?",
    tag: "Meal Prep",
    author: "marc",
    images: [],
    votes: 0,
  },
  {
    key: "p3",
    title: "Deadlift form check near lockout",
    body: "My hips shoot up first. What cue fixed this for you?",
    tag: "Form",
    author: "nathaniel",
    images: [],
    votes: 0,
  },
  {
    key: "p4",
    title: "8-week recomposition update",
    body: "Tracked my calories and volume. Sharing progress and what changed.",
    tag: "Physique",
    author: "ian",
    images: [],
    votes: 0,
  },
  {
    key: "p5",
    title: "First 100kg bench milestone",
    body: "Hit 100kg bench today. Should I start a peaking block next?",
    tag: "Success",
    author: "arturo",
    images: [],
    votes: 0,
  },
  {
    key: "p6",
    title: "Upper/lower template feedback",
    body: "Looking for feedback on exercise order and weekly set balance.",
    tag: "General",
    author: "theo",
    images: [],
    votes: 0,
  },
  {
    key: "news1",
    title: "Push Pull Legs no longer default for intermediates? New 12-week trial says periodized upper/lower may edge ahead",
    body: "A controlled 12-week intervention tracked 96 intermediate lifters across two commonly used split models: a classic push/pull/legs routine and a periodized upper/lower schedule. The researchers reported that both groups improved lean mass, but the periodized upper/lower group showed stronger average hypertrophy markers in the quads and upper back while maintaining similar strength progression. Weekly fatigue scores were also slightly lower in the periodized group. The authors note that this does not make PPL obsolete. Their conclusion focuses on workload management and progression quality for intermediates with limited recovery bandwidth. Practical takeaway: if progression has stalled on a static split, a periodized upper/lower setup may offer a better stimulus-to-fatigue ratio without increasing training days.",
    tag: "General",
    author: "pinoyflex_editorial",
    images: [],
    votes: 0,
    postType: "news",
    newsReference: "M. Reyes, J. Dela Cruz, T. Navarro (2026). Split Strategy and Hypertrophy Outcomes in Intermediate Lifters. Journal of Applied Strength Science, 14(2), 77-91.",
  },
];

const SAMPLE_COMMENTS = [
  { post: "p1", author: "marc", body: "Full body is usually easier to recover from at 3x/week." },
  { post: "p1", author: "arturo", body: "Anchor each day around squat, press, hinge, and pull." },
  { post: "p2", author: "ian", body: "I rotate eggs, tofu, and chicken to keep cost down." },
  { post: "p3", author: "theo", body: "Brace harder before break-off and keep the bar close." },
  { post: "p4", author: "nathaniel", body: "Nice progress. Keep sleep and protein consistent." },
  { post: "p5", author: "marc", body: "Great work. A short peaking block can make sense now." },
  { post: "p6", author: "arturo", body: "Volume looks good. Keep compounds first while fresh." },
];

const SAMPLE_FOLLOWS = [
  { follower: "marc", following: "theo" },
  { follower: "ian", following: "theo" },
  { follower: "arturo", following: "theo" },
  { follower: "theo", following: "marc" },
  { follower: "nathaniel", following: "arturo" },
  { follower: "marc", following: "ian" },
];

const SAMPLE_LOGS = [
  { user: "theo", dateKey: "2026-03-06", text: "Upper day, paused bench" },
  { user: "theo", dateKey: "2026-03-08", text: "Mobility and light rows" },
  { user: "marc", dateKey: "2026-03-07", text: "Meal prep and cardio" },
  { user: "ian", dateKey: "2026-03-08", text: "Lower day, RDL focus" },
  { user: "arturo", dateKey: "2026-03-09", text: "Bench volume session" },
];

function shouldSeed(counts) {
  return (
    counts.users < 6 ||
    counts.posts < 7 ||
    counts.comments < 7 ||
    counts.tags < DEFAULT_TAGS.length ||
    counts.badges < DEFAULT_BADGES.length ||
    counts.follows < 4
  );
}

export async function seedDatabase(options = {}) {
  const { force = false } = options;

  const counts = {
    users: await User.countDocuments(),
    posts: await Post.countDocuments(),
    comments: await Comment.countDocuments(),
    tags: await Tag.countDocuments(),
    badges: await Badge.countDocuments(),
    follows: await Follow.countDocuments(),
    notifications: await Notification.countDocuments(),
    workoutLogs: await WorkoutLog.countDocuments(),
    reports: await Report.countDocuments(),
    verifications: await VerificationRequest.countDocuments(),
  };

  if (!force && !shouldSeed(counts)) {
    await syncDefaultBadges();
    console.log("Seed skipped: dataset already present.");
    return { seeded: false, reason: "already_seeded", counts };
  }

  await Promise.all([
    Comment.deleteMany({}),
    Post.deleteMany({}),
    Follow.deleteMany({}),
    Notification.deleteMany({}),
    WorkoutLog.deleteMany({}),
    Report.deleteMany({}),
    VerificationRequest.deleteMany({}),
    Tag.deleteMany({}),
    Badge.deleteMany({}),
    User.deleteMany({}),
  ]);

  await Tag.insertMany(DEFAULT_TAGS.map((name) => ({ name, isDefault: true })));
  await syncDefaultBadges();

  const userMap = new Map();
  for (const user of SAMPLE_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const created = await User.create({
      username: user.username,
      passwordHash,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      badges: user.badges,
      recentSearches: [],
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
      images: post.images || [],
      votes: post.votes ?? 0,
      voteByUser: {},
      postType: post.postType || "post",
      newsReference: post.newsReference || "",
    });
    postMap.set(post.key, created);
  }

  for (const item of SAMPLE_COMMENTS) {
    await Comment.create({
      post: postMap.get(item.post)._id,
      author: userMap.get(item.author)._id,
      body: item.body,
    });
  }

  for (const row of SAMPLE_FOLLOWS) {
    await Follow.create({
      follower: userMap.get(row.follower)._id,
      following: userMap.get(row.following)._id,
    });
  }

  for (const row of SAMPLE_LOGS) {
    await WorkoutLog.create({
      user: userMap.get(row.user)._id,
      dateKey: row.dateKey,
      text: row.text,
    });
  }

  const p1 = postMap.get("p1");
  const p3 = postMap.get("p3");
  const p5 = postMap.get("p5");

  p1.voteByUser = new Map([
    [userMap.get("marc")._id.toString(), 1],
    [userMap.get("ian")._id.toString(), -1],
  ]);
  p1.votes = 0;
  p3.voteByUser = new Map([
    [userMap.get("theo")._id.toString(), 1],
    [userMap.get("arturo")._id.toString(), -1],
  ]);
  p3.votes = 0;
  p5.voteByUser = new Map([
    [userMap.get("marc")._id.toString(), 1],
    [userMap.get("nathaniel")._id.toString(), -1],
  ]);
  p5.votes = 0;
  await Promise.all([p1.save(), p3.save(), p5.save()]);

  const [firstComment, theoOnP3] = await Promise.all([
    Comment.findOne({}).sort({ createdAt: 1 }).lean(),
    Comment.findOne({ author: userMap.get("theo")._id, post: postMap.get("p3")._id }),
  ]);

  const notifications = [
    {
      user: userMap.get("theo")._id,
      type: "new_follower",
      title: "You have a new follower",
      body: "@marc started following you",
      refType: "user",
      refId: userMap.get("marc")._id.toString(),
      readAt: null,
    },
    {
      user: userMap.get("marc")._id,
      type: "new_comment",
      title: "New comment on your post",
      body: "@ian commented on \"Weekly meal prep for a budget cut\"",
      refType: "post",
      refId: postMap.get("p2")._id.toString(),
      readAt: null,
    },
    {
      user: userMap.get("nathaniel")._id,
      type: "new_comment",
      title: "New comment on your post",
      body: "@theo commented on \"Deadlift form check near lockout\"",
      refType: "post",
      refId: postMap.get("p3")._id.toString(),
      readAt: new Date(),
    },
    {
      user: userMap.get("arturo")._id,
      type: "report_update",
      title: "Your report was updated",
      body: "Report status: reviewed",
      refType: "report",
      refId: "seed-report",
      readAt: new Date(),
    },
  ];
  await Notification.insertMany(notifications);

  const seedReport = await Report.create({
    reporter: userMap.get("arturo")._id,
    targetType: "comment",
    targetId: firstComment?._id?.toString() || userMap.get("marc")._id.toString(),
    reason: "Spam-like repeated promo wording.",
    status: "reviewed",
    reviewNote: "Checked and no action needed.",
    reviewedBy: userMap.get("theo")._id,
    reviewedAt: new Date(),
  });

  const seedVerification = await VerificationRequest.create({
    user: userMap.get("marc")._id,
    badgeKey: "bodyweight-pullup-20",
    proofUrl: "/uploads/verifications/sample-proof.mp4",
    note: "Sample verification request for local dev.",
    status: "pending",
  });

  await Notification.updateOne(
    { refId: "seed-report", user: userMap.get("arturo")._id },
    { $set: { refId: seedReport._id.toString() } }
  );

  await Notification.create({
    user: userMap.get("marc")._id,
    type: "badge_submitted",
    title: "Verification submitted",
    body: "Your badge verification is pending review.",
    refType: "verification",
    refId: seedVerification._id.toString(),
    readAt: null,
  });

  if (theoOnP3) {
    await Notification.create({
      user: userMap.get("nathaniel")._id,
      type: "new_comment",
      title: "New comment on your post",
      body: "@theo commented on your post",
      refType: "comment",
      refId: theoOnP3._id.toString(),
      readAt: null,
    });
  }

  console.log("Database seeded with users, posts, comments, follows, votes, notifications, logs, reports, and verifications.");
  return { seeded: true };
}
