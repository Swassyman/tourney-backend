import { ObjectId } from "mongodb";
import z, { ZodError } from "zod";
import { clubMembers, tournaments, matches, teams } from "../config/db.js";

/** @type {import("express").RequestHandler<{ matchId: string }>} */
export async function getMatch(req, res) {
    try {
        const matchId = new ObjectId(req.params.matchId);

        const match = await matches.findOne({ _id: matchId });
        if (match == null) {
            return res.status(404).json({ message: "Match not found" });
        }

        const tournament = await tournaments.findOne({ _id: match.tournamentId });
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

        res.status(200).json(match);
    } catch (error) {
        console.error("Error during getting match:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const UPDATE_WINNER_SCHEMA = z.object({
    winnerId: z.string().trim().min(1),
}).strict();

/** @type {import("express").RequestHandler<{ matchId: string }>} */
export async function updateMatchWinner(req, res) {
    try {
        const parsed = UPDATE_WINNER_SCHEMA.parse(req.body);
        const matchId = new ObjectId(req.params.matchId);
        const winnerId = new ObjectId(parsed.winnerId);

        const match = await matches.findOne({ _id: matchId });
        if (match == null) {
            return res.status(404).json({ message: "Match not found" });
        }

        if (
            match.participant1.toString() !== winnerId.toString() &&
            match.participant2.toString() !== winnerId.toString()
        ) {
            return res.status(400).json({
                message: "Winner must be one of the match participants",
            });
        }

        const tournament = await tournaments.findOne({ _id: match.tournamentId });
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
                message: "You don't have permission to update match results",
            });
        }

        const loserId = match.participant1.toString() === winnerId.toString()
            ? match.participant2
            : match.participant1;

        const { modifiedCount } = await matches.updateOne(
            { _id: matchId },
            {
                $set: {
                    winnerId: winnerId,
                    endTime: new Date(),
                },
            }
        );

        if (modifiedCount === 0) {
            return res.status(400).json({ message: "Failed to update match winner" });
        }

        await updateTeamStats(winnerId, loserId, tournament);

        const updatedMatch = await matches.findOne({ _id: matchId });
        res.status(200).json(updatedMatch);
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during updating match winner:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function updateTeamStats(winnerId, loserId, tournament) {
    const rankingConfig = tournament.settings?.rankingConfig || {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        addScorePoints: false,
    };

    await teams.updateOne(
        { _id: winnerId },
        {
            $inc: {
                "teamStats.wins": 1,
                "teamStats.score": rankingConfig.winPoints,
            },
        }
    );

    await teams.updateOne(
        { _id: loserId },
        {
            $inc: {
                "teamStats.losses": 1,
                "teamStats.score": rankingConfig.lossPoints,
            },
        }
    );
}

const DECLARE_DRAW_SCHEMA = z.object({}).strict();

/** @type {import("express").RequestHandler<{ matchId: string }>} */
export async function declareMatchDraw(req, res) {
    try {
        const matchId = new ObjectId(req.params.matchId);

        const match = await matches.findOne({ _id: matchId });
        if (match == null) {
            return res.status(404).json({ message: "Match not found" });
        }

        const tournament = await tournaments.findOne({ _id: match.tournamentId });
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
                message: "You don't have permission to update match results",
            });
        }

        const rankingConfig = tournament.settings?.rankingConfig || {
            winPoints: 3,
            drawPoints: 1,
            lossPoints: 0,
            addScorePoints: false,
        };

        await matches.updateOne(
            { _id: matchId },
            {
                $set: {
                    winnerId: null,
                    endTime: new Date(),
                },
            }
        );

        await teams.updateOne(
            { _id: match.participant1 },
            {
                $inc: {
                    "teamStats.draws": 1,
                    "teamStats.score": rankingConfig.drawPoints,
                },
            }
        );

        await teams.updateOne(
            { _id: match.participant2 },
            {
                $inc: {
                    "teamStats.draws": 1,
                    "teamStats.score": rankingConfig.drawPoints,
                },
            }
        );

        const updatedMatch = await matches.findOne({ _id: matchId });
        res.status(200).json(updatedMatch);
    } catch (error) {
        console.error("Error during declaring match draw:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const SCHEDULE_MATCH_SCHEMA = z.object({
    startTime: z.iso.datetime(),
    courtId: z.string().optional(),
}).strict();

/** @type {import("express").RequestHandler<{ matchId: string }>} */
export async function scheduleMatch(req, res) {
    try {
        const parsed = SCHEDULE_MATCH_SCHEMA.parse(req.body);
        const matchId = new ObjectId(req.params.matchId);

        const match = await matches.findOne({ _id: matchId });
        if (match == null) {
            return res.status(404).json({ message: "Match not found" });
        }

        const tournament = await tournaments.findOne({ _id: match.tournamentId });
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
                message: "You don't have permission to schedule matches",
            });
        }

        const updateDoc = {
            startTime: new Date(parsed.startTime),
        };

        if (parsed.courtId) {
            updateDoc.court = {
                _id: new ObjectId(parsed.courtId),
                name: ""
            };
        }

        const { modifiedCount } = await matches.updateOne(
            { _id: matchId },
            { $set: updateDoc }
        );

        if (modifiedCount === 0) {
            return res.status(400).json({ message: "Failed to schedule match" });
        }

        const updatedMatch = await matches.findOne({ _id: matchId });
        res.status(200).json(updatedMatch);
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during scheduling match:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ matchId: string }>} */
export async function deleteMatch(req, res) {
    try {
        const matchId = new ObjectId(req.params.matchId);

        const match = await matches.findOne({ _id: matchId });
        if (match == null) {
            return res.status(404).json({ message: "Match not found" });
        }

        const tournament = await tournaments.findOne({ _id: match.tournamentId });
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
                message: "You don't have permission to delete matches",
            });
        }

        if (match.winnerId || match.endTime) {
            return res.status(400).json({
                message: "Cannot delete matches with results",
            });
        }

        const { deletedCount } = await matches.deleteOne({ _id: matchId });

        if (deletedCount === 0) {
            return res.status(404).json({
                message: "Could not find the specified match",
            });
        }

        res.status(200).json({
            message: "Match deleted successfully",
        });
    } catch (error) {
        console.error("Error during deleting match:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}