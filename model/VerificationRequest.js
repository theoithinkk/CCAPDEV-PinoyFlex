import mongoose from "mongoose";

const verificationRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    badgeKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    proofUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

verificationRequestSchema.index({ user: 1, createdAt: -1 });
verificationRequestSchema.index({ status: 1, createdAt: -1 });

const VerificationRequest = mongoose.model("VerificationRequest", verificationRequestSchema);
export default VerificationRequest;
