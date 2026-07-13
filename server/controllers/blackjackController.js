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

    if (!userId || !betAmount || betAmount < 1 || betAmount > 100) {
      return res.status(400).json({ message: "Bet must be between 1 and 100 credits." });
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
    if (!game || (game.status !== "active" && game.status !== "split_active")) {
      return res.status(400).json({ message: "Game not found or already finished." });
    }

    let activeHandArr = game.activeHand === "playerHand" ? game.playerHand : game.splitHand;
    activeHandArr.push(game.deck.pop());
    
    if (game.activeHand === "playerHand") {
        game.playerHand = activeHandArr;
        game.markModified('playerHand');
    } else {
        game.splitHand = activeHandArr;
        game.markModified('splitHand');
    }

    const currentValue = calculateHandValue(activeHandArr);

    if (currentValue > 21) {
      if (game.splitHand && game.activeHand === "playerHand") {
         // Bust on first hand of split, move to next
         game.activeHand = "splitHand";
      } else {
         // Bust on normal hand or second hand of split. Dealer wins this hand.
         // Wait for stand() logic to resolve payouts if there's a split.
         // If no split, game is over.
         if (!game.splitHand) {
            game.status = "dealer_won";
            const user = await User.findById(game.userId);
            user.totalLosses += 1;
            await user.save();
         } else if (game.activeHand === "splitHand") {
            // Both hands played. We need to evaluate against dealer, so we just set status to active and let them stand to trigger dealer logic.
            // Or trigger dealer logic here if we wanted. For simplicity, we just leave it split_active and force a stand.
         }
      }
    }

    game.markModified('deck');
    await game.save();

    res.status(200).json({
      playerHand: game.playerHand,
      splitHand: game.splitHand,
      activeHand: game.activeHand,
      dealerHand: ["active", "split_active"].includes(game.status) ? [game.dealerHand[0], { suit: "hidden", value: "hidden" }] : game.dealerHand,
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
    if (!game || (game.status !== "active" && game.status !== "split_active")) {
      return res.status(400).json({ message: "Game not found or already finished." });
    }
    
    // If we have a split hand and are standing on the first hand, just switch active hand.
    if (game.splitHand && game.activeHand === "playerHand") {
        game.activeHand = "splitHand";
        await game.save();
        return res.status(200).json({
            playerHand: game.playerHand,
            splitHand: game.splitHand,
            activeHand: game.activeHand,
            dealerHand: [game.dealerHand[0], { suit: "hidden", value: "hidden" }],
            status: game.status,
        });
    }

    let dealerValue = calculateHandValue(game.dealerHand);
    
    // Dealer logic: hit on soft 17 is standard in many casinos, but we'll stick to simple stand on 17
    while (dealerValue < 17) {
      game.dealerHand.push(game.deck.pop());
      dealerValue = calculateHandValue(game.dealerHand);
    }

    const resolveHand = (handValue, bet) => {
        if (handValue > 21) return { status: "dealer_won", payout: 0 };
        if (dealerValue > 21 || handValue > dealerValue) return { status: "player_won", payout: bet * 2 };
        if (handValue < dealerValue) return { status: "dealer_won", payout: 0 };
        return { status: "push", payout: bet };
    };

    const playerValue = calculateHandValue(game.playerHand);
    const res1 = resolveHand(playerValue, game.betAmount);
    
    let totalPayout = res1.payout;
    let netLosses = 0;
    let netWins = 0;

    if (res1.status === "dealer_won") netLosses++;
    if (res1.status === "player_won") netWins++;

    let finalStatus = res1.status;

    if (game.splitHand) {
        const splitValue = calculateHandValue(game.splitHand);
        const res2 = resolveHand(splitValue, game.splitBetAmount);
        totalPayout += res2.payout;
        
        if (res2.status === "dealer_won") netLosses++;
        if (res2.status === "player_won") netWins++;
        
        finalStatus = "finished"; // When split, individual status is complex, just mark finished
    }

    game.status = finalStatus;
    game.markModified('dealerHand');
    game.markModified('deck');
    await game.save();

    const user = await User.findById(game.userId);
    if (totalPayout > 0) {
      user.balance += totalPayout;
      user.totalWins += netWins;
      user.totalBalanceWon += totalPayout - (game.betAmount + game.splitBetAmount);
      await user.save();
    }
    
    if (netLosses > 0) {
      user.totalLosses += netLosses;
      await user.save();
    }

    res.status(200).json({
      playerHand: game.playerHand,
      splitHand: game.splitHand,
      activeHand: game.activeHand,
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

export const doubleHand = async (req, res) => {
    try {
        const { gameId } = req.body;
        
        const game = await Blackjack.findById(gameId);
        if (!game || game.status !== "active" || game.playerHand.length !== 2) {
            return res.status(400).json({ message: "Cannot double down right now." });
        }

        const user = await User.findById(game.userId);
        if (user.balance < game.betAmount) {
            return res.status(400).json({ message: "Not enough credits to double down." });
        }

        // Deduct another betAmount
        user.balance -= game.betAmount;
        await user.save();
        
        game.betAmount *= 2;
        game.playerHand.push(game.deck.pop());
        game.markModified('playerHand');
        game.markModified('deck');
        await game.save();

        // Automatically stand
        req.body.gameId = game._id;
        return stand(req, res);

    } catch (error) {
        console.error("Double Down Error:", error);
        res.status(500).json({ message: "Server error." });
    }
};

export const splitHand = async (req, res) => {
    try {
        const { gameId } = req.body;
        
        const game = await Blackjack.findById(gameId);
        if (!game || game.status !== "active" || game.playerHand.length !== 2) {
            return res.status(400).json({ message: "Cannot split right now." });
        }

        const c1 = game.playerHand[0].value;
        const c2 = game.playerHand[1].value;

        // Ensure cards have same value (10, J, Q, K are all 10s usually, but for simplicity strict equality is fine or value equality)
        const v1 = ["J", "Q", "K"].includes(c1) ? "10" : c1;
        const v2 = ["J", "Q", "K"].includes(c2) ? "10" : c2;

        if (v1 !== v2) {
            return res.status(400).json({ message: "Cards must be of equal value to split." });
        }

        const user = await User.findById(game.userId);
        if (user.balance < game.betAmount) {
            return res.status(400).json({ message: "Not enough credits to split." });
        }

        // Deduct another betAmount
        user.balance -= game.betAmount;
        await user.save();

        game.splitBetAmount = game.betAmount;
        game.splitHand = [game.playerHand.pop(), game.deck.pop()];
        game.playerHand.push(game.deck.pop());
        
        game.status = "split_active";
        game.activeHand = "playerHand";

        game.markModified('playerHand');
        game.markModified('splitHand');
        game.markModified('deck');
        await game.save();

        res.status(200).json({
            playerHand: game.playerHand,
            splitHand: game.splitHand,
            activeHand: game.activeHand,
            dealerHand: [game.dealerHand[0], { suit: "hidden", value: "hidden" }],
            status: game.status,
            user: {
                _id: user._id,
                username: user.username,
                balance: user.balance,
            },
        });

    } catch (error) {
        console.error("Split Error:", error);
        res.status(500).json({ message: "Server error." });
    }
};
