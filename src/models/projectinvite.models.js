import mongoose, { Schema } from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const projectInviteSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: AvailableUserRole,
      default: UserRolesEnum.MEMBER,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      select: false,
    },
    tokenExpiry: {
      type: Date,
      required: true,
    },
    acceptedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

projectInviteSchema.index({ project: 1, email: 1 }, { unique: true });

export const ProjectInvite = mongoose.model("ProjectInvite", projectInviteSchema);
