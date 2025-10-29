import cookieParser from "cookie-parser";
import express from "express";
import { connectDatabase } from "./config/db.js";
import clubRouter from "./routes/club.routes.js";
import matchRouter from "./routes/match.routes.js";
import playerRouter from "./routes/player.routes.js";
import roundRouter from "./routes/round.routes.js";
import stageRouter from "./routes/stage.routes.js";
import stageItemRouter from "./routes/stageItem.routes.js";
import teamRouter from "./routes/team.routes.js";
import tournamentsRouter from "./routes/tournaments.routes.js";
import userRouter from "./routes/user.route.js";

const PORT = Number(process.env.PORT) || 3912;
if (isNaN(PORT) || !Number.isInteger(PORT)) {
    throw new Error("Invalid PORT number specified");
}

const app = express();
app.use((req, res, next) => {
    console.log(req.method, req.hostname, req.path);
    next();
});

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
// the cors plugin felt messier to configure, so here is manual:
app.use((req, res, next) => {
    if (FRONTEND_ORIGIN === "*" || req.headers.origin === FRONTEND_ORIGIN) {
        res.setHeader("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET,POST,PATCH,PUT,DELETE,OPTIONS",
        );
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type,Authorization",
        );
    }
    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Max-Age", "86400"); // cache pre-flight for 24h
        res.sendStatus(204);
        return;
    }
    next();
});

app.use(cookieParser());
app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).json({ status: "active" });
});

app.use("/user", userRouter);
app.use("/club", clubRouter);
app.use("/tournaments", tournamentsRouter);
app.use("/stages", stageRouter);
app.use("/rounds", roundRouter);
app.use("/team", teamRouter);
app.use("/match", matchRouter);
app.use("/stageItem", stageItemRouter);
app.use("/player", playerRouter);

await connectDatabase();

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} at http://localhost:${PORT}`);
});
