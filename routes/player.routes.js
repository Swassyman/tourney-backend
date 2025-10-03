import express from "express";
import * as playerController from "../controllers/player.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.post("/create", playerController.createPlayer);
router.get("/:playerId", playerController.getPlayer);
router.post("/:playerId/assign", playerController.assignPlayerToTeam);
router.post("/:playerId/remove", playerController.removePlayerFromTeam);
router.patch("/:playerId/update", playerController.updatePlayer);
router.delete("/:playerId/delete", playerController.deletePlayer);

export default router;
