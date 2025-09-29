import express from "express";
import * as clubController from "../controllers/club.controller.js";
import { authenticateToken } from "../middlewares/authentication.js";

const router = express.Router();

router.use(authenticateToken); // todo: wrap in a general protected router

router.get("/", clubController.getClubs);
router.post("/create", clubController.createClub);
router.delete("/delete", clubController.deleteClub);

export default router;
