import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    normalizedUsername: {
      type: String,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "/avatars/default.png",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 200,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    badges: {
      type: [String],
      default: [],
    },
    suspendedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre("validate", function normalizeUsername(next) {
  if (typeof this.username === "string") {
    this.normalizedUsername = this.username.trim().toLowerCase();
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
