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
  // Create one new shuffled deck through the third-party API.
  const shuffleResponse = await fetch(
    `${DECK_API_URL}/new/shuffle/?deck_count=1`
  );

  const shuffleData = await shuffleResponse.json();

  if (!shuffleResponse.ok || shuffleData.success === false) {
    throw new Error("Could not create a shuffled deck.");
  }

  // Draw all 52 shuffled cards so the existing Blackjack logic
  // can continue using deck.pop() without other changes.
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
  if (["J", "Q", "K"].includes(card.value)) return 10;
  if (card.value === "A") return 11;
  return parseInt(card.value, 10);
}

function getHandTotal(hand) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    total += getCardValue(card);

    if (card.value === "A") {
      aces++;
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

export const startGame = async (req, res) => {
  try {
    const deck = await createDeck();

    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    const playerTotal = getHandTotal(playerHand);
    const dealerTotal = getHandTotal(dealerHand);

    let status = "active";

    if (playerTotal === 21) {
      status = "blackjack";
    }

    res.json({
      playerHand,
      dealerHand: [
        dealerHand[0],
        {
          suit: "hidden",
          value: "hidden",
        },
      ],
      realDealerHand: dealerHand,
      dealerVisibleCard: dealerHand[0],
      deck,
      playerTotal,
      dealerTotal,
      status,
    });
  } catch (error) {
    console.error("Blackjack start error:", error);

    res.status(500).json({
      message: "Error starting game with the card API.",
    });
  }
};

export const hitCard = async (req, res) => {
  try {
    const { deck, playerHand } = req.body;

    if (!deck || !playerHand) {
      return res.status(400).json({
        message: "Missing deck or playerHand.",
      });
    }

    if (deck.length === 0) {
      return res.status(400).json({
        message: "The deck is empty.",
      });
    }

    const newCard = deck.pop();
    const updatedHand = [...playerHand, newCard];
    const playerTotal = getHandTotal(updatedHand);

    let status = "active";

    if (playerTotal > 21) {
      status = "bust";
    } else if (playerTotal === 21) {
      status = "stand";
    }

    const { dealerHand } = req.body;

    res.json({
      playerHand: updatedHand,
      dealerHand,
      deck,
      playerTotal,
      status,
    });
  } catch (error) {
    console.error("Blackjack hit error:", error);

    res.status(500).json({
      message: "Error processing hit.",
    });
  }
};

export const standGame = async (req, res) => {
  try {
    const { deck, playerHand, dealerHand } = req.body;

    if (!deck || !playerHand || !dealerHand) {
      return res.status(400).json({
        message: "Missing game data.",
      });
    }

    let updatedDealerHand = [...dealerHand];
    let dealerTotal = getHandTotal(updatedDealerHand);

    while (dealerTotal < 17 && deck.length > 0) {
      updatedDealerHand.push(deck.pop());
      dealerTotal = getHandTotal(updatedDealerHand);
    }

    const playerTotal = getHandTotal(playerHand);

    let status;

    if (dealerTotal > 21) {
      status = "dealer_bust";
    } else if (playerTotal > dealerTotal) {
      status = "win";
    } else if (playerTotal < dealerTotal) {
      status = "loss";
    } else {
      status = "tie";
    }

    res.json({
      playerHand,
      dealerHand: updatedDealerHand,
      deck,
      playerTotal,
      dealerTotal,
      status,
    });
  } catch (error) {
    console.error("Blackjack stand error:", error);

    res.status(500).json({
      message: "Error processing stand.",
    });
  }
};