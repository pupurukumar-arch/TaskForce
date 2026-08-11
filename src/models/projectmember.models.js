import mongoose, { Schema } from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const projectMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    role: {
      type: String,
      enum: AvailableUserRole,
      default: UserRolesEnum.MEMBER,
    },
  },
  { timestamps: true },
);

// Speeds role checks and prevents the same user from joining a project twice.
projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });
// Supports the dashboard query that starts with the signed-in user.
projectMemberSchema.index({ user: 1, project: 1 });

export const ProjectMember = mongoose.model(
  "ProjectMember",
  projectMemberSchema,
);
