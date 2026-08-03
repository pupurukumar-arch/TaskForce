import { Router } from "express";
import {
  getMyNotifications,
  markNotificationAsRead,
} from "../controllers/notification.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);
router.route("/").get(getMyNotifications);
router.route("/:notificationId/read").patch(markNotificationAsRead);

export default router;
