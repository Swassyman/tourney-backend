import { verify } from "@node-rs/argon2";
import { joseAlgorithmHS256, JWSRegisteredHeaders, JWTRegisteredClaims, parseJWT } from "@oslojs/jwt";

export function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.splice(7);
    const isValid = verify(
        token,
        joseAlgorithmHS256,
        new TextEncoder().encode(process.env.JWT_SECRET),
    );
    if (!isValid) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const [header, payload] = parseJWT(token);
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

    req.user = payload;
    next();
}
