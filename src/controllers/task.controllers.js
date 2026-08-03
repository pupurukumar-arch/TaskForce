import { ProjectMember } from "../models/projectmember.models.js";
import { Subtask } from "../models/subtask.models.js";
import { Task } from "../models/task.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { UserRolesEnum } from "../utils/constants.js";

const getTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ project: req.params.projectId })
    .populate("assignedTo", "avatar username fullName")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, status } = req.body;

  if (assignedTo) {
    const member = await ProjectMember.exists({
      project: req.params.projectId,
      user: assignedTo,
    });
    if (!member) throw new ApiError(400, "Assignee must be a project member");
  }

  const attachments = (req.files || []).map((file) => ({
    url: `${req.protocol}://${req.get("host")}/images/${file.filename}`,
    mimetype: file.mimetype,
    size: file.size,
  }));

  const task = await Task.create({
    title,
    description,
    project: req.params.projectId,
    assignedTo: assignedTo || undefined,
    assignedBy: req.user._id,
    status,
    attachments,
  });

  return res.status(201).json(new ApiResponse(201, task, "Task created successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.taskId, project: req.params.projectId })
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName");

  if (!task) throw new ApiError(404, "Task not found");

  const subtasks = await Subtask.find({ task: task._id })
    .populate("createdBy", "avatar username fullName")
    .sort({ createdAt: 1 });

  return res.status(200).json(new ApiResponse(200, { ...task.toObject(), subtasks }, "Task fetched successfully"));
});

const updateTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, status } = req.body;
  const task = await Task.findOne({ _id: req.params.taskId, project: req.params.projectId });

  if (!task) throw new ApiError(404, "Task not found");

  if (assignedTo) {
    const member = await ProjectMember.exists({ project: req.params.projectId, user: assignedTo });
    if (!member) throw new ApiError(400, "Assignee must be a project member");
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (assignedTo !== undefined) task.assignedTo = assignedTo || undefined;
  if (status !== undefined) task.status = status;
  task.attachments.push(
    ...(req.files || []).map((file) => ({
      url: `${req.protocol}://${req.get("host")}/images/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size,
    })),
  );
  await task.save();

  return res.status(200).json(new ApiResponse(200, task, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.taskId, project: req.params.projectId });
  if (!task) throw new ApiError(404, "Task not found");

  await Subtask.deleteMany({ task: task._id });
  return res.status(200).json(new ApiResponse(200, task, "Task deleted successfully"));
});

const createSubTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.taskId, project: req.params.projectId });
  if (!task) throw new ApiError(404, "Task not found");

  const subtask = await Subtask.create({
    title: req.body.title,
    task: task._id,
    createdBy: req.user._id,
  });

  return res.status(201).json(new ApiResponse(201, subtask, "Subtask created successfully"));
});

const updateSubTask = asyncHandler(async (req, res) => {
  const subtask = await Subtask.findById(req.params.subTaskId);
  if (!subtask) throw new ApiError(404, "Subtask not found");

  const task = await Task.findOne({ _id: subtask.task, project: req.params.projectId });
  if (!task) throw new ApiError(404, "Task not found");

  const isManager = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(req.user.role);
  if (req.body.title !== undefined && !isManager) {
    throw new ApiError(403, "Only project administrators can change a subtask title");
  }
  if (req.body.title !== undefined) subtask.title = req.body.title;
  if (req.body.isCompleted !== undefined) subtask.isCompleted = req.body.isCompleted;
  await subtask.save();

  return res.status(200).json(new ApiResponse(200, subtask, "Subtask updated successfully"));
});

const deleteSubTask = asyncHandler(async (req, res) => {
  const subtask = await Subtask.findById(req.params.subTaskId);
  if (!subtask) throw new ApiError(404, "Subtask not found");

  const task = await Task.findOne({ _id: subtask.task, project: req.params.projectId });
  if (!task) throw new ApiError(404, "Task not found");

  await subtask.deleteOne();
  return res.status(200).json(new ApiResponse(200, subtask, "Subtask deleted successfully"));
});

export { createSubTask, createTask, deleteTask, deleteSubTask, getTaskById, getTasks, updateSubTask, updateTask };
