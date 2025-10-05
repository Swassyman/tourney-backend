import express from "express";
import * as tournamentController from "../controllers/tournament.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/:tournamentId", tournamentController.getTournament);
router.post("/", tournamentController.createTournament);
router.delete("/:tournamentId", tournamentController.deleteTournament);
router.patch("/:tournamentId", tournamentController.updateTournament);

router.get("/:tournamentId/teams", tournamentController.getTournamentTeams);
router.get("/:tournamentId/stages", tournamentController.getTournamentStages);

export default router;
