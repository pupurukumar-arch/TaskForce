import mongoose, { Schema } from "mongoose";

const activitySchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

// Matches a project's activity timeline, newest first.
activitySchema.index({ project: 1, createdAt: -1 });

export const Activity = mongoose.model("Activity", activitySchema);
