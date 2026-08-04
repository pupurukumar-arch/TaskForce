import { Task } from "../models/task.models.js";
import { TaskDifficultyEnum, TaskStatusEnum } from "./constants.js";

const getTaskSummaryForUser = async (assignedTo) => {
  const [totalTasks, inProgressTasks, difficultyCounts] = await Promise.all([
    Task.countDocuments({ assignedTo }),
    Task.countDocuments({ assignedTo, status: TaskStatusEnum.IN_PROGRESS }),
    Task.aggregate([
      {
        $match: {
          assignedTo,
          status: TaskStatusEnum.IN_PROGRESS,
        },
      },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
    ]),
  ]);

  const inProgressByDifficulty = {
    [TaskDifficultyEnum.EASY]: 0,
    [TaskDifficultyEnum.MEDIUM]: 0,
    [TaskDifficultyEnum.HARD]: 0,
  };
  difficultyCounts.forEach(({ _id, count }) => {
    inProgressByDifficulty[_id] = count;
  });

  return { totalTasks, inProgressTasks, inProgressByDifficulty };
};

export { getTaskSummaryForUser };
