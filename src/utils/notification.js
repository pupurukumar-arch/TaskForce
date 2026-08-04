import { Notification } from "../models/notification.models.js";

const createNotification = async ({ recipient, project, task, type, message }) => {
  return Notification.create({ recipient, project, task, type, message });
};

export { createNotification };
