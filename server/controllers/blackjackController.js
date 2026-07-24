import User from "../models/User.js";

const DECK_API_URL = "https://deckofcardsapi.com/api/deck";

const convertApiCard = (card) => {
  const valueMap = {
    ACE: "A",
    KING: "K",
    QUEEN: "Q",
    JACK: "J",
  };

  return {
    suit: card.suit.toLowerCase(),
    value: valueMap[card.value] || card.value,
    code: card.code,
    image: card.image,
  };
};

async function createDeck() {
  const shuffleResponse = await fetch(
    `${DECK_API_URL}/new/shuffle/?deck_count=1`
  );

  const shuffleData = await shuffleResponse.json();

  if (!shuffleResponse.ok || shuffleData.success === false) {
    throw new Error("Could not create a shuffled deck.");
  }

  const drawResponse = await fetch(
    `${DECK_API_URL}/${shuffleData.deck_id}/draw/?count=52`
  );

  const drawData = await drawResponse.json();

  if (!drawResponse.ok || drawData.success === false) {
    throw new Error("Could not retrieve cards from the deck.");
  }

  return drawData.cards.map(convertApiCard);
}

function getCardValue(card) {
  if (["J", "Q", "K"].includes(card.value)) {
    return 10;
  }

  if (card.value === "A") {
    return 11;
  }

  return Number.parseInt(card.value, 10);
}

function getHandTotal(hand = []) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    if (!card || card.value === "hidden") {
      continue;
    }

    total += getCardValue(card);

    if (card.value === "A") {
      aces += 1;
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function hideDealerHand(dealerHand) {
  return [
    dealerHand[0],
    {
      suit: "hidden",
      value: "hidden",
    },
  ];
}

function playDealerHand(deck, dealerHand) {
  const updatedDeck = [...deck];
  const updatedDealerHand = [...dealerHand];

  while (
    getHandTotal(updatedDealerHand) < 17 &&
    updatedDeck.length > 0
  ) {
    updatedDealerHand.push(updatedDeck.pop());
  }

  return {
    deck: updatedDeck,
    dealerHand: updatedDealerHand,
  };
}

function determineResult(playerHand, dealerHand) {
  const playerTotal = getHandTotal(playerHand);
  const dealerTotal = getHandTotal(dealerHand);

  if (playerTotal > 21) {
    return {
      result: "loss",
      playerTotal,
      dealerTotal,
    };
  }

  if (dealerTotal > 21) {
    return {
      result: "win",
      playerTotal,
      dealerTotal,
    };
  }

  if (playerTotal > dealerTotal) {
    return {
      result: "win",
      playerTotal,
      dealerTotal,
    };
  }

  if (playerTotal < dealerTotal) {
    return {
      result: "loss",
      playerTotal,
      dealerTotal,
    };
  }

  return {
    result: "tie",
    playerTotal,
    dealerTotal,
  };
}

async function deductAdditionalBet(userId, betAmount) {
  const numericBet = Number(betAmount);

  if (
    !userId ||
    !Number.isFinite(numericBet) ||
    numericBet < 1
  ) {
    throw new Error("Missing userId or betAmount.");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.balance < numericBet) {
    throw new Error("Not enough credits.");
  }

  user.balance -= numericBet;
  await user.save();

  return user;
}

async function settleResolvedGame({
  userId,
  result,
  totalStake,
  winPayout,
}) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  user.totalGames = (user.totalGames || 0) + 1;

  if (result === "win") {
    user.balance += winPayout;
    user.totalWins = (user.totalWins || 0) + 1;

    user.totalBalanceWon =
      (user.totalBalanceWon || 0) +
      Math.max(0, winPayout - totalStake);
  } else if (result === "loss") {
    user.totalLosses = (user.totalLosses || 0) + 1;
  } else {
    user.balance += totalStake;
  }

  await user.save();

  return user;
}

export const startGame = async (req, res) => {
  try {
    const deck = await createDeck();

    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    const playerTotal = getHandTotal(playerHand);
    const dealerTotal = getHandTotal(dealerHand);

    const status =
      playerTotal === 21 ? "blackjack" : "active";

    return res.json({
      playerHand,
      dealerHand: hideDealerHand(dealerHand),
      realDealerHand: dealerHand,
      dealerVisibleCard: dealerHand[0],
      deck,
      playerTotal,
      dealerTotal,
      splitHand: null,
      activeHand: "playerHand",
      status,
    });
  } catch (error) {
    console.error("Blackjack start error:", error);

    return res.status(500).json({
      message: "Error starting game with the card API.",
    });
  }
};

