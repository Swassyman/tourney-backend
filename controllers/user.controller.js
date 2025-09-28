import { hash, verify } from "@node-rs/argon2";
import { jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { fromError } from "zod-validation-error";
import { z, ZodError } from "zod/v4";
import { users } from "../config/db.js";
import {
    generateAccessToken,
    generateRefreshToken,
    JWS_ALG_HEADER_PARAMETER,
    JWT_REFRESH_SECRET_SIGN_KEY,
    JWT_REFRESH_TOKEN_EXPIRY,
} from "../utilities/jwt-session.js";

const REGISTER_SCHEMA = z.object({
    username: z.string()
        .min(3)
        .max(32)
        .trim(),
    // .toLowerCase(),
    // .refine((username) => !/[^a-zA-Z0-9]/.test(username)),
    email: z.email(),
    password: z.string().min(6).max(256),
}).strict();

// /** @typedef {z.infer<typeof REGISTER_SCHEMA>} IRegister*/

/** @type {import("express").RequestHandler} */
export async function register(req, res) {
    try {
        const { username, email, password } = REGISTER_SCHEMA.parse(req.body);
        const existingUser = await users.findOne({ emailid: email });
        if (existingUser != null) {
            return res.status(400).json({
                message: "Email ID is already used",
            });
        }

        await users.insertOne({
            username: username,
            email: email,
            passwordHash: await hash(password),
        });

        // todo: send a verification email
        res.status(201)
            .json({ message: "User registered successfully" });
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);

            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during registration:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const LOGIN_SCHEMA = z.object({
    email: z.email(),
    password: z.string().min(2).max(256),
}).strict();

/** @type {import("express").RequestHandler} */
export async function login(req, res) {
    try {
        const { email, password } = LOGIN_SCHEMA.parse(req.body);
        const user = await users.findOne({ email: email });
        if (!user) {
            return res
                .status(400)
                .json({ message: "Invalid email or password" });
        }

        const isPasswordValid = await verify(user.passwordHash, password);
        if (!isPasswordValid) {
            return res
                .status(400)
                .json({ message: "Invalid email or password" });
        }

        const userId = user._id.toString();
        const accessToken = await generateAccessToken({ userId });
        const refreshToken = await generateRefreshToken({ userId });

        res
            .status(200)
            .cookie("refreshToken", refreshToken, { // todo: make this a constant
                maxAge: JWT_REFRESH_TOKEN_EXPIRY,
                httpOnly: true,
                sameSite: "lax",
            })
            .json({ accessToken: accessToken });
    } catch (error) {
        if (error instanceof ZodError) {
            const parsed = fromError(error);
            return res
                .status(400)
                .json({ message: parsed.toString() });
        }
        console.error("Error during login:", error);
        return res
            .status(500)
            .json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler} */
export async function refresh(req, res) {
    /** @type {Tourney.ICookies} */
    const cookies = req.cookies;

    if (
        typeof cookies !== "object" || !("refreshToken" in cookies)
        || typeof cookies.refreshToken !== "string"
        || cookies.refreshToken.length === 0
    ) {
        return res
            .status(401)
            .json({ message: "Unauthorised" });
    }

    try {
        const refreshToken = cookies.refreshToken;
        const { payload } =
            /** @type {import("jose").JWTVerifyResult<Tourney.IJWTPayload>} */ (await jwtVerify(
                refreshToken,
                JWT_REFRESH_SECRET_SIGN_KEY,
                { algorithms: [JWS_ALG_HEADER_PARAMETER] },
            ));

        const user = await users.findOne({ _id: new ObjectId(payload.userId) });
        if (user == null) {
            return res
                .status(401)
                .json({ message: "Unauthorised" });
        }

        const userId = user._id.toString();
        const accessToken = await generateAccessToken({ userId: userId });
        const newRefreshToken = await generateRefreshToken({ userId: userId });

        return res
            .status(200)
            .cookie("refreshToken", newRefreshToken, { // todo: make this a constant
                maxAge: JWT_REFRESH_TOKEN_EXPIRY,
                httpOnly: true,
                sameSite: "lax",
            })
            .json({
                accessToken: accessToken,
                user: {
                    name: user.username,
                    email: user.email,
                },
            });
    } catch (error) {
        res.clearCookie("refreshToken", {
            httpOnly: true,
            sameSite: "lax",
        });

        console.log(error);
        return res
            .status(401)
            .json({ message: "Unauthorised" }); // todo: what about 500?
    }
}

/** @type {import("express").RequestHandler} */
export async function logout(req, res) {
    try {
        const cookies = req.cookies;
        if (
            typeof cookies !== "object" || !("refreshToken" in cookies)
            || typeof cookies.refreshToken !== "string"
            || cookies.refreshToken.length === 0
        ) {
            return res.sendStatus(204);
        }
        res.clearCookie("refreshToken", {
            httpOnly: true,
            sameSite: "lax",
        });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Error during logout:", error);
    }
    return res.status(500).json({ message: "Internal server error" });
}

/** @type {import("express").RequestHandler} */
export async function me(req, res, next) {
    const user = await users.findOne({ _id: new ObjectId(req.user.id) });
    if (user == null) {
        await logout(req, res, next);
        return;
    }
    return res
        .status(200)
        .json({
            name: user.username,
            email: user.email,
        });
}
