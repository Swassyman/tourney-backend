import "express";

declare global {
    namespace Express {
        interface User {
            id: string;
            name: string;
        }

        interface Request {
            user?: User;
        }
    }
}

export {};
