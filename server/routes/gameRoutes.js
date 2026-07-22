import express from "express";
import User from "../models/User.js";
import * as blackjackController from "../controllers/blackjackController.js";

const router = express.Router();

/*
  Supports either version of blackjackController.js:

  Older/current names:
    startGame, hit, stand, doubleHand, splitHand

  Alternate names:
    startGame, hitCard, standGame
*/
const startGame = blackjackController.startGame;
const hit = blackjackController.hit || blackjackController.hitCard;
const stand = blackjackController.stand || blackjackController.standGame;
const doubleHand = blackjackController.doubleHand;
const splitHand = blackjackController.splitHand;

const missingBlackjackHandler = (action) => (req, res) => {
  res.status(501).json({
    message: `Blackjack ${action} is not available on this server.`,
  });
};

/* =========================================================
   SHARED BET ROUTE
========================================================= */

router.post("/bet", async (req, res) => {
  try {
    const { userId, betAmount } = req.body;
    const numericBet = Number(betAmount);

    if (!userId || betAmount === undefined) {
      return res.status(400).json({
        message: "Missing userId or betAmount.",
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

    user.balance -= numericBet;
    await user.save();

    res.json({
      message: "Bet placed.",
      balance: user.balance,

      // Keep this temporarily for older frontend components.
      credits: user.balance,

      user,
    });
  } catch (error) {
    console.error("Bet route error:", error);

    res.status(500).json({
      message: "Server error placing bet.",
    });
  }
});

/* =========================================================
   SHARED RESULT ROUTE
   Kept for older games that still use /bet and /result.
========================================================= */

router.post("/result", async (req, res) => {
  try {
    const { userId, won, payout = 0 } = req.body;
    const numericPayout = Number(payout);

    if (!userId) {
      return res.status(400).json({
        message: "Missing userId.",
      });
    }

    if (typeof won !== "boolean") {
      return res.status(400).json({
        message: "Invalid game result.",
      });
    }

    if (
      !Number.isFinite(numericPayout) ||
      numericPayout < 0
    ) {
      return res.status(400).json({
        message: "Invalid payout.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (won) {
      user.balance += numericPayout;
      user.totalWins += 1;
      user.totalBalanceWon += numericPayout;
    } else {
      user.totalLosses += 1;
    }

    user.totalGames += 1;

    await user.save();

    res.json({
      message: "Game result saved.",
      balance: user.balance,
      credits: user.balance,
      user,
    });
  } catch (error) {
    console.error("Result route error:", error);

    res.status(500).json({
      message: "Server error saving result.",
    });
  }
});

/* =========================================================
   EASTER-EGG BONUS
========================================================= */

router.post("/bonus", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "Missing userId.",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          balance: 10,
        },
      },
      {
        new: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    res.json({
      message: "You found the secret bonus! +10 credits",
      balance: user.balance,
      credits: user.balance,
      user,
    });
  } catch (error) {
    console.error("Bonus credit error:", error);

    res.status(500).json({
      message: "Could not add bonus credits.",
    });
  }
});

/* =========================================================
   ROULETTE
========================================================= */

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
    user.totalGames += 1;

    if (won) {
      user.balance += payout;
      user.totalWins += 1;
      user.totalBalanceWon += payout;
    } else {
      user.totalLosses += 1;
    }

    await user.save();

    res.json({
      message: won ? "You won!" : "You lost.",
      winningNumber,
      winningColor,
      won,
      payout,
      balance: user.balance,
      user,
    });
  } catch (error) {
    console.error("Roulette error:", error);

    res.status(500).json({
      message: "Server error while playing roulette.",
    });
  }
});

/* =========================================================
   SLOTS
========================================================= */

const slotSymbols = ["🍒", "🍋", "🔔", "💎", "7️⃣", "🍀"];

router.post("/slots", async (req, res) => {
  try {
    const { userId, betAmount } = req.body;
    const numericBet = Number(betAmount);

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

    user.balance -= numericBet;
    user.totalGames += 1;

    if (won) {
      user.balance += payout;
      user.totalWins += 1;
      user.totalBalanceWon += payout;
    } else {
      user.totalLosses += 1;
    }

    await user.save();

    res.json({
      message: won
        ? `You won ${payout} credits!`
        : `You lost ${numericBet} credits.`,
      reels,
      won,
      payout,
      balance: user.balance,
      user,
    });
  } catch (error) {
    console.error("Slots error:", error);

    res.status(500).json({
      message: "Server error while playing slots.",
    });
  }
});

