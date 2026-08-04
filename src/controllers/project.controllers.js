import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { deleteTaskAttachments } from "../utils/s3.js";
import { Subtask } from "../models/subtask.models.js";
import { ProjectNote } from "../models/note.models.js";
import { TaskComment } from "../models/taskcomment.models.js";
import { Activity } from "../models/activity.models.js";
import { Notification } from "../models/notification.models.js";
import { ProjectInvite } from "../models/projectinvite.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { getTaskSummaryForUser } from "../utils/task-summary.js";
import { recordActivity } from "../utils/activity.js";
import { createNotification } from "../utils/notification.js";
import { projectInvitationMailgenContent, sendEmail } from "../utils/mail.js";
import crypto from "crypto";

const getProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "project",
        pipeline: [
          {
            $lookup: {
              from: "projectmembers",
              localField: "_id",
              foreignField: "project",
              as: "projectmembers",
            },
          },
          {
            $addFields: {
              members: {
                $size: "$projectmembers",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$project",
    },
    {
      $project: {
        project: {
          _id: "$project._id",
          name: "$project.name",
          description: "$project.description",
          members: "$project.members",
          createdAt: "$project.createdAt",
          createdBy: "$project.createdBy",
        },
        role: 1,
        _id: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project fetched successfully"));
});

const getProjectProgress = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ project: req.params.projectId })
    .select("assignedTo status dueDate")
    .lean();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const statusCounts = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
  const isOverdue = (task) => task.status !== "done" && task.dueDate && task.dueDate < startOfToday;
  const summarize = (taskList) => ({
    totalTasks: taskList.length,
    completedTasks: taskList.filter((task) => task.status === "done").length,
    completedPercentage: taskList.length ? Math.round((taskList.filter((task) => task.status === "done").length / taskList.length) * 100) : 0,
    overdueTasks: taskList.filter(isOverdue).length,
  });
  tasks.forEach((task) => { statusCounts[task.status] += 1; });

  const isManager = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(req.user.role);
  const myTasks = tasks.filter((task) => task.assignedTo?.toString() === req.user._id.toString());
  const data = {
    scope: isManager ? "project" : "personal",
    summary: summarize(isManager ? tasks : myTasks),
    statusCounts: isManager
      ? statusCounts
      : myTasks.reduce((counts, task) => ({ ...counts, [task.status]: counts[task.status] + 1 }), { todo: 0, in_progress: 0, in_review: 0, done: 0 }),
  };

  if (isManager) {
    const members = await ProjectMember.find({ project: req.params.projectId }).populate("user", "username fullName").lean();
    data.memberWorkload = members.map((member) => ({
      user: member.user,
      role: member.role,
      ...summarize(tasks.filter((task) => task.assignedTo?.toString() === member.user._id.toString())),
    }));
  }

  return res.status(200).json(new ApiResponse(200, data, "Project progress fetched successfully"));
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const project = await Project.create({
    name,
    description,
    createdBy: new mongoose.Types.ObjectId(req.user._id),
  });

  await ProjectMember.create({
    user: new mongoose.Types.ObjectId(req.user._id),
    project: new mongoose.Types.ObjectId(project._id),
    role: UserRolesEnum.ADMIN,
  });

  await recordActivity({
    project: project._id,
    actor: req.user._id,
    type: "project_created",
    message: `Created project: ${project.name}`,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, project, "Project created Successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { projectId } = req.params;

  const project = await Project.findByIdAndUpdate(
    projectId,
    {
      name,
      description,
    },
    { new: true },
  );

  if (!project) {
    throw new ApiError(404, "Project not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const tasks = await Task.find({ project: projectId }).select("_id attachments");
  const taskIds = tasks.map((task) => task._id);

  await deleteTaskAttachments(tasks.flatMap((task) => task.attachments || []));

  await Promise.all([
    Subtask.deleteMany({ task: { $in: taskIds } }),
    TaskComment.deleteMany({ task: { $in: taskIds } }),
    Task.deleteMany({ project: projectId }),
    ProjectNote.deleteMany({ project: projectId }),
    ProjectMember.deleteMany({ project: projectId }),
    Activity.deleteMany({ project: projectId }),
    Notification.deleteMany({ project: projectId }),
    ProjectInvite.deleteMany({ project: projectId }),
  ]);

  await project.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project deleted successfully"));
});

const addMembersToProject = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const { projectId } = req.params;
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  const project = await Project.findById(projectId).select("name");
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const existingMembership = await ProjectMember.exists({
    user: user._id,
    project: projectId,
  });

  await ProjectMember.findOneAndUpdate(
    {
      user: new mongoose.Types.ObjectId(user._id),
      project: new mongoose.Types.ObjectId(projectId),
    },
    {
      user: new mongoose.Types.ObjectId(user._id),
      project: new mongoose.Types.ObjectId(projectId),
      role: role,
    },
    {
      new: true,
      upsert: true,
    },
  );

  await recordActivity({
    project: projectId,
    actor: req.user._id,
    type: "project_member_added",
    message: `Added ${user.username} to the project as ${role}`,
    details: { user: user._id, role },
  });

  if (!existingMembership && user._id.toString() !== req.user._id.toString()) {
    await createNotification({
      recipient: user._id,
      project: project._id,
      type: "project_member_added",
      message: `You were added to the project: ${project.name}`,
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Project member added successfully"));
});

const inviteUnregisteredMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const { projectId } = req.params;
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "This user is already registered. Add them as a project member instead.");
  }

  const project = await Project.findById(projectId).select("name");
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const invitationToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(invitationToken)
    .digest("hex");
  const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await ProjectInvite.findOneAndUpdate(
    { project: projectId, email: email.toLowerCase() },
    {
      project: projectId,
      email: email.toLowerCase(),
      role,
      invitedBy: req.user._id,
      token: hashedToken,
      tokenExpiry,
      acceptedAt: undefined,
    },
    { new: true, upsert: true, runValidators: true },
  );

  const invitationBaseUrl =
    process.env.PROJECT_INVITE_REDIRECT_URL || `${process.env.CORS_ORIGIN}/register`;
  const invitationUrl = `${invitationBaseUrl}?invite=${invitationToken}`;

  await sendEmail({
    email,
    subject: `Invitation to join ${project.name}`,
    mailgenContent: projectInvitationMailgenContent(project.name, invitationUrl),
  });

  await recordActivity({
    project: projectId,
    actor: req.user._id,
    type: "project_invitation_sent",
    message: `Sent a project invitation to ${email}`,
    details: { email, role },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Project invitation sent successfully"));
});

const acceptProjectInvitation = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.invitationToken)
    .digest("hex");
  const invitation = await ProjectInvite.findOne({
    token: hashedToken,
    tokenExpiry: { $gt: Date.now() },
    acceptedAt: { $exists: false },
  }).select("+token");

  if (!invitation) {
    throw new ApiError(400, "Invitation is invalid or expired");
  }
  if (invitation.email !== req.user.email) {
    throw new ApiError(403, "This invitation belongs to a different email address");
  }

  await ProjectMember.findOneAndUpdate(
    { project: invitation.project, user: req.user._id },
    { project: invitation.project, user: req.user._id, role: invitation.role },
    { new: true, upsert: true, runValidators: true },
  );

  invitation.acceptedAt = new Date();
  await invitation.save();

  await recordActivity({
    project: invitation.project,
    actor: req.user._id,
    type: "project_invitation_accepted",
    message: `${req.user.username} accepted a project invitation`,
    details: { user: req.user._id, role: invitation.role },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Project invitation accepted successfully"));
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const projectMembers = await ProjectMember.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        user: {
          $arrayElemAt: ["$user", 0],
        },
      },
    },
    {
      $project: {
        project: 1,
        user: 1,
        role: 1,
        createdAt: 1,
        updatedAt: 1,
        _id: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, projectMembers, "Project members fetched"));
});

