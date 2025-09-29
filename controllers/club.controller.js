import { ObjectId } from "mongodb";
import z, { ZodError } from "zod";
import { clubMembers, clubs } from "../config/db.js";

const CREATE_SCHEMA = z.object({
    name: z.string().trim().min(3).max(256), // todo: validate the format for special characters (dont allow)
}).strict();

/** @type {import("express").RequestHandler} */
export async function createClub(req, res) {
    try {
        const { name } = CREATE_SCHEMA.parse(req.body);

        const { insertedId: clubId } = await clubs.insertOne({ name: name });
        await clubMembers.insertOne({
            userId: new ObjectId(req.user.id),
            clubId: clubId,
            role: "owner",
            joined_at: new Date(),
            status: "active",
        });

        res.status(201)
            .json({ message: "Created club successfully" });
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);

            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during creating a club:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler} */
export async function getClubs(req, res) {
    try {
        const clubs = await clubMembers.aggregate([
            {
                $match: {
                    userId: new ObjectId(req.user.id),
                },
            },
            {
                $lookup: {
                    from: "clubs",
                    localField: "clubId",
                    foreignField: "_id",
                    as: "club",
                },
            },
        ]).toArray();
        res.status(200).json(clubs);
    } catch (error) {
        console.error("Error during getting clubs:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ clubId: string }>} */
export async function deleteClub(req, res) {
    try {
        const clubId = new ObjectId(req.params.clubId);
        const { deletedCount } = await clubs.deleteOne({ _id: clubId });

        if (deletedCount === 0) {
            return res.status(404)
                .json({ message: "Could not find the specified club" });
        }

        await clubMembers.deleteMany({
            userId: new ObjectId(req.user.id),
            clubId: clubId,
        });

        res.status(200)
            .json({ message: "Deleted club successfully" });
    } catch (error) {
        if (error instanceof ZodError) {
            console.log(error.issues);

            const message = error.issues.length == 0
                ? "Invalid inputs"
                : error.issues[0].message;
            return res.status(400).json({ message: message });
        }

        console.error("Error during deleting a club:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
