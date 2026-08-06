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
  validateProjectPulseAdmin,
} from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { validateObjectIdParam } from "../middlewares/security.middleware.js";
import { projectBriefUpload } from "../middlewares/multer.middleware.js";
import { projectPulseRateLimiter } from "../middlewares/rate-limit.middleware.js";
import {
  buildProjectPulsePrompt,
  getProjectPulseContext,
  streamGeminiAnswer,
} from "../services/project-pulse.service.js";
import { ApiError } from "../utils/api-error.js";

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

/*
 * Project Pulse frontend contract
 * POST /api/v1/projects/:projectId/pulse/ask
 * Body: { question: string }
 * Success: text/event-stream with `token`, `done`, and `error` events.
 * Each token event is JSON: { text: string }. Project Admin membership required.
 */
router.route("/:projectId/pulse/ask").post(
  validateProjectPulseAdmin,
  projectPulseRateLimiter,
  async (req, res, next) => {
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
    if (!question || question.length > 800) {
      return next(new ApiError(400, "question must be between 1 and 800 characters"));
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 45_000);
    res.on("close", () => {
      if (!res.writableEnded) abortController.abort();
    });
    try {
      const context = await getProjectPulseContext(req.params.projectId);
      const prompt = buildProjectPulsePrompt({ context, question });
      res.status(200);
      res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.flushHeaders();
      await streamGeminiAnswer({
        prompt,
        signal: abortController.signal,
        onToken: (text) => res.write(`event: token\ndata: ${JSON.stringify({ text })}\n\n`),
      });
      res.write("event: done\ndata: {}\n\n");
      res.end();
    } catch (error) {
      if (res.headersSent) {
        const message = error.name === "AbortError"
          ? "Project Pulse took too long. Please try again."
          : error.message || "Project Pulse could not answer right now";
        res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
        return res.end();
      }
      return next(error);
    } finally {
      clearTimeout(timeout);
    }
  },
);

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
