export const UserRolesEnum = {
  ADMIN: "admin",
  PROJECT_ADMIN: "project_admin",
  MEMBER: "member",
};

export const AvailableUserRole = Object.values(UserRolesEnum);

export const TaskStatusEnum = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

export const AvailableTaskStatues = Object.values(TaskStatusEnum);

export const TaskDifficultyEnum = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

export const AvailableTaskDifficulties = Object.values(TaskDifficultyEnum);

export const TaskPriorityEnum = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export const AvailableTaskPriorities = Object.values(TaskPriorityEnum);
