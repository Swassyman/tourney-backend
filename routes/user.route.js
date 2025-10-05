import express from "express";
import * as userController from "../controllers/user.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/refresh", userController.refresh);

// after authentication
router.use(authenticateToken);

router.get("/me", userController.getMe);
router.post("/logout", userController.logout);

router.get("/clubs", userController.getMyClubMemberships);

export default router;
