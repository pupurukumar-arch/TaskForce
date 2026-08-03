import { ProjectMember } from "../models/projectmember.models.js";
import { Subtask } from "../models/subtask.models.js";
import { TaskComment } from "../models/taskcomment.models.js";
import { Notification } from "../models/notification.models.js";
import { Task } from "../models/task.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { UserRolesEnum } from "../utils/constants.js";
import { recordActivity } from "../utils/activity.js";
import { createNotification } from "../utils/notification.js";

const getTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ project: req.params.projectId })
    .populate("assignedTo", "avatar username fullName")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

const getTaskDueSummary = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const openTaskFilter = {
    project: req.params.projectId,
    dueDate: { $exists: true },
    status: { $ne: "done" },
  };
  const [dueToday, dueThisWeek, overdue] = await Promise.all([
    Task.find({
      ...openTaskFilter,
      dueDate: { $gte: startOfToday, $lt: startOfTomorrow },
    }).sort({ dueDate: 1 }),
    Task.find({
      ...openTaskFilter,
      dueDate: { $gte: startOfTomorrow, $lt: endOfWeek },
    }).sort({ dueDate: 1 }),
    Task.find({
      ...openTaskFilter,
      dueDate: { $lt: startOfToday },
    }).sort({ dueDate: 1 }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        dueToday,
        dueThisWeek,
        overdue,
        counts: {
          dueToday: dueToday.length,
          dueThisWeek: dueThisWeek.length,
          overdue: overdue.length,
        },
      },
      "Task due-date summary fetched successfully",
    ),
  );
});

const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, status, difficulty, priority, dueDate } =
    req.body;

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
    difficulty,
    priority,
    dueDate: dueDate || undefined,
    attachments,
  });

  await recordActivity({
    project: task.project,
    actor: req.user._id,
    type: "task_created",
    message: `Created task: ${task.title}`,
    details: {
      task: task._id,
      assignedTo: task.assignedTo,
      difficulty: task.difficulty,
      priority: task.priority,
    },
  });

  if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
    await createNotification({
      recipient: task.assignedTo,
      project: task.project,
      task: task._id,
      type: "task_assigned",
      message: `You were assigned the task: ${task.title}`,
    });
  }

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
  const { title, description, assignedTo, status, difficulty, priority, dueDate } =
    req.body;
  const task = await Task.findOne({ _id: req.params.taskId, project: req.params.projectId });

  if (!task) throw new ApiError(404, "Task not found");

  if (assignedTo) {
    const member = await ProjectMember.exists({ project: req.params.projectId, user: assignedTo });
    if (!member) throw new ApiError(400, "Assignee must be a project member");
  }

  const previousStatus = task.status;
  const previousAssignee = task.assignedTo?.toString();
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (assignedTo !== undefined) task.assignedTo = assignedTo || undefined;
  if (status !== undefined) task.status = status;
  if (difficulty !== undefined) task.difficulty = difficulty;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate || undefined;
  task.attachments.push(
    ...(req.files || []).map((file) => ({
      url: `${req.protocol}://${req.get("host")}/images/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size,
    })),
  );
  await task.save();

  if (
    task.assignedTo &&
    task.assignedTo.toString() !== previousAssignee &&
    task.assignedTo.toString() !== req.user._id.toString()
  ) {
    await createNotification({
      recipient: task.assignedTo,
      project: task.project,
      task: task._id,
      type: "task_assigned",
      message: `You were assigned the task: ${task.title}`,
    });
  }

  if (status !== undefined && status !== previousStatus) {
    await recordActivity({
      project: task.project,
      actor: req.user._id,
      type: "task_status_changed",
      message: `Changed task status: ${task.title}`,
      details: { task: task._id, from: previousStatus, to: task.status },
    });
  }

  return res.status(200).json(new ApiResponse(200, task, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.taskId, project: req.params.projectId });
  if (!task) throw new ApiError(404, "Task not found");

  await Promise.all([
    Subtask.deleteMany({ task: task._id }),
    TaskComment.deleteMany({ task: task._id }),
    Notification.deleteMany({ task: task._id }),
  ]);

  await recordActivity({
    project: task.project,
    actor: req.user._id,
    type: "task_deleted",
    message: `Deleted task: ${task.title}`,
    details: { task: task._id },
  });
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

export {
  createSubTask,
  createTask,
  deleteTask,
  deleteSubTask,
  getTaskById,
  getTaskDueSummary,
  getTasks,
  updateSubTask,
  updateTask,
};
