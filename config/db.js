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
export const db = client.db(DATABASE_NAME);

export async function connectDatabase() {
    await client.connect();
    console.log("MongoDB connected");
}
