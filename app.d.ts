import "express";
import { int } from "zod";

declare global {
    namespace Tourney {
        interface User {
            id: string;
            name: string;
            email: string;
            passwordHash: string;
        }
        interface Club {
            id: string;
            name: string;
        }
        interface User_X_Club {
            id: string;
            userId: ObjectId;
            clubId: ObjectId;
            role: "admin" | "member";
        }
        interface Tournament {
            id: string;
            name: string;
            createdAt: Date;
            startTime: Date;
            clubId: ObjectId;
            status: "upcoming" | "ongoing" | "finished";
        }
        interface Stage {
            id: string;
            createdAt: Date;
            tournamentId: ObjectId;
        }
        interface stageItem {
            id: string;
            stageId: ObjectId;
            name: string;
            teamCount: number;
            type: "single-elimination" | "double-elimination" | "round-robin";
        }
        interface stageItemInput {
            id: string;
            slot: number;
            tournamentId: ObjectId;
            stageItemId: ObjectId;
            teamId: ObjectId;
            winnerFromStageItemId?: ObjectId;
            winnerPosition?: number;
            points: number;
            wins?: number;
            draws?: number;
            losses?: number;
        }
        interface Round {
            id: string;
            name: string;
            stageItemId: ObjectId;
        }
        interface Match {
            id: string;
            createdAt: Date;
            startTime: Date;
            duration: number;
            roundId: ObjectId;
            stageItemInput1Id: ObjectId;
            stageItemInput2Id: ObjectId;
            winnerStageItemInput1Id?: ObjectId;
            winnerStageItemInput2Id?: ObjectId;
            courtId: ObjectId;
            stageItemInput1Score?: number;
            stageItemInput2Score?: number;
            positionInSchedule: number;
        }
        interface Team {
            id: string;
            name: string;
            tournamentId: ObjectId;
            score?: number;
            wins?: number;
            draws?: number;
            losses?: number;
        }
        interface Player {
            id: string;
            name: string;
            tournamentId: ObjectId;
            score?: number;
            wins?: number;
            draws?: number;
            losses?: number;
        }
        interface Player_X_Team {
            id: string;
            playerId: ObjectId;
            teamId: ObjectId;
        }
        interface Ranking {
            id: string;
            tournamentId: ObjectId;
            position?: number;
            winPoints: number;
            drawPoints: number;
            lossPoints: number;
        }
        interface Court {
            id: string;
            name: string;
            tournamentId: ObjectId;
        }
    }

    namespace Express {
        interface Request {
            user?: Tourney.User;
        }
    }
}

export {};