const getMemberTaskSummary = asyncHandler(async (req, res) => {
  const projectMember = await ProjectMember.findOne({
    project: req.params.projectId,
    user: req.params.userId,
  }).populate("user", "username fullName avatar skills");

  if (!projectMember) {
    throw new ApiError(404, "Project member not found");
  }

  const summary = await getTaskSummaryForUser(projectMember.user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      { member: projectMember.user, ...summary },
      "Member task summary fetched successfully",
    ),
  );
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const { newRole } = req.body;

  if (!AvailableUserRole.includes(newRole)) {
    throw new ApiError(400, "Invalid Role");
  }

  let projectMember = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!projectMember) {
    throw new ApiError(400, "Project member not found");
  }

  if (
    projectMember.role === UserRolesEnum.ADMIN &&
    newRole !== UserRolesEnum.ADMIN
  ) {
    const adminCount = await ProjectMember.countDocuments({
      project: projectMember.project,
      role: UserRolesEnum.ADMIN,
    });

    if (adminCount <= 1) {
      throw new ApiError(
        409,
        "A project must have at least one Admin. Add or promote another Admin first.",
      );
    }
  }

  projectMember = await ProjectMember.findByIdAndUpdate(
    projectMember._id,
    {
      role: newRole,
    },
    { new: true },
  );

  if (!projectMember) {
    throw new ApiError(400, "Project member not found");
  }

  await recordActivity({
    project: projectId,
    actor: req.user._id,
    type: "project_member_role_updated",
    message: `Updated a project member role to ${newRole}`,
    details: { user: userId, role: newRole },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMember,
        "Project member role updated successfully",
      ),
    );
});

const deleteMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  let projectMember = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!projectMember) {
    throw new ApiError(400, "Project member not found");
  }

  if (projectMember.role === UserRolesEnum.ADMIN) {
    const adminCount = await ProjectMember.countDocuments({
      project: projectMember.project,
      role: UserRolesEnum.ADMIN,
    });

    if (adminCount <= 1) {
      throw new ApiError(
        409,
        "A project must have at least one Admin. Add or promote another Admin first.",
      );
    }
  }

  await recordActivity({
    project: projectId,
    actor: req.user._id,
    type: "project_member_removed",
    message: "Removed a member from the project",
    details: { user: userId },
  });

  projectMember = await ProjectMember.findByIdAndDelete(projectMember._id);

  if (!projectMember) {
    throw new ApiError(400, "Project member not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMember,
        "Project member deleted successfully",
      ),
    );
});

export {
  addMembersToProject,
  acceptProjectInvitation,
  createProject,
  deleteMember,
  getProjects,
  getProjectProgress,
  inviteUnregisteredMember,
  getProjectById,
  getProjectMembers,
  getMemberTaskSummary,
  updateProject,
  deleteProject,
  updateMemberRole,
};