export const hit = async (req, res) => {
  try {
    const {
      deck,
      playerHand,
      splitHand,
      activeHand = "playerHand",
      dealerHand,
      realDealerHand,
    } = req.body;

    if (
      !Array.isArray(deck) ||
      !Array.isArray(playerHand)
    ) {
      return res.status(400).json({
        message: "Missing deck or playerHand.",
      });
    }

    if (deck.length === 0) {
      return res.status(400).json({
        message: "The deck is empty.",
      });
    }

    const updatedDeck = [...deck];
    const newCard = updatedDeck.pop();

    let updatedPlayerHand = [...playerHand];

    let updatedSplitHand = Array.isArray(splitHand)
      ? [...splitHand]
      : null;

    let nextActiveHand = activeHand;

    let status = updatedSplitHand
      ? "split_active"
      : "active";

    if (
      updatedSplitHand &&
      activeHand === "splitHand"
    ) {
      updatedSplitHand.push(newCard);

      const splitTotal = getHandTotal(updatedSplitHand);

      if (splitTotal >= 21) {
        status = "split_active";
      }
    } else {
      updatedPlayerHand.push(newCard);

      const playerTotal =
        getHandTotal(updatedPlayerHand);

      if (updatedSplitHand && playerTotal >= 21) {
        nextActiveHand = "splitHand";
        status = "split_active";
      } else if (
        !updatedSplitHand &&
        playerTotal > 21
      ) {
        status = "bust";
      } else if (
        !updatedSplitHand &&
        playerTotal === 21
      ) {
        status = "stand";
      }
    }

    return res.json({
      playerHand: updatedPlayerHand,
      splitHand: updatedSplitHand,
      activeHand: nextActiveHand,
      dealerHand,
      realDealerHand,
      deck: updatedDeck,
      playerTotal: getHandTotal(updatedPlayerHand),
      splitTotal: updatedSplitHand
        ? getHandTotal(updatedSplitHand)
        : 0,
      status,
    });
  } catch (error) {
    console.error("Blackjack hit error:", error);

    return res.status(500).json({
      message: "Error processing hit.",
    });
  }
};

