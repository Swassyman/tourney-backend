import express from "express";
import * as teamController from "../controllers/team.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.post("/create", teamController.createTeam);
router.get("/:teamId", teamController.getTeam);
router.patch("/:teamId/update", teamController.updateTeam);
router.delete("/:teamId/delete", teamController.deleteTeam);

router.get("/:teamId/matches", teamController.getTeamMatches);
router.get("/:teamId/players", teamController.getTeamPlayers);
export default router;
