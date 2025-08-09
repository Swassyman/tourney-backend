import express from "express";
import { run } from "./config/db.js";
import cors from "cors";
import userRoutes from "./routes/userRoute.js";

const app = express();
app.use(cors());
app.use(express.json());
run();

app.use('/user', userRoutes);

const PORT = process.env.PORT || 3912;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.status(200).json({ status: "active" });
});
