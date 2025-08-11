import { MongoClient } from "mongodb";

const uri = process.env.DATABASE_URI;
if (typeof uri !== "string" || uri.length === 0) {
    throw new Error("Invalid connection string in DATABASE_URI env var");
}

export const client = new MongoClient(uri);

export async function connectDatabase() {
    try {
        await client.connect();
        console.log("MongoDB connected");
    } catch (error) {
        console.error(error);
        console.log("MongoDB not connected");
    }
}
