import express from "express";
import * as matchController from "../controllers/match.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.get("/:matchId", matchController.getMatch);
router.patch("/:matchId/win", matchController.updateMatchWinner);
router.post("/:matchId/draw", matchController.declareMatchDraw);
router.patch("/:matchId/schedule", matchController.scheduleMatch);
router.delete("/:matchId/delete", matchController.deleteMatch);

export default router;
