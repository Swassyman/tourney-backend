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

/** @type {import("express").RequestHandler<{ stageItemId: string }>} */
export async function generateRounds(req, res) {
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
                message: "You don't have permission to generate rounds",
            });
        }

        const existingRounds = await rounds.countDocuments({
            stage_item_id: stageItemId,
        });

        if (existingRounds > 0) {
            return res.status(400).json({
                message: "Rounds already generated for this stage item",
            });
        }

        const teamInputs = stageItem.inputs.filter(
            input => input.sourceType === "direct" && input.teamId,
        );

        if (teamInputs.length < 2) {
            return res.status(400).json({
                message: "Need at least 2 teams to generate matches",
            });
        }

        const teamIds = teamInputs.map(input => input.teamId);

        const teamDocs = await teams.find({
            _id: { $in: teamIds },
        }).toArray();

        const teamMap = new Map(teamDocs.map(t => [t._id.toString(), t.name]));

        let generatedRounds = [];
        let generatedMatches = [];

        if (stage.type === "league" || stage.type === "groups") {
            // Round-robin tournament
            const result = generateRoundRobinSchedule(
                stageItemId,
                stage.tournamentId,
                stage._id,
                teamIds,
                teamMap,
                stage.config.rounds || 1,
                stageItem.name,
            );
            generatedRounds = result.rounds;
            generatedMatches = result.matches;
        } else if (stage.type === "knockout") {
            // Single elimination
            const result = generateKnockoutMatch(
                stageItemId,
                stage.tournamentId,
                stage._id,
                teamIds,
                teamMap,
                stageItem.name,
            );
            generatedRounds = result.rounds;
            generatedMatches = result.matches;
        }

        if (generatedRounds.length > 0) {
            const roundsResult = await rounds.insertMany(generatedRounds);
            const insertedRoundIds = Object.values(roundsResult.insertedIds);

            generatedMatches.forEach((match) => {
                const roundIndex = match._roundIndex;
                match.round_id = insertedRoundIds[roundIndex];
                delete match._roundIndex;
            });

            const matchesResult = await matches.insertMany(generatedMatches);

            res.status(201).json({
                message: "Rounds and matches generated successfully",
                roundsCreated: generatedRounds.length,
                matchesCreated: generatedMatches.length,
            });
        } else {
            res.status(400).json({
                message: "Could not generate rounds",
            });
        }
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

function generateRoundRobinSchedule(
    stageItemId,
    tournamentId,
    stageId,
    teamIds,
    teamMap,
    numCycles,
    itemName,
) {
    const rounds = [];
    const matches = [];
    const teams = [...teamIds];
    const numTeams = teams.length;

    // If odd number of teams, add a "bye" (null)
    if (numTeams % 2 !== 0) {
        teams.push(null);
    }

    const totalTeams = teams.length;
    const matchesPerRound = totalTeams / 2;
    const roundsPerCycle = totalTeams - 1;

    for (let cycle = 0; cycle < numCycles; cycle++) {
        for (let roundNum = 0; roundNum < roundsPerCycle; roundNum++) {
            const absoluteRoundNum = cycle * roundsPerCycle + roundNum + 1;
            const roundName = numCycles > 1
                ? `${itemName} - Cycle ${cycle + 1}, Round ${roundNum + 1}`
                : `${itemName} - Round ${roundNum + 1}`;

            rounds.push({
                stage_item_id: stageItemId,
                tournament_id: tournamentId,
                name: roundName,
                number: absoluteRoundNum,
            });

            const currentRoundIndex = rounds.length - 1;

            for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
                let home, away;

                if (matchIdx === 0) {
                    home = teams[0];
                    away = teams[totalTeams - 1];
                } else {
                    home = teams[matchIdx];
                    away = teams[totalTeams - 1 - matchIdx];
                }

                if (home !== null && away !== null) {
                    matches.push({
                        tournament_id: tournamentId,
                        stage_id: stageId,
                        stage_item_id: stageItemId,
                        round_id: null,
                        _roundIndex: currentRoundIndex,
                        created: new Date(),
                        status: "scheduled",
                        participant1: {
                            type: "team",
                            id: home,
                            name: teamMap.get(home.toString()) || "",
                            score: 0,
                        },
                        participant2: {
                            type: "team",
                            id: away,
                            name: teamMap.get(away.toString()) || "",
                            score: 0,
                        },
                        updated_at: new Date(),
                    });
                }
            }

            teams.splice(1, 0, teams.pop());
        }
    }

    return { rounds, matches };
}
function generateKnockoutMatch(
    stageItemId,
    tournamentId,
    stageId,
    teamIds,
    teamMap,
    itemName,
) {
    const rounds = [];
    const matches = [];

    if (teamIds.length < 2) {
        return { rounds, matches };
    }

    rounds.push({
        stage_item_id: stageItemId,
        tournament_id: tournamentId,
        name: itemName,
        number: 1,
    });

    matches.push({
        tournamentId: tournamentId,
        stageId: stageId,
        stageItemId: stageItemId,
        roundId: null,
        startTime: null,
        endTime: null,
        participant1: {
            tournamentId: tournamentId,
            id: teamIds[0],
            name: teamMap.get(teamIds[0].toString()) || "",
            teamStats: {
                score: 0
            }
        },
        participant2: {
            tournamentId: tournamentId,
            id: teamIds[1],
            name: teamMap.get(teamIds[1].toString()) || "",
            teamStats: {
                score: 0
            },
        },
    });

    return { rounds, matches };
}

/** @type {import("express").RequestHandler<{ stageItemId: string }>} */
export async function getRounds(req, res) {
    try {
        const stageItemId = new ObjectId(req.params.stageItemId);

        const stageItem = await stageItems.findOne({ _id: stageItemId });
        if (stageItem == null) {
            return res.status(404).json({ message: "Stage item not found" });
        }

        const tournament = await tournaments.findOne({
            _id: stageItem.tournament_id,
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
            stage_item_id: stageItemId,
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

        const tournament = await tournaments.findOne({
            _id: round.tournamentId,
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
            round_id: roundId,
        }).toArray();

        res.status(200).json(roundMatches);
    } catch (error) {
        console.error("Error during getting round matches:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}