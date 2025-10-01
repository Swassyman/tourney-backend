import express from "express";
import * as stageController from "../controllers/stage.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.post("/create", stageController.createStage);
router.get("/:stageid", stageController.getStage);
router.get("/tournament/:stageid", stageController.getTournamentStages);
router.patch("/update/:stageid", stageController.updateStage);
router.delete("/delete/:stageid", stageController.deleteStage);

export default router;
