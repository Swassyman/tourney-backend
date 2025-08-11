import express from "express";
const router = express.Router();
import { login, logout, register } from "../controllers/userController.js";
import { authenticateToken } from "../midldlewares/jwtauth.js";

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

export default router;
