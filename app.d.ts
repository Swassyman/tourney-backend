import "express";
import { JWTPayload } from "jose";
import { ObjectId } from "mongodb";

type WithId<T> = {
    _id?: ObjectId;
} & T;

declare global {
    namespace Tourney {
        interface SessionUser {
            id: string;
        }

        type IJWTPayload = JWTPayload & {
            userId: string;
        };

        type ICookies = {
            refreshToken?: string;
        };

        type User = WithId<{
            name: string;
            handle: string;
            email: string;
            passwordHash: string;
        }>;

        // type UserRefreshToken = WithId<{
        //     userId: ObjectId;
        //     refreshToken: string;
        // }>;

        type Club = WithId<{
            name: string;
            handle: string;
        }>;

        type ClubMember = WithId<{
            userId: ObjectId;
            clubId: ObjectId;
            role: "owner" | "admin" | "member";
            joined_at: Date;
        }>;

        type Team = WithId<
            {
                tournamentId: ObjectId;
                name: string;
                teamStats: TeamStats;
            }
        >;

        type TeamStats = {
            matchesPlayed: number;
            points: number;
            wins: number;
            losses: number;
            draws: number;
            goalsFor: number;
            goalsAgainst: number;
        };

        type Player = WithId<{
            clubId: ObjectId;
            name: string;
        }>;

        type TeamXPlayer = WithId<{
            teamId: ObjectId;
            playerId: ObjectId;
        }>;

        type Tournament = WithId<{
            name: string;
            clubId: ObjectId;
            createdAt: Date;
            startTime: Date | null;
            endTime: Date | null;
            settings: TournamentSettings;
            winnerId?: ObjectId;
        }>;

        type TournamentSettings = {
            rankingConfig: RankingConfig;
        };

        type RankingConfig = {
            winPoints: number;
            drawPoints: number;
            lossPoints: number;
            addScorePoints: boolean;
        };

        // stages of a tournament
        type Stage = WithId<{
            tournamentId: ObjectId;
            name: string;
            config: StageConfig;
            order: number;
        }>;

        // config for each stage
        type StageConfig = {
            // League settings
            teamsCount?: number;
            rounds?: number;
        };

        // each stage
        type StageItem = WithId<{
            stageId: ObjectId;
            name?: string;
            inputs: StageInput[]; // teams are assigned on stage creation
        }>;

        // table in league (group in groups, division [quarter, semi] in knockout)
        type StageInput = {
            teamId?: ObjectId;
        };

        type Round = WithId<{
            stageId: ObjectId;
            number: number;
        }>;

        type Match = WithId<
            {
                roundId: ObjectId;
                startTime?: Date;
                endTime?: Date;
                participant1?: ObjectId;
                participant2?: ObjectId;
                court?: ObjectId;
                winnerId?: ObjectId;
                score: { team1Score: number; team2Score: number };
            }
        >;

        type Court = WithId<{ name: string }>;
    }

    namespace Express {
        interface Request {
            cookies: null;
            user?: Tourney.SessionUser;
        }
    }
}

export {};
