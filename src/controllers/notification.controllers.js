import { Notification } from "../models/notification.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate("project", "name")
    .populate("task", "title")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, notifications, "Notifications fetched successfully"));
});

const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });
  return res.status(200).json(new ApiResponse(200, { count }, "Unread notification count fetched"));
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, recipient: req.user._id },
    { isRead: true },
    { new: true },
  );

  if (!notification) throw new ApiError(404, "Notification not found");

  return res
    .status(200)
    .json(new ApiResponse(200, notification, "Notification marked as read"));
});

export { getMyNotifications, getUnreadNotificationCount, markNotificationAsRead };
