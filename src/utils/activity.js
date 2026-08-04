import { Activity } from "../models/activity.models.js";

const recordActivity = async ({ project, actor, type, message, details = {} }) => {
  return Activity.create({ project, actor, type, message, details });
};

export { recordActivity };
