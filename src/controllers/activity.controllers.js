import { Activity } from "../models/activity.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

const getProjectActivities = asyncHandler(async (req, res) => {
  const activities = await Activity.find({ project: req.params.projectId })
    .populate("actor", "avatar username fullName")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, activities, "Project activity fetched successfully"));
});

export { getProjectActivities };
