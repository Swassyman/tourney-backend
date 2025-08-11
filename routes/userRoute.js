import express from "express";
import { login, register } from "../controllers/userController.js";
import { authenticateToken } from "../midldlewares/jwtauth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
// router.post("/logout", logout); // todo: @dcdunkan

export default router;
