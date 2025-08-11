import { hash, verify } from "@node-rs/argon2";
import { z, ZodError } from "zod/v4";

const REGISTER_SCHEMA = z.object({
    username: z.string()
        .min(3)
        .max(32)
        .trim()
        .toLowerCase()
        .refine((username) => !/[^a-zA-Z0-9]/.test(username)),
    email: z.email(),
    password: z.string().min(6).max(256),
}).strict();

// /** @typedef {z.infer<typeof REGISTER_SCHEMA>} IRegister*/

/** @type {import("express").RequestHandler} */
export async function register(req, res) {
    try {
        const { username, email, password } = REGISTER_SCHEMA.parse(req.body);
        const existingUser = await req.db.collection("users").findOne({ emailid: email });
        if (existingUser) {
            return res.status(400).json({ error: "Email ID is already used" });
        }

        const passwordHash = await hash(password);
        const newUser = await req.db.collection("users").insertOne({
            username,
            emailid: email,
            passwordHash: passwordHash,
        });

        // todo: send a verification email
        res.status(201).json({
            message: "User registered successfully",
            userId: newUser.insertedId, // todo: remove this, and make them login after registration. no auto-login
        });
    } catch (error) {
        if (error instanceof ZodError) {
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ error: message });
        }

        console.error("Error during registration:", error);
        return res.status(500).json({ error: "Internal server error" });
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
        const user = await req.db.collection("users").findOne({ emailid: email });
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        const isPasswordValid = await verify(user.passwordHash, password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        res.status(200).json({ message: "Login successful", userId: user._id });
    } catch (error) {
        if (error instanceof ZodError) {
            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ error: message });
        }
        console.error("Error during login:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler} */
export async function logout(req, res) {
    try {
        //  idk what to do here, maybe disable token?
    } catch (error) {
        console.error("Error during logout:", error);
    }
    return res.status(500).json({ error: "Internal server error" });
}
