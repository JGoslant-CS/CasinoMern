import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Take credits when game starts
router.post("/bet", async (req, res) => {
  try {
    const { userId, betAmount } = req.body;

    if (!userId || !betAmount) {
      return res.status(400).json({ message: "Missing userId or betAmount." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.credits < betAmount) {
      return res.status(400).json({ message: "Not enough credits." });
    }

    user.credits -= betAmount;
    await user.save();

    res.json({
      message: "Bet placed.",
      credits: user.credits,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error placing bet." });
  }
});

// Give credits after game result
router.post("/result", async (req, res) => {
  try {
    const { userId, won, payout } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (won) {
      user.credits += payout;
      user.totalWins += 1;
      user.totalCreditsWon += payout;
    } else {
      user.totalLosses += 1;
    }

    await user.save();

    res.json({
      message: "Game result saved.",
      credits: user.credits,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error saving result." });
  }
});

// Leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const leaders = await User.find()
      .select("username credits totalWins totalCreditsWon")
      .sort({ credits: -1 })
      .limit(10);

    res.json(leaders);
  } catch (error) {
    res.status(500).json({ message: "Server error loading leaderboard." });
  }
});

export default router;