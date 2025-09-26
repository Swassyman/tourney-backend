import express from "express";
import * as userController from "../controllers/user.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/refresh", userController.refresh);

router.use(authenticateToken);
router.get("/me", userController.me);
router.post("/logout", userController.logout);

export default router;
