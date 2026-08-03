import { TaskComment } from "../models/taskcomment.models.js";
import { Task } from "../models/task.models.js";
import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { recordActivity } from "../utils/activity.js";
import { UserRolesEnum } from "../utils/constants.js";
import { createNotification } from "../utils/notification.js";

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

  const mentionedUsernames = [
    ...new Set(
      [...comment.content.matchAll(/@([a-z0-9_]+)/gi)].map((match) =>
        match[1].toLowerCase(),
      ),
    ),
  ];

  if (mentionedUsernames.length > 0) {
    const mentionedUsers = await User.find({
      username: { $in: mentionedUsernames },
    }).select("_id");
    const projectMembers = await ProjectMember.find({
      project: task.project,
      user: { $in: mentionedUsers.map((user) => user._id) },
    }).select("user");

    await Promise.all(
      projectMembers
        .filter((member) => member.user.toString() !== req.user._id.toString())
        .map((member) =>
          createNotification({
            recipient: member.user,
            project: task.project,
            task: task._id,
            type: "comment_mention",
            message: `You were mentioned in a comment on task: ${task.title}`,
          }),
        ),
    );
  }

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