/* =========================================================
   LEADERBOARD
========================================================= */

router.get("/leaderboard", async (req, res) => {
  try {
    const leaders = await User.find()
      .select(
        "username balance totalWins totalLosses totalGames totalBalanceWon"
      )
      .sort({
        balance: -1,
      })
      .limit(10);

    res.json(leaders);
  } catch (error) {
    console.error("Leaderboard error:", error);

    res.status(500).json({
      message: "Server error loading leaderboard.",
    });
  }
});

/* =========================================================
   PLINKO
========================================================= */

const plinkoMultipliers = {
  high: [
    1000, 150, 50, 10, 3, 1, 0.4, 0.3, 0.2,
    0.3, 0.4, 1, 3, 10, 50, 150, 1000,
  ],

  medium: [
    80, 25, 10, 5, 2.5, 1.3, 0.9, 0.7, 0.4,
    0.7, 0.9, 1.3, 2.5, 5, 10, 25, 80,
  ],

  low: [
    12, 5, 3, 2, 1.6, 1.2, 1, 0.9, 0.7,
    0.9, 1, 1.2, 1.6, 2, 3, 5, 12,
  ],
};

router.post("/plinko/drop", async (req, res) => {
  try {
    const { userId, betAmount, difficulty } = req.body;
    const numericBet = Number(betAmount);

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
        message: "Bet must be between 1 and 100.",
      });
    }

    const selectedDifficulty =
      difficulty?.toLowerCase() || "medium";

    if (!plinkoMultipliers[selectedDifficulty]) {
      return res.status(400).json({
        message: "Invalid difficulty.",
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

    let bucketIndex = 0;

    for (let index = 0; index < 16; index += 1) {
      if (Math.random() > 0.5) {
        bucketIndex += 1;
      }
    }

    const multiplier =
      plinkoMultipliers[selectedDifficulty][bucketIndex];

    const payout = Math.floor(numericBet * multiplier);

    user.balance -= numericBet;
    user.totalGames += 1;

    if (payout > 0) {
      user.balance += payout;
    }

    if (payout > numericBet) {
      user.totalWins += 1;
      user.totalBalanceWon += payout;
    } else if (payout < numericBet) {
      user.totalLosses += 1;
    }

    await user.save();

    res.json({
      bucketIndex,
      payout,
      multiplier,
      balance: user.balance,
      user,
    });
  } catch (error) {
    console.error("Plinko error:", error);

    res.status(500).json({
      message: "Server error while playing plinko.",
    });
  }
});

/* =========================================================
   TEXAS HOLD'EM RESULT
========================================================= */

router.post("/texas-holdem/result", async (req, res) => {
  try {
    const {
      userId,
      result,
      payout = 0,
    } = req.body;

    const numericPayout = Number(payout);

    if (!userId) {
      return res.status(400).json({
        message: "Missing userId.",
      });
    }

    if (!["win", "loss", "push"].includes(result)) {
      return res.status(400).json({
        message: "Invalid game result.",
      });
    }

    if (
      !Number.isFinite(numericPayout) ||
      numericPayout < 0
    ) {
      return res.status(400).json({
        message: "Invalid payout.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (result === "win") {
      user.balance += numericPayout;
      user.totalWins += 1;
      user.totalBalanceWon += numericPayout;
    } else if (result === "loss") {
      user.totalLosses += 1;
    } else {
      user.balance += numericPayout;
    }

    user.totalGames += 1;

    await user.save();

    res.json({
      message: "Texas Hold'em result saved.",
      result,
      payout: numericPayout,
      balance: user.balance,
      user,
    });
  } catch (error) {
    console.error("Texas Hold'em result error:", error);

    res.status(500).json({
      message: "Server error saving Texas Hold'em result.",
    });
  }
});

/* =========================================================
   BLACKJACK
========================================================= */

router.post(
  "/blackjack/start",
  startGame || missingBlackjackHandler("start")
);

router.post(
  "/blackjack/hit",
  hit || missingBlackjackHandler("hit")
);

router.post(
  "/blackjack/stand",
  stand || missingBlackjackHandler("stand")
);

router.post(
  "/blackjack/double",
  doubleHand || missingBlackjackHandler("double")
);

router.post(
  "/blackjack/split",
  splitHand || missingBlackjackHandler("split")
);

export default router;