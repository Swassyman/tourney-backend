import "express";
import { JWTPayload } from "jose";
import { ObjectId } from "mongodb";

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

        interface User {
            username: string;
            email: string;
            passwordHash: string;
        }

        interface UserRefreshToken {
            userId: ObjectId;
            refreshToken: string;
        }

        interface Club {
            name: string;
        }

        interface ClubMember {
            userId: ObjectId;
            clubId: ObjectId;
            role: "owner" | "admin" | "member";
            status: "active" | "invite_pending";
            joined_at: Date;
        }
    }

    namespace Express {
        interface Request {
            cookies: null;
            user?: Tourney.SessionUser;
        }
    }
}

export {};
