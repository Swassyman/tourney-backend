import "express";
import { JWTPayload } from "jose";
import { ObjectId } from "mongodb";

declare global {
    namespace Tourney {
        interface SessionUser {
            id: string;
        }

        interface User {
            username: string;
            email: string;
            passwordHash: string;
        }

        interface UserRefreshToken {
            userId: ObjectId;
            refreshToken: string;
        }

        type IJWTPayload = JWTPayload & {
            userId: string;
        };

        type ICookies = {
            refreshToken?: string;
        };

        // interface Club {
        //     _id: string;
        //     name: string;
        // }
        // interface User_X_Club {
        //     _id: string;
        //     userId: ObjectId;
        //     clubId: ObjectId;
        //     role: "admin" | "member";
        // }
        // interface Tournament {
        //     _id: string;
        //     name: string;
        //     createdAt: Date;
        //     startTime: Date;
        //     clubId: ObjectId;
        //     status: "upcoming" | "ongoing" | "finished";
        // }
        // interface Stage {
        //     _id: string;
        //     createdAt: Date;
        //     tournamentId: ObjectId;
        // }
        // interface stageItem {
        //     _id: string;
        //     stageId: ObjectId;
        //     name: string;
        //     teamCount: number;
        //     type: "single-elimination" | "double-elimination" | "round-robin";
        // }
        // interface stageItemInput {
        //     _id: string;
        //     slot: number;
        //     tournamentId: ObjectId;
        //     stageItemId: ObjectId;
        //     teamId: ObjectId;
        //     winnerFromStageItemId?: ObjectId;
        //     winnerPosition?: number;
        //     points: number;
        //     wins?: number;
        //     draws?: number;
        //     losses?: number;
        // }
        // interface Round {
        //     _id: string;
        //     name: string;
        //     stageItemId: ObjectId;
        // }
        // interface Match {
        //     _id: string;
        //     createdAt: Date;
        //     startTime: Date;
        //     duration: number;
        //     roundId: ObjectId;
        //     stageItemInput1Id: ObjectId;
        //     stageItemInput2Id: ObjectId;
        //     winnerStageItemInput1Id?: ObjectId;
        //     winnerStageItemInput2Id?: ObjectId;
        //     courtId: ObjectId;
        //     stageItemInput1Score?: number;
        //     stageItemInput2Score?: number;
        //     positionInSchedule: number;
        // }
        // interface Team {
        //     _id: string;
        //     name: string;
        //     tournamentId: ObjectId;
        //     score?: number;
        //     wins?: number;
        //     draws?: number;
        //     losses?: number;
        // }
        // interface Player {
        //     _id: string;
        //     name: string;
        //     tournamentId: ObjectId;
        //     score?: number;
        //     wins?: number;
        //     draws?: number;
        //     losses?: number;
        // }
        // interface Player_X_Team {
        //     _id: string;
        //     playerId: ObjectId;
        //     teamId: ObjectId;
        // }
        // interface Ranking {
        //     _id: string;
        //     tournamentId: ObjectId;
        //     position?: number;
        //     winPoints: number;
        //     drawPoints: number;
        //     lossPoints: number;
        // }
        // interface Court {
        //     _id: string;
        //     name: string;
        //     tournamentId: ObjectId;
        // }
    }

    namespace Express {
        interface Request {
            cookies: null;
            user?: Tourney.SessionUser;
        }
    }
}

export {};
