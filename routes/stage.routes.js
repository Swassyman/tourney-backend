import express from "express";
import * as stageController from "../controllers/stage.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.post("/:tournamentId/create", stageController.createStage);
router.get("/:stageId", stageController.getStage);
router.patch("/update/:stageId", stageController.updateStage);
router.delete("/delete/:stageId", stageController.deleteStage);

export default router;
