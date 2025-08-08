import { config } from 'dotenv';
config();

import { MongoClient } from "mongodb";

const uri = process.env.DATABASE_URI;
if (!uri) {
  throw new Error("Connection String Error");
}

const client = new MongoClient(uri);

export async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected");
  } catch {
    console.log("MongoDB not connected");
  }
}
