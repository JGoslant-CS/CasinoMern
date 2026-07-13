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

const rouletteNumbers = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34,
  6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26,
];

const redNumbers = new Set([
  1, 3, 5, 7, 9,
  12, 14, 16, 18,
  19, 21, 23, 25, 27,
  30, 32, 34, 36,
]);

router.post("/roulette", async (req, res) => {
  try {
    const {
      userId,
      betAmount,
      betType,
      selectedNumber,
    } = req.body;

    const numericBet = Number(betAmount);
    const numericSelection = Number(selectedNumber);

    if (!userId) {
      return res.status(400).json({
        message: "Missing user ID.",
      });
    }

    if (
      !Number.isInteger(numericBet) ||
      numericBet < 1 ||
      numericBet > 10
    ) {
      return res.status(400).json({
        message: "Bet must be a whole number between 1 and 10 credits.",
      });
    }

    if (!["red", "black", "number"].includes(betType)) {
      return res.status(400).json({
        message: "Invalid roulette bet type.",
      });
    }

    if (
      betType === "number" &&
      (
        !Number.isInteger(numericSelection) ||
        numericSelection < 0 ||
        numericSelection > 36
      )
    ) {
      return res.status(400).json({
        message: "Choose a number between 0 and 36.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (user.balance < numericBet) {
      return res.status(400).json({
        message: "Not enough credits.",
      });
    }

    const winningNumber =
      rouletteNumbers[
        Math.floor(Math.random() * rouletteNumbers.length)
      ];

    let winningColor = "green";

    if (winningNumber !== 0) {
      winningColor = redNumbers.has(winningNumber)
        ? "red"
        : "black";
    }

    let won = false;
    let payout = 0;

    if (betType === "red" && winningColor === "red") {
      won = true;
      payout = numericBet * 2;
    }

    if (betType === "black" && winningColor === "black") {
      won = true;
      payout = numericBet * 2;
    }

    if (
      betType === "number" &&
      numericSelection === winningNumber
    ) {
      won = true;
      payout = numericBet * 36;
    }

    user.balance -= numericBet;

    if (won) {
      user.balance += payout;
    }

    await user.save();

    res.json({
      message: won ? "You won!" : "You lost.",
      winningNumber,
      winningColor,
      won,
      payout,
      balance: user.balance,
    });
  } catch (error) {
    console.error("Roulette error:", error);

    res.status(500).json({
      message: "Server error while playing roulette.",
    });
  }
});

const slotSymbols = ["🍒", "🍋", "🔔", "💎", "7️⃣", "🍀"];

router.post("/slots", async (req, res) => {
  try {
    const { userId, betAmount } = req.body;

    const numericBet = Number(betAmount);

    if (!userId) {
      return res.status(400).json({ message: "Missing user ID." });
    }

    if (
      !Number.isInteger(numericBet) ||
      numericBet < 1 ||
      numericBet > 10
    ) {
      return res.status(400).json({
        message: "Bet must be a whole number between 1 and 10 credits.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.balance < numericBet) {
      return res.status(400).json({ message: "Not enough credits." });
    }

    // Roll reels on server-side
    const reels = [
      slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
      slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
      slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
    ];

    let payout = 0;
    let won = false;

    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      payout = numericBet * 8;
      won = true;
    } else if (
      reels[0] === reels[1] ||
      reels[1] === reels[2] ||
      reels[0] === reels[2]
    ) {
      payout = numericBet * 2;
      won = true;
    }

    // Update user balance and stats
    user.balance -= numericBet;
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
      message: won ? `You won ${payout} credits!` : `You lost ${numericBet} credits.`,
      reels,
      won,
      payout,
      balance: user.balance,
      user,
    });
  } catch (error) {
    console.error("Slots error:", error);
    res.status(500).json({ message: "Server error while playing slots." });
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