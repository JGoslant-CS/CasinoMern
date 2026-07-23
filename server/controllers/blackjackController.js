const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];
const values = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function getCardValue(card) {
  if (["J", "Q", "K"].includes(card.value)) return 10;
  if (card.value === "A") return 11;
  return parseInt(card.value);
}

function getHandTotal(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += getCardValue(card);
    if (card.value === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export const startGame = async (req, res) => {
  try {
    const deck = createDeck();
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
      dealerHand: [dealerHand[0], { suit: "Hidden", value: "Hidden" }],
      realDealerHand: dealerHand,
      dealerVisibleCard: dealerHand[0],
      deck,
      playerTotal,
      status,
    });
  } catch (error) {
    res.status(500).json({ message: "Error starting game." });
  }
};

export const hitCard = async (req, res) => {
  try {
    const { deck, playerHand } = req.body;

    if (!deck || !playerHand) {
      return res.status(400).json({ message: "Missing deck or playerHand." });
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
    res.status(500).json({ message: "Error processing hit." });
  }
};

export const standGame = async (req, res) => {
  try {
    const { deck, playerHand, dealerHand } = req.body;

    if (!deck || !playerHand || !dealerHand) {
      return res.status(400).json({ message: "Missing game data." });
    }

    let updatedDealerHand = [...dealerHand];
    let dealerTotal = getHandTotal(updatedDealerHand);

    while (dealerTotal < 17) {
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
      playerTotal,
      dealerTotal,
      status,
    });
  } catch (error) {
    res.status(500).json({ message: "Error processing stand." });
  }
};