import { ObjectId } from "mongodb";
import z, { ZodError } from "zod";
import { clubMembers, players, teams, tournaments } from "../config/db.js";

const CREATE_PLAYER_SCHEMA = z.object({
    name: z.string().trim().min(1).max(256),
    tournamentId: z.string().trim().min(1),
    teamId: z.string().trim().min(1),
}).strict();

/** @type {import("express").RequestHandler} */
export async function createPlayer(req, res) {
    try {
        const parsed = CREATE_PLAYER_SCHEMA.parse(req.body);
        const tournamentId = new ObjectId(parsed.tournamentId);

        const tournament = await tournaments.findOne({ _id: tournamentId });
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
                message:
                    "You don't have permission to create players in this tournament",
            });
        }

        const { insertedId: playerId } = await players.insertOne({
            tournamentId: tournamentId,
            teamId: null, // Not assigned yet
            name: parsed.name,
        });

        res.status(201).json({ playerId: playerId });
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during creating player:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ playerId: string }>} */
export async function getPlayer(req, res) {
    try {
        const playerId = new ObjectId(req.params.playerId);

        const player = await players.findOne({ _id: playerId });
        if (player == null) {
            return res.status(404).json({ message: "Player not found" });
        }

        const tournament = await tournaments.findOne({
            _id: player.tournamentId,
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

        let playerTeam = null;
        if (player.teamId) {
            playerTeam = await teams.findOne({ _id: player.teamId });
        }

        res.status(200).json({
            ...player,
            team: playerTeam,
        });
    } catch (error) {
        console.error("Error during getting player:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const ASSIGN_TO_TEAM_SCHEMA = z.object({
    teamId: z.string().trim().min(1),
}).strict();

/** @type {import("express").RequestHandler<{ playerId: string }>} */
export async function assignPlayerToTeam(req, res) {
    try {
        const parsed = ASSIGN_TO_TEAM_SCHEMA.parse(req.body);
        const playerId = new ObjectId(req.params.playerId);
        const teamId = new ObjectId(parsed.teamId);

        const player = await players.findOne({ _id: playerId });
        if (player == null) {
            return res.status(404).json({ message: "Player not found" });
        }

        const team = await teams.findOne({ _id: teamId });
        if (team == null) {
            return res.status(404).json({ message: "Team not found" });
        }

        if (player.tournamentId.toString() !== team.tournamentId.toString()) {
            return res.status(400).json({
                message: "Player and team must belong to the same tournament",
            });
        }

        const tournament = await tournaments.findOne({
            _id: player.tournamentId,
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
                message: "You don't have permission to assign players to teams",
            });
        }

        if (player.teamId) {
            await teams.updateOne(
                { _id: player.teamId },
                { $pull: { playerIds: playerId } },
            );
        }

        await teams.updateOne(
            { _id: teamId },
            { $addToSet: { playerIds: playerId } },
        );

        await players.updateOne(
            { _id: playerId },
            { $set: { teamId: teamId } },
        );

        res.status(200).json({
            message: "Player assigned to team successfully",
        });
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during assigning player to team:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ playerId: string }>} */
export async function removePlayerFromTeam(req, res) {
    try {
        const playerId = new ObjectId(req.params.playerId);

        const player = await players.findOne({ _id: playerId });
        if (player == null) {
            return res.status(404).json({ message: "Player not found" });
        }

        if (!player.teamId) {
            return res.status(400).json({
                message: "Player is not assigned to any team",
            });
        }

        const tournament = await tournaments.findOne({
            _id: player.tournamentId,
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
                message:
                    "You don't have permission to remove players from teams",
            });
        }

        await teams.updateOne(
            { _id: player.teamId },
            { $pull: { playerIds: playerId } },
        );

        await players.updateOne(
            { _id: playerId },
            { $set: { teamId: null } },
        );

        res.status(200).json({
            message: "Player removed from team successfully",
        });
    } catch (error) {
        console.error("Error during removing player from team:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const UPDATE_PLAYER_SCHEMA = z.object({
    name: z.string().trim().min(1).max(256).optional(),
}).strict();

/** @type {import("express").RequestHandler<{ playerId: string }>} */
export async function updatePlayer(req, res) {
    try {
        const parsed = UPDATE_PLAYER_SCHEMA.parse(req.body);
        const playerId = new ObjectId(req.params.playerId);

        const player = await players.findOne({ _id: playerId });
        if (player == null) {
            return res.status(404).json({ message: "Player not found" });
        }

        const tournament = await tournaments.findOne({
            _id: player.tournamentId,
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
                message: "You don't have permission to update this player",
            });
        }

        const updateDoc = {};
        if (parsed.name) updateDoc.name = parsed.name;

        if (Object.keys(updateDoc).length === 0) {
            return res.status(400).json({ message: "No changes to update" });
        }

        const { modifiedCount } = await players.updateOne(
            { _id: playerId },
            { $set: updateDoc },
        );

        if (modifiedCount === 0) {
            return res.status(400).json({ message: "No changes were made" });
        }

        const updatedPlayer = await players.findOne({ _id: playerId });
        res.status(200).json(updatedPlayer);
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during updating player:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ playerId: string }>} */
export async function deletePlayer(req, res) {
    try {
        const playerId = new ObjectId(req.params.playerId);

        const player = await players.findOne({ _id: playerId });
        if (player == null) {
            return res.status(404).json({ message: "Player not found" });
        }

        const tournament = await tournaments.findOne({
            _id: player.tournamentId,
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
                message: "You don't have permission to delete this player",
            });
        }

        if (player.teamId) {
            await teams.updateOne(
                { _id: player.teamId },
                { $pull: { playerIds: playerId } },
            );
        }

        const { deletedCount } = await players.deleteOne({ _id: playerId });

        if (deletedCount === 0) {
            return res.status(404).json({
                message: "Could not find the specified player",
            });
        }

        res.status(200).json({
            message: "Deleted player successfully",
        });
    } catch (error) {
        console.error("Error during deleting player:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
