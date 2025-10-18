import express from "express";
import * as matchController from "../controllers/match.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.get("/:matchId", matchController.getMatch);
router.patch("/:matchId", matchController.updateMatch);
router.post("/:matchId/end", matchController.endMatch);

export default router;
