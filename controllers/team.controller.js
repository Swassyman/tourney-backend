import { ObjectId } from "mongodb";
import z, { ZodError } from "zod";
import {
    clubMembers,
    matches,
    players,
    teams,
    tournaments,
} from "../config/db.js";

const CREATE_TEAM_SCHEMA = z.object({
    name: z.string().trim().min(1).max(256),
    tournamentId: z.string().trim().min(1),
}).strict();

/** @type {import("express").RequestHandler} */
export async function createTeam(req, res) {
    try {
        const parsed = CREATE_TEAM_SCHEMA.parse(req.body);
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
                    "You don't have permission to create teams in this tournament",
            });
        }

        const existingTeam = await teams.findOne({
            tournamentId: tournamentId,
            name: parsed.name,
        });

        if (existingTeam != null) {
            return res.status(400).json({
                message:
                    "A team with this name already exists in the tournament",
            });
        }

        const { insertedId: teamId } = await teams.insertOne({
            tournamentId: tournamentId,
            name: parsed.name,
            teamStats: {
                score: 0,
                wins: 0,
                draws: 0,
                losses: 0,
            },
        });

        res.status(201).json({ teamId: teamId });
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during creating team:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ teamId: string }>} */
export async function getTeam(req, res) {
    try {
        const teamId = new ObjectId(req.params.teamId);

        const team = await teams.findOne({ _id: teamId });
        if (team == null) {
            return res.status(404).json({ message: "Team not found" });
        }

        const tournament = await tournaments.findOne({
            _id: team.tournamentId,
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

        res.status(200).json(team);
    } catch (error) {
        console.error("Error during getting team:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const UPDATE_TEAM_SCHEMA = z.object({
    name: z.string().trim().min(1).max(256).optional(),
}).strict();

/** @type {import("express").RequestHandler<{ teamId: string }>} */
export async function updateTeam(req, res) {
    try {
        const parsed = UPDATE_TEAM_SCHEMA.parse(req.body);
        const teamId = new ObjectId(req.params.teamId);

        const team = await teams.findOne({ _id: teamId });
        if (team == null) {
            return res.status(404).json({ message: "Team not found" });
        }

        const tournament = await tournaments.findOne({
            _id: team.tournamentId,
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
                message: "You don't have permission to update this team",
            });
        }

        const updateDoc = {};
        if (parsed.name) {
            const existingTeam = await teams.findOne({
                tournamentId: team.tournamentId,
                name: parsed.name,
                _id: { $ne: teamId },
            });

            if (existingTeam != null) {
                return res.status(400).json({
                    message:
                        "A team with this name already exists in the tournament",
                });
            }

            updateDoc.name = parsed.name;
        }

        if (Object.keys(updateDoc).length === 0) {
            return res.status(400).json({ message: "No changes to update" });
        }

        const { modifiedCount } = await teams.updateOne(
            { _id: teamId },
            { $set: updateDoc },
        );

        if (modifiedCount === 0) {
            return res.status(400).json({ message: "No changes were made" });
        }

        const updatedTeam = await teams.findOne({ _id: teamId });
        res.status(200).json(updatedTeam);
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during updating team:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ teamId: string }>} */
export async function deleteTeam(req, res) {
    try {
        const teamId = new ObjectId(req.params.teamId);

        const team = await teams.findOne({ _id: teamId });
        if (team == null) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Verify access
        const tournament = await tournaments.findOne({
            _id: team.tournamentId,
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
                message: "You don't have permission to delete this team",
            });
        }

        const { deletedCount } = await teams.deleteOne({ _id: teamId });

        if (deletedCount === 0) {
            return res.status(404).json({
                message: "Could not find the specified team",
            });
        }

        // todo: Remove team from stage item inputs and matches or make sure everything else is deleted before deleting team (top down approach)

        res.status(200).json({
            message: "Deleted team successfully",
        });
    } catch (error) {
        console.error("Error during deleting team:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ teamId: string }>} */
export async function getTeamMatches(req, res) {
    try {
        const teamId = new ObjectId(req.params.teamId);

        const team = await teams.findOne({ _id: teamId });
        if (team == null) {
            return res.status(404).json({ message: "Team not found" });
        }

        const tournament = await tournaments.findOne({
            _id: team.tournamentId,
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

        const teamMatches = await matches.find({
            tournamentId: team.tournamentId,
            $or: [
                { participant1: teamId },
                { participant2: teamId },
            ],
        }).sort({ startTime: 1 }).toArray();

        res.status(200).json(teamMatches);
    } catch (error) {
        console.error("Error during getting team matches:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ teamId: string }>} */
export async function getTeamPlayers(req, res) {
    try {
        const teamId = new ObjectId(req.params.teamId);

        const team = await teams.findOne({ _id: teamId });
        if (team == null) {
            return res.status(404).json({ message: "Team not found" });
        }

        const tournament = await tournaments.findOne({
            _id: team.tournamentId,
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

        const teamPlayers = await players.find({
            teamId: teamId,
        }).sort({ name: 1 }).toArray();

        res.status(200).json(teamPlayers);
    } catch (error) {
        console.error("Error during getting team players:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
