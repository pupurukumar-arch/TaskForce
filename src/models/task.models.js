import mongoose, { Schema } from "mongoose";
import {
  AvailableTaskDifficulties,
  AvailableTaskPriorities,
  AvailableTaskStatues,
  TaskDifficultyEnum,
  TaskPriorityEnum,
  TaskStatusEnum,
} from "../utils/constants.js";

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: AvailableTaskStatues,
      default: TaskStatusEnum.TODO,
    },
    difficulty: {
      type: String,
      enum: AvailableTaskDifficulties,
      default: TaskDifficultyEnum.MEDIUM,
    },
    priority: {
      type: String,
      enum: AvailableTaskPriorities,
      default: TaskPriorityEnum.MEDIUM,
    },
    dueDate: {
      type: Date,
    },
    submittedForReviewBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    submittedForReviewAt: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    attachments: {
      type: [
        {
          key: String,
          url: String,
          mimetype: String,
          size: Number,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// Matches the project board query: filter by project, newest task first.
taskSchema.index({ project: 1, createdAt: -1 });
// Matches personal deadline and calendar queries for an assignee, ordered by date.
taskSchema.index({ assignedTo: 1, dueDate: 1 });
// Supports project-specific due-date summaries without scanning every task.
taskSchema.index({ project: 1, assignedTo: 1, dueDate: 1, status: 1 });

export const Task = mongoose.model("Task", taskSchema);
