import express from "express";
import * as clubController from "../controllers/club.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.get("/:clubId", clubController.getClub);
router.post("/", clubController.createClub);
router.delete("/:clubId", clubController.deleteClub);

router.get("/:clubId/members", clubController.getClubMembers);
router.post("/:clubId/member", clubController.addClubMember);

router.get("/:clubId/tournaments", clubController.getClubTournaments);
router.get("/:clubId/players", clubController.getClubPlayers);

export default router;
