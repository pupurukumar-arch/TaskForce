export const MANAGER_ROLES = ["admin", "project_admin"];

export const isManagerRole = (role) => MANAGER_ROLES.includes(role);

export const canSubmitForReview = (task, userId) =>
  task?.assignedTo?._id === userId &&
  !["done", "in_review"].includes(task.status);
