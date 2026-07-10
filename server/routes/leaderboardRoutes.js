import express from "express";
import User from "../models/User.js";

const router = express.Router();

// GET Top 10 Players
router.get("/", async (req, res) => {
  try {
    const leaderboard = await User.find({})
      .select("username balance totalWins totalLosses totalGames totalBalanceWon")
      .sort({ balance: -1 })
      .limit(10);

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error("Leaderboard Error:", error);
    res.status(500).json({
      message: "Failed to load leaderboard",
    });
  }
});

export default router;