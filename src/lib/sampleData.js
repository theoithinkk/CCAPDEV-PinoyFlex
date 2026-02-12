import hcProgress1 from "../assets/hcpics/HCProgress1.png";
import hcProgress2 from "../assets/hcpics/HCProgress2.png";
import mealPrep from "../assets/hcpics/MealPrep.png";
const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.now();

export const SAMPLE_USERS = [
  { id: "u_theo", username: "theo", password: "1234", avatar: "/avatars/blank.png" },
  { id: "u_marc", username: "marc", password: "1234", avatar: "/avatars/mj.png" },
  { id: "u_nathaniel", username: "nathaniel", password: "1234", avatar: "/avatars/blank.png" },
  { id: "u_ian", username: "ian", password: "1234", avatar: "/avatars/blank.png" },
  { id: "u_arturo", username: "arturo", password: "1234", avatar: "/avatars/arturo.png" },
];

export const SAMPLE_POSTS = [
  {
    id: "sample_post_1",
    title: "Need help choosing a beginner split (3 days/week, 60 mins per session)",
    body:
      "I just started lifting last month and can only train Monday, Wednesday, and Friday after classes. I want to build strength first but still improve my physique. Right now I do random machines and I feel like I'm not progressing.\n\nWould you recommend full body 3x/week or a push/pull/legs setup adjusted for 3 days? If possible, can someone suggest a simple structure with sets/reps I can follow for at least 8 weeks?",
    tag: "Beginners",
    author: "theo",
    authorId: "u_theo",
    createdAt: now - DAY_MS,
    votes: 16,
    voteByUser: {},
    images: [],
    commentCount: 2,
  },
  {
    id: "sample_post_2",
    title: "Weekly meal prep for a cut (budget-friendly, high-protein) - feedback?",
    body:
      "I'm currently cutting from 76kg to around 70kg and trying to keep food costs manageable. This week's prep is chicken adobo (lean cut), garlic rice portions, boiled eggs, and mixed vegetables packed for 5 workdays.\n\nTarget is around 1700-1900 kcal/day with at least 130g protein. Posting this in case anyone has suggestions to improve variety without increasing cost too much.",
    tag: "Meal Prep",
    author: "marc",
    authorId: "u_marc",
    createdAt: now - 2 * DAY_MS,
    votes: 21,
    voteByUser: {},
    images: [mealPrep],
    commentCount: 1,
  },
  {
    id: "sample_post_3",
    title: "Deadlift form check: hips rise too early near lockout",
    body:
      "On my top sets (around RPE 8), my hips shoot up before the bar leaves the floor and the pull turns into a stiff-leg deadlift. I can still finish the rep, but my lower back gets smoked and bar speed drops hard.\n\nCurrent setup: conventional deadlift, flat shoes, mixed grip. If you've fixed this before, what cues or accessories helped most?",
    tag: "Form",
    author: "nathaniel",
    authorId: "u_nathaniel",
    createdAt: now - 3 * DAY_MS,
    votes: 11,
    voteByUser: {},
    images: [],
    commentCount: 1,
  },
  {
    id: "sample_post_4",
    title: "8-week body recomposition progress (photos) - from inconsistent to structured",
    body:
      "Sharing my 8-week progress for accountability. I stopped program-hopping and stuck to an upper/lower split, daily step goal, and a consistent sleep schedule. Biggest changes so far are waistline, shoulders, and overall energy.\n\nStill far from my long-term goal, but this is the first time my routine has felt sustainable. Posting two progress shots below. Open to feedback on what to prioritize next phase.",
    tag: "Physique",
    author: "ian",
    authorId: "u_ian",
    createdAt: now - 4 * DAY_MS,
    votes: 28,
    voteByUser: {},
    images: [hcProgress1, hcProgress2],
    commentCount: 1,
  },
  {
    id: "sample_post_5",
    title: "Hit my first 100kg bench after 5 months - what should my next milestone be?",
    body:
      "Finally pressed 100kg today at 78kg bodyweight. Started at 65kg for working sets and focused on technique, pause reps, and adding small jumps weekly. Super happy with this milestone.\n\nQuestion for more experienced lifters: should I focus next on adding reps at 100kg, pushing a heavier single, or bringing up weak points first (triceps and upper back)?",
    tag: "Success",
    author: "arturo",
    authorId: "u_arturo",
    createdAt: now - 5 * DAY_MS,
    votes: 24,
    voteByUser: {},
    images: [],
    commentCount: 0,
  },
];

export const SAMPLE_COMMENTS_BY_POST = {
  sample_post_1: [
    {
      id: "sample_comment_1",
      postId: "sample_post_1",
      author: "marc",
      body: "For your schedule, full body 3x/week is easier to recover from and progress on.",
      createdAt: now - DAY_MS + 60 * 60 * 1000,
    },
    {
      id: "sample_comment_2",
      postId: "sample_post_1",
      author: "arturo",
      body: "Keep each session simple: squat pattern, press, hinge, pull, then one core movement.",
      createdAt: now - DAY_MS + 2 * 60 * 60 * 1000,
    },
  ],
  sample_post_2: [
    {
      id: "sample_comment_3",
      postId: "sample_post_2",
      author: "theo",
      body: "Try rotating tofu and monggo with your chicken meals so cutting doesn't feel repetitive.",
      createdAt: now - 2 * DAY_MS + 45 * 60 * 1000,
    },
  ],
  sample_post_3: [
    {
      id: "sample_comment_4",
      postId: "sample_post_3",
      author: "ian",
      body: "Big cue that helped me: pull the slack out first, lock lats, then push the floor away.",
      createdAt: now - 3 * DAY_MS + 30 * 60 * 1000,
    },
  ],
  sample_post_4: [
    {
      id: "sample_comment_5",
      postId: "sample_post_4",
      author: "nathaniel",
      body: "Solid progress. If you want to keep recomping, keep protein high and track weekly average weight.",
      createdAt: now - 4 * DAY_MS + 20 * 60 * 1000,
    },
  ],
};
