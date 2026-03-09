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
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
