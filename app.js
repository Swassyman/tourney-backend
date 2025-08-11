import cors from "cors";
import express from "express";
import { connectDatabase } from "./config/db.js";
import userRoutes from "./routes/userRoute.js";

const PORT = process.env.PORT || 3912;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).json({ status: "active" });
});

app.use("/user", userRoutes);

await connectDatabase();
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
