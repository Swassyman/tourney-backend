import { ObjectId } from "mongodb";
import z, { ZodError } from "zod";
import {
    clubMembers,
    matches,
    players,
    stages,
    teams,
    tournaments,
} from "../config/db.js";

const CREATE_SCHEMA = z.object({
    name: z.string().trim().min(3).max(256),
    clubId: z.string().trim().min(1),
    startTime: z.string().optional(), // todo: convert to datetime
    endTime: z.string().optional(),
    settings: z.object({
        rankingConfig: z.object({
            winPoints: z.number().min(0).default(3),
            drawPoints: z.number().min(0).default(1),
            lossPoints: z.number().default(0), // set up a min value (can go negative)
            addScorePoints: z.boolean().default(false),
        }).optional(),
    }).optional(),
}).strict();

/** @type {import("express").RequestHandler} */
export async function createTournament(req, res) {
    try {
        const parsed = CREATE_SCHEMA.parse(req.body);

        const membership = await clubMembers.findOne({
            clubId: new ObjectId(parsed.clubId),
            userId: new ObjectId(req.user.id),
            role: "owner",
        });

        if (membership == null) {
            return res.status(403).json({
                message:
                    "You don't have permission to create tournaments in this club",
            });
        }

        const { insertedId: tournamentId } = await tournaments.insertOne({
            name: parsed.name,
            clubId: new ObjectId(parsed.clubId),
            createdAt: new Date(),
            startTime: parsed.startTime ? new Date(parsed.startTime) : null,
            endTime: parsed.endTime ? new Date(parsed.endTime) : null,
            settings: {
                rankingConfig: {
                    winPoints: parsed.settings?.rankingConfig?.winPoints ?? 3,
                    drawPoints: parsed.settings?.rankingConfig?.drawPoints ?? 1,
                    lossPoints: parsed.settings?.rankingConfig?.lossPoints ?? 0,
                    addScorePoints:
                        parsed.settings?.rankingConfig?.addScorePoints ?? false,
                },
            },
        });

        res.status(201).json({ tournamentId: tournamentId });
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);

            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during creating a tournament:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ tournamentId: string }>} */
