import express from "express";
import * as clubController from "../controllers/club.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.get("/:clubId", clubController.getClub);
router.post("/create", clubController.createClub);
router.delete("/delete/:clubId", clubController.deleteClub);

router.get("/:clubId/members", clubController.getClubMembers);
router.post("/:clubId/add-member", clubController.addClubMember);

export default router;