export const stand = async (req, res) => {
  try {
    const {
      deck,
      playerHand,
      splitHand,
      activeHand = "playerHand",
      dealerHand,
      userId,
      betAmount,
    } = req.body;

    if (
      !Array.isArray(deck) ||
      !Array.isArray(playerHand) ||
      !Array.isArray(dealerHand)
    ) {
      return res.status(400).json({
        message: "Missing game data.",
      });
    }

    if (
      Array.isArray(splitHand) &&
      activeHand === "playerHand"
    ) {
      return res.json({
        playerHand,
        splitHand,
        activeHand: "splitHand",
        dealerHand: hideDealerHand(dealerHand),
        realDealerHand: dealerHand,
        deck,
        playerTotal: getHandTotal(playerHand),
        splitTotal: getHandTotal(splitHand),
        status: "split_active",
      });
    }

    const dealerResult = playDealerHand(
      deck,
      dealerHand
    );

    const updatedDeck = dealerResult.deck;
    const updatedDealerHand =
      dealerResult.dealerHand;

    if (Array.isArray(splitHand)) {
      const numericBet = Number(betAmount);

      if (
        !userId ||
        !Number.isFinite(numericBet) ||
        numericBet < 1
      ) {
        return res.status(400).json({
          message:
            "Split settlement requires userId and betAmount.",
        });
      }

      const firstResult = determineResult(
        playerHand,
        updatedDealerHand
      );

      const secondResult = determineResult(
        splitHand,
        updatedDealerHand
      );

      let returnedCredits = 0;
      let wins = 0;
      let losses = 0;

      for (const handResult of [
        firstResult,
        secondResult,
      ]) {
        if (handResult.result === "win") {
          returnedCredits += numericBet * 2;
          wins += 1;
        } else if (handResult.result === "tie") {
          returnedCredits += numericBet;
        } else {
          losses += 1;
        }
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      user.balance += returnedCredits;

      user.totalGames =
        (user.totalGames || 0) + 1;

      user.totalWins =
        (user.totalWins || 0) + wins;

      user.totalLosses =
        (user.totalLosses || 0) + losses;

      user.totalBalanceWon =
        (user.totalBalanceWon || 0) +
        Math.max(
          0,
          returnedCredits - numericBet * 2
        );

      await user.save();

      return res.json({
        playerHand,
        splitHand,
        activeHand: "splitHand",
        dealerHand: updatedDealerHand,
        realDealerHand: updatedDealerHand,
        deck: updatedDeck,
        playerTotal: firstResult.playerTotal,
        splitTotal: secondResult.playerTotal,
        dealerTotal: firstResult.dealerTotal,
        splitResults: [
          firstResult.result,
          secondResult.result,
        ],
        status: "finished",
        user,
      });
    }

    const result = determineResult(
      playerHand,
      updatedDealerHand
    );

    let status;

    if (result.result === "win") {
      status =
        result.dealerTotal > 21
          ? "dealer_bust"
          : "player_won";
    } else if (result.result === "loss") {
      status = "dealer_won";
    } else {
      status = "push";
    }

    return res.json({
      playerHand,
      dealerHand: updatedDealerHand,
      realDealerHand: updatedDealerHand,
      deck: updatedDeck,
      playerTotal: result.playerTotal,
      dealerTotal: result.dealerTotal,
      status,
      result: result.result,
    });
  } catch (error) {
    console.error("Blackjack stand error:", error);

    return res.status(500).json({
      message:
        error.message || "Error processing stand.",
    });
  }
};

export const doubleHand = async (req, res) => {
  try {
    const {
      deck,
      playerHand,
      dealerHand,
      betAmount,
      userId,
    } = req.body;

    if (
      !Array.isArray(deck) ||
      !Array.isArray(playerHand) ||
      !Array.isArray(dealerHand) ||
      playerHand.length !== 2
    ) {
      return res.status(400).json({
        message: "Invalid double-down game data.",
      });
    }

    if (deck.length === 0) {
      return res.status(400).json({
        message: "The deck is empty.",
      });
    }

    const numericBet = Number(betAmount);

    await deductAdditionalBet(
      userId,
      numericBet
    );

    const updatedDeck = [...deck];

    const updatedPlayerHand = [
      ...playerHand,
      updatedDeck.pop(),
    ];

    const dealerResult = playDealerHand(
      updatedDeck,
      dealerHand
    );

    const finalResult = determineResult(
      updatedPlayerHand,
      dealerResult.dealerHand
    );

    const totalStake = numericBet * 2;
    const winPayout = numericBet * 4;

    const user = await settleResolvedGame({
      userId,
      result: finalResult.result,
      totalStake,
      winPayout,
    });

    return res.json({
      playerHand: updatedPlayerHand,
      dealerHand: dealerResult.dealerHand,
      realDealerHand: dealerResult.dealerHand,
      deck: dealerResult.deck,
      playerTotal: finalResult.playerTotal,
      dealerTotal: finalResult.dealerTotal,
      status: "finished",
      result: finalResult.result,
      user,
    });
  } catch (error) {
    console.error("Blackjack double error:", error);

    const statusCode = [
      "Not enough credits.",
      "Missing userId or betAmount.",
      "User not found.",
    ].includes(error.message)
      ? 400
      : 500;

    return res.status(statusCode).json({
      message:
        error.message || "Error doubling down.",
    });
  }
};

export const splitHand = async (req, res) => {
  try {
    const {
      deck,
      playerHand,
      dealerHand,
      betAmount,
      userId,
    } = req.body;

    if (
      !Array.isArray(deck) ||
      !Array.isArray(playerHand) ||
      !Array.isArray(dealerHand) ||
      playerHand.length !== 2
    ) {
      return res.status(400).json({
        message: "Invalid split game data.",
      });
    }

    const firstValue = [
      "10",
      "J",
      "Q",
      "K",
    ].includes(playerHand[0].value)
      ? 10
      : Number(playerHand[0].value);

    const secondValue = [
      "10",
      "J",
      "Q",
      "K",
    ].includes(playerHand[1].value)
      ? 10
      : Number(playerHand[1].value);

    if (firstValue !== secondValue) {
      return res.status(400).json({
        message: "These cards cannot be split.",
      });
    }

    if (deck.length < 2) {
      return res.status(400).json({
        message:
          "Not enough cards remain to split.",
      });
    }

    const numericBet = Number(betAmount);

    const user = await deductAdditionalBet(
      userId,
      numericBet
    );

    const updatedDeck = [...deck];

    const firstHand = [
      playerHand[0],
      updatedDeck.pop(),
    ];

    const secondHand = [
      playerHand[1],
      updatedDeck.pop(),
    ];

    return res.json({
      playerHand: firstHand,
      splitHand: secondHand,
      activeHand: "playerHand",
      dealerHand: hideDealerHand(dealerHand),
      realDealerHand: dealerHand,
      deck: updatedDeck,
      playerTotal: getHandTotal(firstHand),
      splitTotal: getHandTotal(secondHand),
      status: "split_active",
      user,
    });
  } catch (error) {
    console.error("Blackjack split error:", error);

    const statusCode = [
      "Not enough credits.",
      "Missing userId or betAmount.",
      "User not found.",
    ].includes(error.message)
      ? 400
      : 500;

    return res.status(statusCode).json({
      message:
        error.message || "Error splitting hand.",
    });
  }
};