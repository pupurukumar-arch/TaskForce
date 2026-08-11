import { Router } from "express";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
} from "../controllers/notification.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateObjectIdParam } from "../middlewares/security.middleware.js";

const router = Router();

router.param("notificationId", validateObjectIdParam);
router.use(verifyJWT);
router.route("/unread-count").get(getUnreadNotificationCount);
router.route("/").get(getMyNotifications);
router.route("/:notificationId/read").patch(markNotificationAsRead);

export default router;
