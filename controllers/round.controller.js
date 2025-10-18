import { ObjectId } from "mongodb";
import z, { ZodError } from "zod";
import {
    clubMembers,
    matches,
    rounds,
    stageItems,
    stages,
    teams,
    tournaments,
} from "../config/db.js";

function generateLeagueRounds(teamIds, stageId) {
    const rounds = [];
    const matches = [];
    const teams = [...teamIds];

    if (teams.length % 2 !== 0) {
        teams.push(null);
    }

    const numTeams = teams.length;
    const numRounds = numTeams - 1;
    const matchesPerRound = numTeams / 2;

    for (let round = 0; round < numRounds; round++) {
        rounds.push({
            stageId: stageId,
            number: round + 1,
        });

        for (let i = 0; i < matchesPerRound; i++) {
            const home = teams[i];
            const away = teams[numTeams - 1 - i];

            if (home !== null && away !== null) {
                matches.push({
                    participant1: home,
                    participant2: away,
                    _roundIndex: round,
                    score: {
                        team1Score: 0,
                        team2Score: 0,
                    },
                });
            }
        }

        teams.splice(1, 0, teams.pop());
    }
    return { rounds, matches };
}

/** @type {import("express").RequestHandler<{ stageId: string }>} */
export async function generateRounds(req, res) {
    try {
        let generatedRounds = [];
        let generatedMatches = [];

        const stageId = new ObjectId(req.params.stageId);
        const stage = await stages.findOne({
            _id: stageId,
        });
        if (stage == null) {
            return res.status(404).json({ message: "Stage not Found" });
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
                message: "You do not have permission to generate rounds",
            });
        }

        const existingRounds = await rounds.countDocuments({
            stageId: stageId,
        });
        if (existingRounds > 0) {
            return res.status(400).json({
                message: "Rounds are already generated",
            });
        }

        const stageItem = await stageItems.findOne({
            stageId: stageId,
        });
        if (stageItem == null) {
            return res.status(500).json({
                message: "Table was not generated on stage creation",
            });
        }

        const teamInputs = stageItem.inputs.filter(input => input.teamId);
        if (teamInputs.length < 2) {
            return res.status(400).json({
                message: "2 or more teams needed to generate",
            });
        }

        const teamIds = teamInputs.map(input => input.teamId);
        const result = generateLeagueRounds(teamIds, stageId);

        generatedRounds = result.rounds;
        generatedMatches = result.matches;

        if (generatedRounds.length == 0) {
            return res.status(400).json({
                message: "Could not generate rounds",
            });
        }

        const roundsResult = await rounds.insertMany(generatedRounds);

        generatedMatches = generatedMatches.map(match => ({
            ...match,
            roundId: roundsResult.insertedIds[match._roundIndex],
        }));

        generatedMatches.forEach(match => delete match._roundIndex);

        await matches.insertMany(generatedMatches);

        res.status(201).json({
            rounds: generatedRounds,
            matches: generatedMatches,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            const message = error.issues.length === 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message });
        }

        console.error("Error generating rounds:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ stageId: string }>} */
export async function getRounds(req, res) {
    try {
        const stageId = new ObjectId(req.params.stageId);

        const stage = await stages.findOne({ _id: stageId });
        if (stage == null) {
            return res.status(400).json({ message: "Stage not found" });
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

        const stageRounds = await rounds.find({
            stageId: stageId,
        }).sort({ number: 1 }).toArray();

        res.status(200).json(stageRounds);
    } catch (error) {
        console.error("Error during getting rounds:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ roundId: string }>} */
export async function getRoundMatches(req, res) {
    try {
        const roundId = new ObjectId(req.params.roundId);

        const round = await rounds.findOne({ _id: roundId });
        if (round == null) {
            return res.status(404).json({ message: "Round not found" });
        }

        const stage = await stages.findOne({ _id: round.stageId });
        if (stage == null) {
            return res.status(400).json({ message: "Stage not found" });
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

        const roundMatches = await matches.find({
            roundId: roundId,
        }).toArray();

        res.status(200).json(roundMatches);
    } catch (error) {
        console.error("Error during getting round matches:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
