import { verify } from "@node-rs/argon2";
import {
    joseAlgorithmHS256,
    JWSRegisteredHeaders,
    JWTRegisteredClaims,
    parseJWT,
} from "@oslojs/jwt";

const JWT_SECRET_TOKEN = process.env.JWT_SECRET;
if (typeof JWT_SECRET_TOKEN !== "string" || JWT_SECRET_TOKEN.length === 0) {
    throw new Error("Invalid JWT_SECRET environment variable");
}

const BEARER_PREFIX = "Bearer ";

/** @type {import("express").RequestHandler} */
export async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (
        !authHeader.startsWith(BEARER_PREFIX)
        || authHeader.length <= BEARER_PREFIX.length
    ) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.slice(BEARER_PREFIX.length);
    const isValid = await verify(
        token,
        joseAlgorithmHS256,
    );
    if (!isValid) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const [header, payload] = parseJWT(token); // do i need to check payload?
    const headerParams = new JWSRegisteredHeaders(header);
    if (headerParams.algorithm() !== joseAlgorithmHS256) {
        return res.status(401).json({ error: "Unsupported algorithm" });
    }
    const claims = new JWTRegisteredClaims(payload);
    if (!claims.verifyExpiration()) {
        return res.status(401).json({ error: "Token expired" });
    }
    if (claims.hasNotBefore() && !claims.verifyNotBefore()) {
        return res.status(401).json({ error: "Token not valid yet" });
    }

    // todo: fix
    req.user = payload;
    next();
}
