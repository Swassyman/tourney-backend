import { jwtVerify } from "jose";
import {
    JWS_ALG_HEADER_PARAMETER,
    JWT_ACCESS_SECRET_SIGN_KEY,
} from "../utilities/jwt-session.js";

const BEARER_PREFIX = "Bearer ";

/** @type {import("express").RequestHandler} */
export async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (
        typeof authHeader !== "string"
        || !authHeader.startsWith(BEARER_PREFIX)
        || authHeader.length <= BEARER_PREFIX.length
    ) {
        return res.status(401).json({ message: "Unauthorised" });
    }

    try {
        const accessToken = authHeader.slice(BEARER_PREFIX.length);
        const { payload } =
            /** @type {import("jose").JWTVerifyResult<Tourney.IJWTPayload>} */ (await jwtVerify(
                accessToken,
                JWT_ACCESS_SECRET_SIGN_KEY,
                { algorithms: [JWS_ALG_HEADER_PARAMETER] },
            ));

        req.user = {
            id: payload.userId,
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorised" });
    }
}
