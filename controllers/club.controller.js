import { ObjectId } from "mongodb";
import z, { ZodError } from "zod";
import {
    clubMembers,
    clubs,
    matches,
    players,
    stages,
    teams,
    tournaments,
    users,
} from "../config/db.js";

const CREATE_SCHEMA = z.object({
    name: z.string().trim().min(3).max(256),
    handle: z.string().trim().min(3).max(64),
}).strict();

/** @type {import("express").RequestHandler} */
export async function createClub(req, res) {
    try {
        const parsed = CREATE_SCHEMA.parse(req.body);

        const exists = await clubs.findOne({ handle: parsed.handle });
        if (exists != null) {
            res.status(400).json({
                message: "Club with handle already exists",
            });
            return;
        }

        const { insertedId: clubId } = await clubs.insertOne({
            name: parsed.name,
            handle: parsed.handle,
        });
        const { insertedId: memberId } = await clubMembers.insertOne({
            userId: new ObjectId(req.user.id),
            clubId: clubId,
            role: "owner",
            joined_at: new Date(),
        });

        res.status(201)
            .json({ clubId: clubId, memberId: memberId });
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

/** @type {import("express").RequestHandler<{ clubId: string }>} */
export async function getClub(req, res) {
    try {
        const membership = await clubMembers.findOne({
            clubId: new ObjectId(req.params.clubId),
            userId: new ObjectId(req.user.id),
        });
        if (membership == null) {
            return res.status(403).json({
                message: "You are not a member of this club",
            }); // todo: error driven dev?
        }

        const club = await clubs.findOne({
            _id: new ObjectId(req.params.clubId),
        });

        if (club == null) {
            return res.status(404).json({ message: "Club not found" });
        }

        return res.status(200).json({
            _id: club._id,
            name: club.name,
            handle: club.handle,
            membership: {
                id: membership._id,
                role: membership.role,
                joined_at: membership.joined_at,
            },
        });
    } catch (error) {
        console.error("Error during getting clubs:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// todo: update / patch club

/** @type {import("express").RequestHandler<{ clubId: string }>} */
export async function deleteClub(req, res) {
    try {
        const clubId = new ObjectId(req.params.clubId);
        const membership = await clubMembers.findOne({
            clubId,
            userId: new ObjectId(req.user.id),
            role: "owner",
        });

        if (membership == null) {
            return res.status(403).json({
                message:
                    "You don't have permission to delete teams in this tournament",
            });
        }

        const { deletedCount } = await clubs.deleteOne({ _id: clubId });

        if (deletedCount === 0) {
            return res.status(404)
                .json({ message: "Could not find the specified club" });
        }

        const tournamentsToDelete = await tournaments.find({ clubId })
            .toArray();
        const tournamentIds = tournamentsToDelete.map(t => t._id);

        if (tournamentIds.length > 0) {
            await clubMembers.deleteMany({ clubId: clubId });
            await tournaments.deleteMany({ clubId });
            await teams.deleteMany({ tournamentId: { $in: tournamentIds } });
            await players.deleteMany({ tournamentId: { $in: tournamentIds } });
            await stages.deleteMany({ tournamentId: { $in: tournamentIds } });
            await matches.deleteMany({ tournamentId: { $in: tournamentIds } });
        }

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

/** @type {import("express").RequestHandler} */
export async function getMyClubMemberships(req, res) {
    try {
        const clubMemberships = await clubMembers.aggregate([
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
        res.status(200).json(
            clubMemberships.map(
                (
                    /** @type {Tourney.ClubMember & { club: Tourney.Club[] }} */ membership,
                ) => {
                    if (membership.club.length !== 1) {
                        throw new Error(
                            "supposed to have only one membership for a club",
                        );
                    }
                    return {
                        _id: membership._id,
                        role: membership.role,
                        joined_at: membership.joined_at,
                        club: membership.club[0],
                    };
                },
            ),
        );
    } catch (error) {
        console.error("Error during getting clubs:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/** @type {import("express").RequestHandler<{ clubId: string }>} */
export async function getClubMembers(req, res) {
    try {
        // todo: make this a middleware
        const userMembership = await clubMembers.findOne({
            clubId: new ObjectId(req.params.clubId),
            userId: new ObjectId(req.user.id),
            // role: { $in: ["owner", "admin"] }, // todo: decide whether role wise restriction is needed. also what is the point of member vs. admin?
        });
        if (userMembership == null) {
            return res.status(403).json({
                message: "You are not a member of this club",
            }); // todo: error driven dev?
        }

        const clubMemberships = await clubMembers.aggregate([
            {
                $match: {
                    clubId: new ObjectId(req.params.clubId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        { $project: { passwordHash: 0 } },
                    ],
                },
            },
            {
                $sort: {
                    joined_at: 1,
                },
            },
        ]).toArray();
        res.status(200).json(
            clubMemberships.map(
                (
                    /**@type {Tourney.ClubMember & { user: Omit<Tourney.User, "passwordHash">[]}} */ membership,
                ) => {
                    if (membership.user.length > 1) {
                        throw new Error(
                            "supposed to have only one membership per user for a club",
                        );
                    }
                    return {
                        _id: membership._id,
                        role: membership.role,
                        joined_at: membership.joined_at,
                        user: membership.user[0],
                    };
                },
            ),
        );
    } catch (error) {
        console.error("Error during getting clubs:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const ADD_MEMBER_SCHEMA = z.object({
    query: z.string().trim().regex(/^[a-zA-Z0-9_]+$/),
    role: z.enum(["member", "admin"]),
}).strict();

/** @type {import("express").RequestHandler<{ clubId: string }>} */
export async function addClubMember(req, res) {
    try {
        // todo: make this a middleware
        const userMembership = await clubMembers.findOne({
            clubId: new ObjectId(req.params.clubId),
            userId: new ObjectId(req.user.id),
            role: { $in: ["owner", "admin"] },
        });
        if (userMembership == null) {
            return res.status(403).json({
                message: "You have no permission to do that",
            }); // todo: error driven dev?
        }

        const parsed = ADD_MEMBER_SCHEMA.parse(req.body);

        const inviteeUser = await users.findOne({
            $or: [
                { handle: parsed.query },
                { email: parsed.query },
            ],
        }, { projection: { passwordHash: 0 } });
        if (inviteeUser == null) {
            return res.status(404).json({ message: "User not found" });
        }

        const inviteeExists = await clubMembers.findOne({
            userId: inviteeUser._id,
            clubId: new ObjectId(req.params.clubId),
        });

        if (inviteeExists != null) {
            if (inviteeExists.role === parsed.role) {
                return res.status(400).json({ message: "User already exists" });
            } else {
                return res.status(400).json({
                    message: "Already exist with another role",
                });
            }
        }

        const joinedAtDate = new Date();
        const { insertedId: addedMemberId } = await clubMembers.insertOne({
            userId: new ObjectId(inviteeUser._id),
            clubId: new ObjectId(req.params.clubId),
            role: parsed.role,
            joined_at: joinedAtDate,
        });
        return res.status(200).json({
            _id: addedMemberId,
            role: parsed.role,
            joined_at: joinedAtDate,
            user: inviteeUser,
        });
    } catch (error) {
        console.error("Error during getting clubs:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
