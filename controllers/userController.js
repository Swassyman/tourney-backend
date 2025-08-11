import express from "express";
const router = express.Router();
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

export async function register(req, res) {
    try {
        const { username, emailid, password } = req.body;
        const existingUser = await req.db.collection("users").findOne({ emailid });
        if (existingUser) {
            return res.status(400).json({ error: "Email ID is already used" });
        }

        const passwordHash = await hash(password);
        const newUser = await req.db.collection("users").insertOne({
            username,
            emailid,
            passwordHash: passwordHash,
        });

        res.status(201).json({
            message: "User registered successfully",
            userId: newUser.insertedId,
        });
    } catch (error) {
        console.error("Error during registration:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function login(req, res) {
    try {
        const { emailid, password } = req.body;
        const user = await req.db.collection("users").findOne({ emailid });
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        const isPasswordValid = await verify(user.passwordHash, password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        res.status(200).json({ message: "Login successful", userId: user._id });
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function logout(req, res) {
    try {
        //  idk what to do here, maybe disable token?
    } catch (error) {
        console.error("Error during logout:", error);
    }
    return res.status(500).json({ error: "Internal server error" });
}
