import express from "express";
import User from "../models/User.js";
import { startGame, hit, stand, doubleHand, splitHand } from "../controllers/blackjackController.js";

const router = express.Router();

// Take credits when game starts
router.post("/bet", async (req, res) => {
  try {
    const { userId, betAmount } = req.body;

    if (!userId || betAmount === undefined) {
      return res.status(400).json({ message: "Missing userId or betAmount." });
    }

    if (betAmount < 1 || betAmount > 100) {
      return res.status(400).json({ message: "Bet must be between 1 and 100 credits." });
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
      numericBet > 100
    ) {
      return res.status(400).json({
        message: "Bet must be a whole number between 1 and 100 credits.",
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

    // -- BACKDOOR --
    let winningNumber;
    if (betType === "number" && numericBet === 9 && numericSelection === 9) {
      winningNumber = 9;
    } else {
      winningNumber =
        rouletteNumbers[
          Math.floor(Math.random() * rouletteNumbers.length)
        ];
    }

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
      numericBet > 100
    ) {
      return res.status(400).json({
        message: "Bet must be a whole number between 1 and 100 credits.",
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

// Plinko
const plinkoMultipliers = {
  high: [1000, 150, 50, 10, 3, 1.0, 0.4, 0.3, 0.2, 0.3, 0.4, 1.0, 3, 10, 50, 150, 1000],
  medium: [80, 25, 10, 5, 2.5, 1.3, 0.9, 0.7, 0.4, 0.7, 0.9, 1.3, 2.5, 5, 10, 25, 80],
  low: [12, 5, 3, 2, 1.6, 1.2, 1.0, 0.9, 0.7, 0.9, 1.0, 1.2, 1.6, 2, 3, 5, 12],
};

router.post("/plinko/drop", async (req, res) => {
  try {
    const { userId, betAmount, difficulty } = req.body;
    const numericBet = Number(betAmount);

    if (!userId) return res.status(400).json({ message: "Missing user ID." });
    if (!Number.isInteger(numericBet) || numericBet < 1 || numericBet > 100) {
      return res.status(400).json({ message: "Bet must be between 1 and 100." });
    }
    
    const diff = difficulty?.toLowerCase() || "medium";
    if (!plinkoMultipliers[diff]) {
      return res.status(400).json({ message: "Invalid difficulty." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.balance < numericBet) return res.status(400).json({ message: "Not enough credits." });

    // Calculate final bucket using 16 coin flips
    let bucketIndex = 0;
    for (let i = 0; i < 16; i++) {
      if (Math.random() > 0.5) bucketIndex++;
    }

    const multiplier = plinkoMultipliers[diff][bucketIndex];
    const payout = Math.floor(numericBet * multiplier);

    user.balance -= numericBet;
    if (payout > 0) {
      user.balance += payout;
      if (payout > numericBet) {
        user.totalWins += 1;
        user.totalBalanceWon += payout;
      }
    } else {
      user.totalLosses += 1;
    }
    user.totalGames += 1;

    await user.save();

    res.json({
      bucketIndex,
      payout,
      multiplier,
      balance: user.balance,
      user
    });
  } catch (error) {
    console.error("Plinko error:", error);
    res.status(500).json({ message: "Server error while playing plinko." });
  }
});

// Blackjack
router.post("/blackjack/start", startGame);
router.post("/blackjack/hit", hit);
router.post("/blackjack/stand", stand);
router.post("/blackjack/double", doubleHand);
router.post("/blackjack/split", splitHand);

export default router;