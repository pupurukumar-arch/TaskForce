import { Router } from "express";
import {
  createSubTask,
  createTask,
  deleteTask,
  deleteSubTask,
  getTaskById,
  getTaskDueSummary,
  getMyDeadlines,
  getMyCalendar,
  getTasks,
  getProjectBoard,
  updateSubTask,
  updateTask,
  submitTaskForReview,
  reviewTask,
} from "../controllers/task.controllers.js";
import {
  createTaskComment,
  deleteTaskComment,
  getTaskComments,
} from "../controllers/task-comment.controllers.js";
import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createSubtaskValidator,
  createTaskValidator,
  taskCommentValidator,
  updateSubtaskValidator,
  updateTaskValidator,
} from "../validators/index.js";
import { validateObjectIdParam } from "../middlewares/security.middleware.js";

const router = Router();
const managers = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN];

for (const parameter of ["projectId", "taskId", "commentId", "subTaskId"]) {
  router.param(parameter, validateObjectIdParam);
}

router.use(verifyJWT);

router.route("/my-deadlines").get(getMyDeadlines);
router.route("/my-calendar").get(getMyCalendar);

router
  .route("/:projectId/board")
  .get(validateProjectPermission(AvailableUserRole), getProjectBoard);

router
  .route("/:projectId")
  .get(validateProjectPermission(AvailableUserRole), getTasks)
  .post(
    validateProjectPermission(managers),
    upload.array("attachments", 5),
    createTaskValidator(),
    validate,
    createTask,
  );

router
  .route("/:projectId/due-summary")
  .get(validateProjectPermission(AvailableUserRole), getTaskDueSummary);

router
  .route("/:projectId/t/:taskId")
  .get(validateProjectPermission(AvailableUserRole), getTaskById)
  .put(
    validateProjectPermission(managers),
    upload.array("attachments", 5),
    updateTaskValidator(),
    validate,
    updateTask,
  )
  .delete(validateProjectPermission(managers), deleteTask);

router
  .route("/:projectId/t/:taskId/submit-review")
  .post(
    validateProjectPermission(AvailableUserRole),
    upload.array("attachments", 5),
    submitTaskForReview,
  );
router
  .route("/:projectId/t/:taskId/review")
  .post(validateProjectPermission(managers), reviewTask);

router
  .route("/:projectId/t/:taskId/comments")
  .get(validateProjectPermission(AvailableUserRole), getTaskComments)
  .post(
    validateProjectPermission(AvailableUserRole),
    taskCommentValidator(),
    validate,
    createTaskComment,
  );

router
  .route("/:projectId/t/:taskId/comments/:commentId")
  .delete(validateProjectPermission(AvailableUserRole), deleteTaskComment);

router
  .route("/:projectId/t/:taskId/subtasks")
  .post(
    validateProjectPermission(managers),
    createSubtaskValidator(),
    validate,
    createSubTask,
  );

router
  .route("/:projectId/st/:subTaskId")
  .put(
    validateProjectPermission(AvailableUserRole),
    updateSubtaskValidator(),
    validate,
    updateSubTask,
  )
  .delete(validateProjectPermission(managers), deleteSubTask);

export default router;
