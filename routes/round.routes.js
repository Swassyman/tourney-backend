import express from "express";
import * as roundController from "../controllers/round.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.post("/:stageId", roundController.generateRounds);
router.get("/:stageId", roundController.getRounds);
router.get("/:roundId/matches", roundController.getRoundMatches);

export default router;
