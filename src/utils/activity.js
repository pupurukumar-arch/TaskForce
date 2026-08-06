import { Activity } from "../models/activity.models.js";

const recordActivity = async ({ project, actor, type, message, details = {}, session }) => {
  return Activity.create([{ project, actor, type, message, details }], { session });
};

export { recordActivity };
