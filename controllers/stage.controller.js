import { ObjectId } from "mongodb";
import z, { ZodError } from "zod";
import { clubMembers, stages, tournaments } from "../config/db.js";

const CREATE_SCHEMA = z.object({
    name: z.string().min(3).max(256),
    order: z.number().int().optional(),
    config: z.object({
        // league
        teamsCount: z.number().int().min(2).optional(),
    }).optional(),
}).strict();

/** @type {import("express").RequestHandler<{ tournamentId: string }>} **/
export async function createStage(req, res) {
    try {
        const parsed = CREATE_SCHEMA.parse(req.body);
        const tournamentId = new ObjectId(req.params.tournamentId);

        // finding tournament of the stage
        const tournament = await tournaments.findOne({ _id: tournamentId });
        if (tournament == null) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        // checking if user has permissions
        const membership = await clubMembers.findOne({
            clubId: tournament.clubId,
            userId: new ObjectId(req.user.id),
            role: { $in: ["owner", "admin"] },
        });
        if (membership == null) {
            return res.status(403).json({
                message: "You do not have the permission",
            });
        }

        const existingStages = await stages.find({ tournamentId: tournamentId })
            .sort({ order: -1 }).limit(1).toArray();
        const nextOrder = existingStages.length > 0
            ? existingStages[0].order + 1
            : 0;

        // validating config
        const config = parsed.config;
        if (!config.teamsCount) {
            return res.status(400).json({
                message: "Team Count is required for league",
            });
        }

        const { insertedId: stageId } = await stages.insertOne({
            tournamentId: tournamentId,
            name: parsed.name,
            order: nextOrder,
            config: {
                // League default
                teamsCount: config.teamsCount,
                rounds: config.teamsCount - 1
            },
            items: [], // will be filled when stage is initialized
        });
        res.status(201).json({ stageId: stageId });
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during creating stage:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ stageId: string }>} */
export async function getStage(req, res) { // todo: some bug that cant successfully return a stage
    try {
        const stageId = new ObjectId(req.params.stageId);

        const stage = await stages.findOne({ _id: stageId });
        if (stage == null) {
            return res.status(404).json({ message: "Stage not found" });
        }

        const tournament = await tournaments.findOne({
            _id: stage.tournamentId,
        });
        if (tournament == null) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        const membership = await clubMembers.findOne({
            clubId: tournament.clubId,
            userId: new ObjectId(req.user.id),
        });

        if (membership == null) {
            return res.status(403).json({
                message: "You are not a member of this club",
            });
        }

        res.status(200).json(stage);
    } catch (error) {
        console.error("Error during getting stage:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const UPDATE_STAGE_SCHEMA = z.object({
    name: z.string().trim().min(1).max(256).optional(),
    order: z.number().int().min(0).optional(),
}).strict();

/** @type {import("express").RequestHandler<{ stageId: string }>} */
export async function updateStage(req, res) {
    try {
        const parsed = UPDATE_STAGE_SCHEMA.parse(req.body);
        const stageId = new ObjectId(req.params.stageId);

        const stage = await stages.findOne({ _id: stageId });
        if (stage == null) {
            return res.status(404).json({ message: "Stage not found" });
        }

        // Get tournament and verify access
        const tournament = await tournaments.findOne({
            _id: stage.tournamentId,
        });
        if (tournament == null) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        const membership = await clubMembers.findOne({
            clubId: tournament.clubId,
            userId: new ObjectId(req.user.id),
            role: { $in: ["owner", "admin"] },
        });

        if (membership == null) {
            return res.status(403).json({
                message: "You don't have permission to update this stage",
            });
        }

        const updateDoc = {};
        if (parsed.name) updateDoc.name = parsed.name;
        if (parsed.order !== undefined) updateDoc.order = parsed.order;

        const { modifiedCount } = await stages.updateOne(
            { _id: stageId },
            { $set: updateDoc },
        );

        if (modifiedCount === 0) {
            return res.status(400).json({ message: "No changes were made" });
        }

        const updatedStage = await stages.findOne({ _id: stageId });
        res.status(200).json(updatedStage);
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during updating stage:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ stageId: string }>} */
export async function deleteStage(req, res) {
    try {
        const stageId = new ObjectId(req.params.stageId);

        const stage = await stages.findOne({ _id: stageId });
        if (stage == null) {
            return res.status(404).json({ message: "Stage not found" });
        }

        const tournament = await tournaments.findOne({
            _id: stage.tournamentId,
        });
        if (tournament == null) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        const membership = await clubMembers.findOne({
            clubId: tournament.clubId,
            userId: new ObjectId(req.user.id),
            role: { $in: ["owner", "admin"] },
        });

        if (membership == null) {
            return res.status(403).json({
                message: "You don't have permission to delete this stage",
            });
        }

        const { deletedCount } = await stages.deleteOne({ _id: stageId });

        if (deletedCount === 0) {
            return res.status(404).json({
                message: "Could not find the specified stage",
            });
        }

        // todo: Delete related matches and update team/player stats

        res.status(200).json({ message: "Deleted stage successfully" });
    } catch (error) {
        console.error("Error during deleting stage:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
