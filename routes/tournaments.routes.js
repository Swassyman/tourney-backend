import express from "express";
import * as tournamentController from "../controllers/tournament.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken);

router.post("/create", tournamentController.createTournament);
router.get("/:tournamentId", tournamentController.getTournament);
router.get("/:clubId", tournamentController.getClubTournaments)
router.delete("/:tournamentId/delete", tournamentController.deleteTournament);
router.patch("/:tournamentId/update", tournamentController.updateTournament);
export default router;