export async function getTournament(req, res) {
    try {
        const tournament = await tournaments.findOne({
            _id: new ObjectId(req.params.tournamentId),
        });

        if (tournament == null) {
            return res.status(404).json({
                message: "Tournament not found",
            });
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

        return res.status(200).json(tournament);
    } catch (error) {
        console.error("Error during getting tournament:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}



const UPDATE_SCHEMA = z.object({
    name: z.string().trim().min(3).max(256).optional(),
    startTime: z.iso.datetime().optional(),
    endTime: z.string().optional(),
    settings: z.object({
        rankingConfig: z.object({
            winPoints: z.number().min(0).optional(),
            drawPoints: z.number().min(0).optional(),
            lossPoints: z.number().min(0).optional(),
            addScorePoints: z.boolean().optional(),
        }).optional(),
    }).optional(),
}).strict();

/** @type {import("express").RequestHandler<{ tournamentId: string }>} */
export async function updateTournament(req, res) {
    try {
        const parsed = UPDATE_SCHEMA.parse(req.body);

        const tournament = await tournaments.findOne({
            _id: new ObjectId(req.params.tournamentId),
        });

        if (tournament == null) {
            return res.status(404).json({
                message: "Tournament not found",
            });
        }

        // Verify user has permission (owner or admin)
        const membership = await clubMembers.findOne({
            clubId: tournament.clubId,
            userId: new ObjectId(req.user.id),
            role: { $in: ["owner", "admin"] },
        });

        if (membership == null) {
            return res.status(403).json({
                message: "You don't have permission to update this tournament",
            });
        }

        const updateDoc = {};
        if (parsed.name) updateDoc.name = parsed.name;
        if (parsed.startTime) updateDoc.startTime = new Date(parsed.startTime);
        if (parsed.endTime) updateDoc.endTime = new Date(parsed.endTime);
        if (parsed.settings?.rankingConfig) {
            updateDoc["settings.rankingConfig"] = {
                ...tournament.settings?.rankingConfig,
                ...parsed.settings.rankingConfig,
            };
        }

        const { modifiedCount } = await tournaments.updateOne(
            { _id: new ObjectId(req.params.tournamentId) },
            { $set: updateDoc },
        );

        if (modifiedCount === 0) {
            return res.status(400).json({
                message: "No changes were made",
            });
        }

        const updatedTournament = await tournaments.findOne({
            _id: new ObjectId(req.params.tournamentId),
        });

        res.status(200).json(updatedTournament);
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);

            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during updating tournament:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ tournamentId: string }>} */
export async function deleteTournament(req, res) {
    try {
        const tournament = await tournaments.findOne({
            _id: new ObjectId(req.params.tournamentId),
        });

        if (tournament == null) {
            return res.status(404).json({
                message: "Tournament not found",
            });
        }

        const membership = await clubMembers.findOne({
            clubId: tournament.clubId,
            userId: new ObjectId(req.user.id),
            role: "owner",
        });

        if (membership == null) {
            return res.status(403).json({
                message: "You don't have permission to delete this tournament",
            });
        }

        const { deletedCount } = await tournaments.deleteOne({
            _id: new ObjectId(req.params.tournamentId),
        });

        if (deletedCount === 0) {
            return res.status(404).json({
                message: "Could not find the specified tournament",
            });
        }

        if (deletedCount > 0) {
            await Promise.all([
                teams.deleteMany({ tournamentId: tournament._id }),
                players.deleteMany({ tournamentId: tournament._id }),
                matches.deleteMany({ tournamentId: tournament._id }),
                stages.deleteMany({ tournamentId: tournament._id }),
            ]);
        }

        res.status(200).json({
            message: "Deleted tournament successfully",
        });
    } catch (error) {
        console.error("Error during deleting tournament:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ tournamentId: string }>} */
export async function getTournamentTeams(req, res) {
    try {
        const tournamentId = new ObjectId(req.params.tournamentId);

        const tournament = await tournaments.findOne({ _id: tournamentId });
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

        const tournamentTeams = await teams.find({
            tournamentId: tournamentId,
        }).sort({ "stats.score": -1, "stats.wins": -1 }).toArray();

        res.status(200).json(tournamentTeams);
    } catch (error) {
        console.error("Error during getting tournament teams:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ tournamentId: string }>} */
export async function getTournamentMatches(req, res) {
    try {
        const tournamentId = new ObjectId(req.params.tournamentId);

        const tournament = await tournaments.findOne({ _id: tournamentId });
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

        const tournamentMatches = await matches.find({
            tournamentId: tournamentId,
        })
            .sort({ startTime: 1 })
            .toArray();

        res.status(200).json(tournamentMatches);
    } catch (error) {
        console.error("Error during getting tournament matches:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ tournamentId: string }>} */
export async function getTournamentPlayers(req, res) {
    try {
        const tournamentId = new ObjectId(req.params.tournamentId);

        const tournament = await tournaments.findOne({ _id: tournamentId });
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

        const tournamentPlayers = await players.find({
            tournamentId: tournamentId,
        }).sort({ name: 1 }).toArray();

        res.status(200).json(tournamentPlayers);
    } catch (error) {
        console.error("Error during getting tournament players:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ tournamentId: string }>} */
export async function getTournamentStages(req, res) {
    try {
        const tournamentId = new ObjectId(req.params.tournamentId);

        const tournament = await tournaments.findOne({ _id: tournamentId });
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

        const tournamentStages = await stages.find({
            tournamentId: tournamentId,
        }).sort({ order: 1 }).toArray();

        res.status(200).json(tournamentStages);
    } catch (error) {
        console.error("Error during getting tournament stages:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}