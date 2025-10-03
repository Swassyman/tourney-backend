import express from "express";
import * as tournamentController from "../controllers/tournament.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken);

router.post("/create", tournamentController.createTournament);
router.get("/:tournamentId", tournamentController.getTournament);
router.delete("/:tournamentId/delete", tournamentController.deleteTournament);
router.patch("/:tournamentId/update", tournamentController.updateTournament);

router.get("/:tournamentId/teams", tournamentController.getTournamentTeams);
router.get("/:tournamentId/stages", tournamentController.getTournamentStages);

export default router;
