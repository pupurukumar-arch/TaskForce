import { TaskComment } from "../models/taskcomment.models.js";
import { Task } from "../models/task.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { recordActivity } from "../utils/activity.js";
import { UserRolesEnum } from "../utils/constants.js";

const getTaskComments = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.taskId,
    project: req.params.projectId,
  });
  if (!task) throw new ApiError(404, "Task not found");

  const comments = await TaskComment.find({ task: task._id })
    .populate("user", "avatar username fullName")
    .sort({ createdAt: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Task comments fetched successfully"));
});

const createTaskComment = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.taskId,
    project: req.params.projectId,
  });
  if (!task) throw new ApiError(404, "Task not found");

  const comment = await TaskComment.create({
    task: task._id,
    user: req.user._id,
    content: req.body.content,
  });

  await recordActivity({
    project: task.project,
    actor: req.user._id,
    type: "task_comment_added",
    message: `Added a comment to task: ${task.title}`,
    details: { task: task._id, comment: comment._id },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Task comment added successfully"));
});

const deleteTaskComment = asyncHandler(async (req, res) => {
  const comment = await TaskComment.findById(req.params.commentId);
  if (!comment) throw new ApiError(404, "Task comment not found");

  const task = await Task.findOne({
    _id: comment.task,
    project: req.params.projectId,
  });
  if (!task) throw new ApiError(404, "Task not found");

  const isManager = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(
    req.user.role,
  );
  if (!isManager && comment.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only delete your own comments");
  }

  await comment.deleteOne();
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Task comment deleted successfully"));
});

export { createTaskComment, deleteTaskComment, getTaskComments };
