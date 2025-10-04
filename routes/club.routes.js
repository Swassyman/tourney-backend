import express from "express";
import * as clubController from "../controllers/club.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.get("/:clubId", clubController.getClub);
router.post("/", clubController.createClub);
router.delete("/:clubId", clubController.deleteClub);

router.get("/:clubId/members", clubController.getClubMembers);
router.post("/:clubId/members", clubController.addClubMember);

router.get("/me/memberships", clubController.getMyClubMemberships);
router.get("/:clubId/tournaments", clubController.getClubTournaments);

export default router;
