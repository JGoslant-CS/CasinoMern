import Blackjack from "../models/Blackjack.js";
import User from "../models/User.js";

// Helper Functions
const suits = ["hearts", "diamonds", "clubs", "spades"];
const values = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "J", "Q", "K", "A"
];

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHandValue(hand) {
  let value = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.value === "A") {
      aces += 1;
      value += 11;
    } else if (["J", "Q", "K"].includes(card.value)) {
      value += 10;
    } else {
      value += parseInt(card.value, 10);
    }
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }

  return value;
}

// Controller Methods

export const startGame = async (req, res) => {
  try {
    const { userId, betAmount } = req.body;

    if (!userId || !betAmount || betAmount < 1) {
      return res.status(400).json({ message: "Invalid bet amount." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.balance < betAmount) {
      return res.status(400).json({ message: "Not enough credits." });
    }

    // Deduct bet amount
    user.balance -= betAmount;
    user.totalGames = (user.totalGames || 0) + 1;
    await user.save();

    // End previous active games
    await Blackjack.updateMany({ userId, status: "active" }, { status: "dealer_won" });

    const deck = shuffle(createDeck());
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);

    let status = "active";
    let payout = 0;

    // Check immediate blackjack
    if (playerValue === 21 && dealerValue === 21) {
      status = "push";
      payout = betAmount;
    } else if (playerValue === 21) {
      status = "blackjack";
      payout = betAmount * 2.5; // 3:2 payout (bet + 1.5x bet)
    } else if (dealerValue === 21) {
      status = "dealer_won";
    }

    if (payout > 0) {
      user.balance += payout;
      if (status === "blackjack") user.totalWins += 1;
      user.totalBalanceWon += payout - betAmount; // Track net win
      await user.save();
    } else if (status === "dealer_won") {
      user.totalLosses += 1;
      await user.save();
    }

    const game = new Blackjack({
      userId,
      deck,
      playerHand,
      dealerHand,
      betAmount,
      status,
    });

    await game.save();

    res.status(200).json({
      gameId: game._id,
      playerHand,
      dealerHand: status === "active" ? [dealerHand[0], { suit: "hidden", value: "hidden" }] : dealerHand,
      status,
      user: {
        _id: user._id,
        username: user.username,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("Blackjack Start Error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const hit = async (req, res) => {
  try {
    const { gameId } = req.body;
    
    const game = await Blackjack.findById(gameId);
    if (!game || game.status !== "active") {
      return res.status(400).json({ message: "Game not found or already finished." });
    }

    game.playerHand.push(game.deck.pop());
    const playerValue = calculateHandValue(game.playerHand);

    let payout = 0;
    if (playerValue > 21) {
      game.status = "dealer_won";
      const user = await User.findById(game.userId);
      user.totalLosses += 1;
      await user.save();
    }

    game.markModified('playerHand');
    game.markModified('deck');
    await game.save();

    res.status(200).json({
      playerHand: game.playerHand,
      dealerHand: game.status === "active" ? [game.dealerHand[0], { suit: "hidden", value: "hidden" }] : game.dealerHand,
      status: game.status,
    });

  } catch (error) {
    console.error("Blackjack Hit Error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const stand = async (req, res) => {
  try {
    const { gameId } = req.body;

    const game = await Blackjack.findById(gameId);
    if (!game || game.status !== "active") {
      return res.status(400).json({ message: "Game not found or already finished." });
    }

    let dealerValue = calculateHandValue(game.dealerHand);
    
    // Dealer logic: hit on soft 17 is standard in many casinos, but we'll stick to simple stand on 17
    while (dealerValue < 17) {
      game.dealerHand.push(game.deck.pop());
      dealerValue = calculateHandValue(game.dealerHand);
    }

    const playerValue = calculateHandValue(game.playerHand);
    
    let payout = 0;
    
    if (dealerValue > 21 || playerValue > dealerValue) {
      game.status = "player_won";
      payout = game.betAmount * 2;
    } else if (playerValue < dealerValue) {
      game.status = "dealer_won";
    } else {
      game.status = "push";
      payout = game.betAmount;
    }

    game.markModified('dealerHand');
    game.markModified('deck');
    await game.save();

    const user = await User.findById(game.userId);
    if (payout > 0) {
      user.balance += payout;
      if (game.status === "player_won") user.totalWins += 1;
      user.totalBalanceWon += payout - game.betAmount;
      await user.save();
    } else if (game.status === "dealer_won") {
      user.totalLosses += 1;
      await user.save();
    }

    res.status(200).json({
      playerHand: game.playerHand,
      dealerHand: game.dealerHand,
      status: game.status,
      user: {
        _id: user._id,
        username: user.username,
        balance: user.balance,
      },
    });

  } catch (error) {
    console.error("Blackjack Stand Error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
