import express from "express";
import * as stageItemController from "../controllers/stageItem.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.post("/:stageItemId", stageItemController.assignTeams);
router.get("/:stageItemId", stageItemController.getStageItem);
router.patch("/:stageItemId/update", stageItemController.updateStageItem);
router.post("/:stageItemId/clear", stageItemController.clearTeamAssignments);

export default router;
