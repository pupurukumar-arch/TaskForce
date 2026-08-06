import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { UserRolesEnum } from "../utils/constants.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid access token");
  }
});

export const validateProjectPermission = (roles = []) => {
  return asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError(400, "project id is missing");
    }

    const project = await ProjectMember.findOne({
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(req.user._id),
    });

    if (!project) {
      throw new ApiError(400, "project not found");
    }

    const givenRole = project?.role;

    req.user.role = givenRole;

    if (!roles.includes(givenRole)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }

    next();
  });
};

// Project Pulse is intentionally limited to a Project Admin membership on the
// project in the URL. A global UI role is never trusted for this decision.
export const validateProjectPulseAdmin = asyncHandler(async (req, _res, next) => {
  const membership = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(req.params.projectId),
    user: new mongoose.Types.ObjectId(req.user._id),
  }).lean();

  if (!membership || membership.role !== UserRolesEnum.PROJECT_ADMIN) {
    throw new ApiError(403, "Project Pulse is available only to this project's Project Admin");
  }

  req.projectMembership = membership;
  next();
});
