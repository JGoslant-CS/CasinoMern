import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Take credits when game starts
router.post("/bet", async (req, res) => {
  try {
    const { userId, betAmount } = req.body;

    if (!userId || betAmount === undefined) {
      return res.status(400).json({ message: "Missing userId or betAmount." });
    }

    if (betAmount < 1 || betAmount > 10) {
      return res.status(400).json({ message: "Bet must be between 1 and 10 credits." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.balance < betAmount) {
      return res.status(400).json({ message: "Not enough credits." });
    }

    user.balance -= betAmount;
    await user.save();

    res.json({
      message: "Bet placed.",
      balance: user.balance,
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
      user.balance += payout;
      user.totalWins += 1;
      user.totalBalanceWon += payout;
    } else {
      user.totalLosses += 1;
    }

    user.totalGames += 1;

    await user.save();

    res.json({
      message: "Game result saved.",
      balance: user.balance,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error saving result." });
  }
});

// Easter egg: add 10 credits
router.post("/bonus", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: 10 } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({
      message: "You found the secret bonus! +10 credits",
      balance: user.balance,
    });
  } catch (error) {
    console.error("Bonus credit error:", error);
    res.status(500).json({ message: "Could not add bonus credits." });
  }
});

// Leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const leaders = await User.find()
      .select("username balance totalWins totalLosses totalGames totalBalanceWon")
      .sort({ balance: -1 })
      .limit(10);

    res.json(leaders);
  } catch (error) {
    res.status(500).json({ message: "Server error loading leaderboard." });
  }
});

export default router;