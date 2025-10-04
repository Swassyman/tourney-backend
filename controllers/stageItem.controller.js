import { ObjectId } from "mongodb";
import z, { ZodError } from "zod";
import {
    clubMembers,
    stageItems,
    stages,
    teams,
    tournaments,
} from "../config/db.js";

const ASSIGN_TEAMS_SCHEMA = z.object({
    inputs: z.array(
        z.object({
            slot: z.number().int().min(1),
            sourceType: z.enum(["direct", "winner", "loser"]),
            teamId: z.string().optional(),
            sourceStageItemId: z.string().optional(),
            sourceMatchId: z.string().optional(),
        }).refine(
            (data) => {
                if (data.sourceType === "direct") {
                    return !!data.teamId;
                }
                if (
                    data.sourceType === "winner" || data.sourceType === "loser"
                ) {
                    return !!data.sourceStageItemId || !!data.sourceMatchId;
                }
                return true;
            },
            {
                message: "Invalid input configuration",
            },
        ),
    ).min(1),
}).strict();

/** @type {import("express").RequestHandler<{ stageItemId: string }>} */
export async function assignTeams(req, res) {
    try {
        const parsed = ASSIGN_TEAMS_SCHEMA.parse(req.body);
        const stageItemId = new ObjectId(req.params.stageItemId);

        const stageItem = await stageItems.findOne({ _id: stageItemId });
        if (stageItem == null) {
            return res.status(404).json({ message: "Stage item not found" });
        }

        const stage = await stages.findOne({ _id: stageItem.stageId });
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
                message: "You don't have permission to assign teams",
            });
        }

        const teamIds = parsed.inputs
            .filter(input => input.teamId)
            .map(input => new ObjectId(input.teamId));

        if (teamIds.length > 0) {
            const existingTeams = await teams.find({
                _id: { $in: teamIds },
                tournamentId: tournament._id,
            }).toArray();

            if (existingTeams.length !== teamIds.length) {
                return res.status(400).json({
                    message: "One or more teams not found in this tournament",
                });
            }
        }

        const formattedInputs = parsed.inputs.map(input => ({
            slot: input.slot,
            sourceType: input.sourceType,
            teamId: input.teamId ? new ObjectId(input.teamId) : undefined,
            sourceStageItemId: input.sourceStageItemId
                ? new ObjectId(input.sourceStageItemId)
                : undefined,
            sourceMatchId: input.sourceMatchId
                ? new ObjectId(input.sourceMatchId)
                : undefined,
        }));

        const { modifiedCount } = await stageItems.updateOne(
            { _id: stageItemId },
            { $set: { inputs: formattedInputs } },
        );

        if (modifiedCount === 0) {
            return res.status(400).json({ message: "Failed to assign teams" });
        }

        const updatedStageItem = await stageItems.findOne({ _id: stageItemId });
        res.status(200).json(updatedStageItem);
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during assigning teams:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ stageItemId: string }>} */
export async function getStageItem(req, res) {
    try {
        const stageItemId = new ObjectId(req.params.stageItemId);

        const stageItem = await stageItems.findOne({ _id: stageItemId });
        if (stageItem == null) {
            return res.status(404).json({ message: "Stage item not found" });
        }

        const stage = await stages.findOne({ _id: stageItem.stageId });
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

        res.status(200).json(stageItem);
    } catch (error) {
        console.error("Error during getting stage item:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ stageItemId: string }>} */
export async function getStageItemWithTeams(req, res) {
    try {
        const stageItemId = new ObjectId(req.params.stageItemId);

        const stageItem = await stageItems.findOne({ _id: stageItemId });
        if (stageItem == null) {
            return res.status(404).json({ message: "Stage item not found" });
        }

        const stage = await stages.findOne({ _id: stageItem.stageId });
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

        const teamIds = stageItem.inputs
            .filter(input => input.teamId)
            .map(input => input.teamId);

        let teamDetails = [];
        if (teamIds.length > 0) {
            teamDetails = await teams.find({
                _id: { $in: teamIds },
            }).toArray();
        }

        const teamMap = new Map(teamDetails.map(t => [t._id.toString(), t]));

        const enhancedInputs = stageItem.inputs.map(input => ({
            ...input,
            team: input.teamId ? teamMap.get(input.teamId.toString()) : null,
        }));

        res.status(200).json({
            ...stageItem,
            inputs: enhancedInputs,
        });
    } catch (error) {
        console.error("Error during getting stage item with teams:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const UPDATE_STAGE_ITEM_SCHEMA = z.object({
    name: z.string().trim().min(1).max(256).optional(),
}).strict();

/** @type {import("express").RequestHandler<{ stageItemId: string }>} */
export async function updateStageItem(req, res) {
    try {
        const parsed = UPDATE_STAGE_ITEM_SCHEMA.parse(req.body);
        const stageItemId = new ObjectId(req.params.stageItemId);

        const stageItem = await stageItems.findOne({ _id: stageItemId });
        if (stageItem == null) {
            return res.status(404).json({ message: "Stage item not found" });
        }

        const stage = await stages.findOne({ _id: stageItem.stageId });
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
                message: "You don't have permission to update this stage item",
            });
        }

        const updateDoc = {};
        if (parsed.name) updateDoc.name = parsed.name;

        if (Object.keys(updateDoc).length === 0) {
            return res.status(400).json({ message: "No changes to update" });
        }

        const { modifiedCount } = await stageItems.updateOne(
            { _id: stageItemId },
            { $set: updateDoc },
        );

        if (modifiedCount === 0) {
            return res.status(400).json({ message: "No changes were made" });
        }

        const updatedStageItem = await stageItems.findOne({ _id: stageItemId });
        res.status(200).json(updatedStageItem);
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during updating stage item:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ stageItemId: string }>} */
export async function clearTeamAssignments(req, res) {
    try {
        const stageItemId = new ObjectId(req.params.stageItemId);

        const stageItem = await stageItems.findOne({ _id: stageItemId });
        if (stageItem == null) {
            return res.status(404).json({ message: "Stage item not found" });
        }

        const stage = await stages.findOne({ _id: stageItem.stageId });
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
                message: "You don't have permission to clear team assignments",
            });
        }

        await stageItems.updateOne(
            { _id: stageItemId },
            { $set: { inputs: [] } },
        );

        res.status(200).json({
            message: "Team assignments cleared successfully",
        });
    } catch (error) {
        console.error("Error during clearing team assignments:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
