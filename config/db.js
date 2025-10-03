import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI;
const DATABASE_NAME = process.env.DATABASE_NAME;
if (typeof MONGO_URI !== "string" || MONGO_URI.length === 0) {
    throw new Error("Invalid connection string in MONGO_URI env var");
}
if (typeof DATABASE_NAME !== "string" || DATABASE_NAME.length === 0) {
    throw new Error("Invalid DATABASE_NAME env var");
}

const client = new MongoClient(MONGO_URI);
const db = client.db(DATABASE_NAME);

export async function connectDatabase() {
    await client.connect();
    console.log("MongoDB connected");
}

/** @type {import("mongodb").Collection<Tourney.User>} */
export const users = db.collection("users");

// /** @type {import("mongodb").Collection<Tourney.UserRefreshToken>} */
// export const refreshTokens = db.collection("userRefreshTokens");

/** @type {import("mongodb").Collection<Tourney.Club>} */
export const clubs = db.collection("clubs");

/** @type {import("mongodb").Collection<Tourney.ClubMember>} */
export const clubMembers = db.collection("clubMembers");

/** @type {import("mongodb").Collection<Tourney.Tournament>} */
export const tournaments = db.collection("tournaments");

/** @type {import("mongodb").Collection<Tourney.Stage>} */
export const stages = db.collection("stages");

/** @type {import("mongodb").Collection<Tourney.StageItem>} */
export const stageItems = db.collection("stageItems");

/** @type {import("mongodb").Collection<Tourney.Round>} */
export const rounds = db.collection("rounds");

/** @type {import("mongodb").Collection<Tourney.Match>} */
export const matches = db.collection("matches");

/** @type {import("mongodb").Collection<Tourney.Team>} */
export const teams = db.collection("teams");

/** @type {import("mongodb").Collection<Tourney.Player>} */
export const players = db.collection("players");
