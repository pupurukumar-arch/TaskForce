import { Router } from "express";
import {
  addMembersToProject,
  createProject,
  deleteMember,
  getProjects,
  getProjectById,
  getProjectMembers,
  getMemberTaskSummary,
  updateProject,
  deleteProject,
  updateMemberRole,
} from "../controllers/project.controllers.js";
import { getProjectActivities } from "../controllers/activity.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createProjectValidator,
  addMembertoProjectValidator,
  updateMemberRoleValidator,
} from "../validators/index.js";
import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const router = Router();
router.use(verifyJWT);

router
  .route("/")
  .get(getProjects)
  .post(createProjectValidator(), validate, createProject);

router
  .route("/:projectId")
  .get(validateProjectPermission(AvailableUserRole), getProjectById)
  .put(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    createProjectValidator(),
    validate,
    updateProject,
  )
  .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteProject);

router
  .route("/:projectId/members")
  .get(validateProjectPermission(AvailableUserRole), getProjectMembers)
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    addMembertoProjectValidator(),
    validate,
    addMembersToProject,
  );

router
  .route("/:projectId/members/:userId/task-summary")
  .get(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    getMemberTaskSummary,
  );

router
  .route("/:projectId/activity")
  .get(validateProjectPermission(AvailableUserRole), getProjectActivities);

router
  .route("/:projectId/members/:userId")
  .put(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    updateMemberRoleValidator(),
    validate,
    updateMemberRole,
  )
  .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteMember);

export default router;
