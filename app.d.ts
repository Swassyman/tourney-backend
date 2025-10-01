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
    }

    namespace Express {
        interface Request {
            cookies: null;
            user?: Tourney.SessionUser;
        }
    }
}

export {};
