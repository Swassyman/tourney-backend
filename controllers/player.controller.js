import { ObjectId } from "mongodb";
import z, { ZodError } from "zod";
import {
    clubMembers,
    clubs,
    players,
    teams,
    teamxplayers,
} from "../config/db.js";

const CREATE_PLAYER_SCHEMA = z
    .object({
        name: z.string().trim().min(1).max(256),
        clubId: z.string().trim().min(1),
    })
    .strict();

/** @type {import("express").RequestHandler} */
export async function createPlayer(req, res) {
    try {
        const parsed = CREATE_PLAYER_SCHEMA.parse(req.body);
        console.log(req.body);
        const clubId = new ObjectId(parsed.clubId);

        const club = await clubs.findOne({ _id: clubId });
        if (club == null) {
            return res.status(404).json({ message: "Club not found" });
        }

        const membership = await clubMembers.findOne({
            clubId: clubId,
            userId: new ObjectId(req.user.id),
            role: { $in: ["owner", "admin"] },
        });

        if (membership == null) {
            return res.status(403).json({
                message:
                    "You don't have permission to create players in this club",
            });
        }

        const { insertedId: playerId } = await players.insertOne({
            clubId: clubId,
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

        const club = await clubs.findOne({
            _id: player.clubId,
        });
        if (club == null) {
            return res.status(404).json({ message: "Club not found" });
        }

        const membership = await clubMembers.findOne({
            clubId: club._id,
            userId: new ObjectId(req.user.id),
        });

        if (membership == null) {
            return res.status(403).json({
                message: "You are not a member of this club",
            });
        }
        res.status(200).json({
            ...player,
        });
    } catch (error) {
        console.error("Error during getting player:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const ASSIGN_TO_TEAM_SCHEMA = z
    .object({
        teamId: z.string().trim().min(1),
    })
    .strict();

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

        const club = await clubs.findOne({
            _id: player.clubId,
        });

        const membership = await clubMembers.findOne({
            clubId: club._id,
            userId: new ObjectId(req.user.id),
            role: { $in: ["owner", "admin"] },
        });

        if (membership == null) {
            return res.status(403).json({
                message: "You don't have permission to assign players to teams",
            });
        }

        // reassigning players
        const otherteam = await teamxplayers.findOne({
            playerId: playerId,
            teamId: { $ne: teamId },
        });
        if (otherteam != null) {
            // remove from other teams
            await teamxplayers.deleteOne({
                playerId: playerId,
            });
        }

        // todo: check if already in team?

        await teamxplayers.insertOne({
            teamId: teamId,
            playerId: playerId,
        });

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

        const playerTeam = await teamxplayers.findOne({
            playerId: playerId,
        });
        if (!playerTeam) {
            return res.status(400).json({
                message: "Player is not assigned to any team",
            });
        }

        const club = await clubs.findOne({
            _id: player.clubId,
        });
        if (club == null) {
            return res.status(404).json({ message: "Club not found" });
        }

        const membership = await clubMembers.findOne({
            clubId: club._id,
            userId: new ObjectId(req.user.id),
            role: { $in: ["owner", "admin"] },
        });

        if (membership == null) {
            return res.status(403).json({
                message:
                    "You don't have permission to remove players from teams",
            });
        }

        await teamxplayers.deleteOne({
            playerId: playerId,
        });

        res.status(200).json({
            message: "Player removed from team successfully",
        });
    } catch (error) {
        console.error("Error during removing player from team:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ tournamentId: string }>} */
export async function getAllAssignedPlayers(req, res) {
    try {
        const teamPlayers = await teams.aggregate([
            {
                $match: {
                    tournamentId: new ObjectId(req.params.tournamentId),
                },
            },
            {
                $lookup: {
                    from: "teamxplayers",
                    localField: "_id",
                    foreignField: "teamId",
                    as: "players",
                },
            },
            {
                $addFields: {
                    teamId: "$_id",
                    playerIds: {
                        $map: {
                            input: "$players",
                            as: "player",
                            in: "$$player.playerId",
                        },
                    },
                },
            },
            { $project: { teamStats: 0, players: 0, _id: 0, tournamentId: 0 } },
        ]).toArray();

        res.status(200).json(teamPlayers);
    } catch (error) {
        console.error("Error during removing player from team:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const UPDATE_PLAYER_SCHEMA = z
    .object({
        name: z.string().trim().min(1).max(256).optional(),
    })
    .strict();

/** @type {import("express").RequestHandler<{ playerId: string }>} */
export async function updatePlayer(req, res) {
    try {
        const parsed = UPDATE_PLAYER_SCHEMA.parse(req.body);
        const playerId = new ObjectId(req.params.playerId);

        const player = await players.findOne({ _id: playerId });
        if (player == null) {
            return res.status(404).json({ message: "Player not found" });
        }

        const club = await clubs.findOne({
            _id: player.clubId,
        });
        if (club == null) {
            return res.status(404).json({ message: "Club not found" });
        }

        const membership = await clubMembers.findOne({
            clubId: club._id,
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

        const club = await clubs.findOne({
            _id: player.clubId,
        });
        if (club == null) {
            return res.status(404).json({ message: "Club not found" });
        }

        const membership = await clubMembers.findOne({
            clubId: club._id,
            userId: new ObjectId(req.user.id),
            role: { $in: ["owner", "admin"] },
        });

        if (membership == null) {
            return res.status(403).json({
                message: "You don't have permission to delete this player",
            });
        }

        // delete player from team when deleting player

        const playerTeam = await teamxplayers.findOne({
            playerId: playerId,
        });
        if (playerTeam) {
            await teamxplayers.deleteOne({
                playerId: playerId,
            });
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
