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
  sendMemberTaskReminder,
  updateProject,
  uploadProjectBriefFile,
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
import { projectBriefUpload } from "../middlewares/multer.middleware.js";

const router = Router();
router.param("projectId", validateObjectIdParam);
router.param("userId", validateObjectIdParam);
router.use(verifyJWT);

router
  .route("/")
  .get(getProjects)
  .post(projectBriefUpload.single("brief"), createProjectValidator(), validate, createProject);

router
  .route("/invitations/:invitationToken/accept")
  .post(acceptProjectInvitation);

router
  .route("/:projectId/progress")
  .get(validateProjectPermission(AvailableUserRole), getProjectProgress);

router
  .route("/:projectId/brief")
  .put(
    validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
    projectBriefUpload.single("brief"),
    uploadProjectBriefFile,
  );

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
  .get(
    validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
    getMemberTaskSummary,
  );

router
  .route("/:projectId/members/:userId/tasks/:taskId/reminder")
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
    sendMemberTaskReminder,
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
