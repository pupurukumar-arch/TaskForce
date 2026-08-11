import { Router } from "express";
import {
  changeCurrentPassword,
  forgotPasswordRequest,
  getCurrentUser,
  login,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendEmailVerification,
  resetForgotPassword,
  updateUserSkills,
  getMyTaskSummary,
  verifyEmail,
} from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userLoginValidator,
  userRegisterValidator,
  userResetForgotPasswordValidator,
  userSkillsValidator,
} from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from "../middlewares/rate-limit.middleware.js";

const router = Router();

// unsecured route
router
  .route("/register")
  .post(authRateLimiter, userRegisterValidator(), validate, registerUser);
router
  .route("/login")
  .post(authRateLimiter, userLoginValidator(), validate, login);
router.route("/verify-email/:verificationToken").get(verifyEmail);
router.route("/refresh-token").post(refreshAccessToken);
router
  .route("/forgot-password")
  .post(
    authRateLimiter,
    userForgotPasswordValidator(),
    validate,
    forgotPasswordRequest,
  );
router
  .route("/resend-email-verification")
  .post(
    authRateLimiter,
    userForgotPasswordValidator(),
    validate,
    resendEmailVerification,
  );
router
  .route("/reset-password/:resetToken")
  .post(
    authRateLimiter,
    userResetForgotPasswordValidator(),
    validate,
    resetForgotPassword,
  );

//secure routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").post(verifyJWT, getCurrentUser);
router
  .route("/profile/skills")
  .put(verifyJWT, userSkillsValidator(), validate, updateUserSkills);
router.route("/task-summary").get(verifyJWT, getMyTaskSummary);
router
  .route("/change-password")
  .post(
    verifyJWT,
    userChangeCurrentPasswordValidator(),
    validate,
    changeCurrentPassword,
  );
export default router;
