import { Router } from "express";
import {
  createSubTask,
  createTask,
  deleteTask,
  deleteSubTask,
  getTaskById,
  getTaskDueSummary,
  getTasks,
  updateSubTask,
  updateTask,
} from "../controllers/task.controllers.js";
import {
  createTaskComment,
  deleteTaskComment,
  getTaskComments,
} from "../controllers/task-comment.controllers.js";
import { verifyJWT, validateProjectPermission } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const router = Router();
const managers = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN];

router.use(verifyJWT);

router
  .route("/:projectId")
  .get(validateProjectPermission(AvailableUserRole), getTasks)
  .post(validateProjectPermission(managers), upload.array("attachments", 5), createTask);

router
  .route("/:projectId/due-summary")
  .get(validateProjectPermission(AvailableUserRole), getTaskDueSummary);

router
  .route("/:projectId/t/:taskId")
  .get(validateProjectPermission(AvailableUserRole), getTaskById)
  .put(validateProjectPermission(managers), upload.array("attachments", 5), updateTask)
  .delete(validateProjectPermission(managers), deleteTask);

router
  .route("/:projectId/t/:taskId/comments")
  .get(validateProjectPermission(AvailableUserRole), getTaskComments)
  .post(validateProjectPermission(AvailableUserRole), createTaskComment);

router
  .route("/:projectId/t/:taskId/comments/:commentId")
  .delete(validateProjectPermission(AvailableUserRole), deleteTaskComment);

router
  .route("/:projectId/t/:taskId/subtasks")
  .post(validateProjectPermission(managers), createSubTask);

router
  .route("/:projectId/st/:subTaskId")
  .put(validateProjectPermission(AvailableUserRole), updateSubTask)
  .delete(validateProjectPermission(managers), deleteSubTask);

export default router;
