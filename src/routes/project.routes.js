import { Router } from "express";
import {
  addMembersToProject,
  acceptProjectInvitation,
  createProject,
  deleteMember,
  getProjects,
  getProjectProgress,
  getProjectById,
  getProjectMembers,
  getMemberTaskSummary,
  updateProject,
  deleteProject,
  updateMemberRole,
  inviteUnregisteredMember,
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
import { validateObjectIdParam } from "../middlewares/security.middleware.js";

const router = Router();
router.param("projectId", validateObjectIdParam);
router.param("userId", validateObjectIdParam);
router.use(verifyJWT);

router
  .route("/")
  .get(getProjects)
  .post(createProjectValidator(), validate, createProject);

router
  .route("/invitations/:invitationToken/accept")
  .post(acceptProjectInvitation);

router
  .route("/:projectId/progress")
  .get(validateProjectPermission(AvailableUserRole), getProjectProgress);

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
  .route("/:projectId/invitations")
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    addMembertoProjectValidator(),
    validate,
    inviteUnregisteredMember,
  );

router
  .route("/:projectId/members/:userId/task-summary")
  .get(validateProjectPermission([UserRolesEnum.ADMIN]), getMemberTaskSummary);

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
