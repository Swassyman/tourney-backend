import "express";

declare global {
    namespace Tourney {
        interface User {
            id: string;
            name: string;
        }
    }

    namespace Express {
        interface Request {
            user?: Tourney.User;
        }
    }
}

export {};
