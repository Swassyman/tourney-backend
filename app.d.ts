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

        type Tournament = WithId<{
            name: string;
            clubId: ObjectId;
            createdAt: Date;
            startTime: Date | null;
            endTime: Date | null;
            settings: TournamentSettings;
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
            type: "league" | "knockout" | "groups";
            config: StageConfig;
            order: number;
            items: StageItem[];
        }>;

        // config for each stage
        type StageConfig = {
            // League settings
            teamsCount?: number;
            rounds?: number;

            // Knockout settings
            startingRound?:
                | "final"
                | "semi"
                | "quarter"
                | "roundOf16"
                | "roundOf32";
            thirdPlaceMatch?: boolean;

            // Groups settings
            groupsCount?: number;
            teamsPerGroup?: number;
            advancePerGroup?: number;
        };

        // each stage
        type StageItem = withId<{
            name: string;
            teamCount: number;
            inputs: StageInput[];
        }>;

        type StageInput = {
            slot: number; // some matches like A vs B, some teams can be B (this isnt random, its assigned)
            sourceType: "direct" | "winner" | "loser"; // direct - seeded team, winner/loser - team from a previous match decision
            teamId?: ObjectId;
            sourceStageItemId?: ObjectId;
            sourceMatchId?: ObjectId;
        };
    }

    namespace Express {
        interface Request {
            cookies: null;
            user?: Tourney.SessionUser;
        }
    }
}

export {};
