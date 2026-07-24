import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import passport from "passport";
import "./config/passport.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5180",
      "https://casino-mern.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(passport.initialize());

// Test Route
app.get("/", (req, res) => {
  res.json({ message: "Casino MERN server is running" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

export default app;
