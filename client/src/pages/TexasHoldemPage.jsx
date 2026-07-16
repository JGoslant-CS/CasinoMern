import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import "../styles/TexasHoldemPage.css";

const API_URL = "https://casinomern.onrender.com";

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const Card = ({ card, hidden = false }) => {
  if (!card) return null;

  if (hidden) {
    return (
      <div className="playing-card hidden-card">
        <div className="card-back-pattern"></div>
      </div>
    );
  }

  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  const suitSymbol = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  }[card.suit];

  return (
    <div className={`playing-card ${isRed ? "red" : "black"}`}>
      <div className="card-top">
        <span className="card-value">{card.value}</span>
        <span className="card-suit">{suitSymbol}</span>
      </div>

      <div className="card-center">{suitSymbol}</div>

      <div className="card-bottom">
        <span className="card-value">{card.value}</span>
        <span className="card-suit">{suitSymbol}</span>
      </div>
    </div>
  );
};

const createDeck = () => {
  const deck = [];

  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }

  return deck;
};

const shuffleDeck = (deck) => {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[i],
    ];
  }

  return shuffled;
};

const getNumericValue = (value) => {
  if (value === "A") return 14;
  if (value === "K") return 13;
  if (value === "Q") return 12;
  if (value === "J") return 11;
  return Number(value);
};

const getStraightHigh = (values) => {
  const uniqueValues = [...new Set(values)].sort((a, b) => b - a);

  // Ace may also be used as 1 in A-2-3-4-5.
  if (uniqueValues.includes(14)) {
    uniqueValues.push(1);
  }

  let run = 1;

  for (let i = 1; i < uniqueValues.length; i += 1) {
    if (uniqueValues[i - 1] - 1 === uniqueValues[i]) {
      run += 1;

      if (run >= 5) {
        return uniqueValues[i - 4];
      }
    } else {
      run = 1;
    }
  }

  return 0;
};

const evaluateFiveCards = (cards) => {
  const values = cards
    .map((card) => getNumericValue(card.value))
    .sort((a, b) => b - a);

  const suits = cards.map((card) => card.suit);
  const flush = suits.every((suit) => suit === suits[0]);
  const straightHigh = getStraightHigh(values);

  const counts = values.reduce((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});

  const groups = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  if (flush && straightHigh) {
    return {
      score: [8, straightHigh],
      name: straightHigh === 14 ? "Royal Flush" : "Straight Flush",
    };
  }

  if (groups[0].count === 4) {
    const kicker = groups.find((group) => group.count === 1).value;
    return {
      score: [7, groups[0].value, kicker],
      name: "Four of a Kind",
    };
  }

  if (groups[0].count === 3 && groups[1].count === 2) {
    return {
      score: [6, groups[0].value, groups[1].value],
      name: "Full House",
    };
  }

  if (flush) {
    return {
      score: [5, ...values],
      name: "Flush",
    };
  }

  if (straightHigh) {
    return {
      score: [4, straightHigh],
      name: "Straight",
    };
  }

  if (groups[0].count === 3) {
    const kickers = groups
      .filter((group) => group.count === 1)
      .map((group) => group.value)
      .sort((a, b) => b - a);

    return {
      score: [3, groups[0].value, ...kickers],
      name: "Three of a Kind",
    };
  }

  const pairs = groups
    .filter((group) => group.count === 2)
    .sort((a, b) => b.value - a.value);

  if (pairs.length >= 2) {
    const kicker = groups
      .filter((group) => group.count === 1)
      .map((group) => group.value)
      .sort((a, b) => b - a)[0];

    return {
      score: [2, pairs[0].value, pairs[1].value, kicker],
      name: "Two Pair",
    };
  }

  if (pairs.length === 1) {
    const kickers = groups
      .filter((group) => group.count === 1)
      .map((group) => group.value)
      .sort((a, b) => b - a);

    return {
      score: [1, pairs[0].value, ...kickers],
      name: "One Pair",
    };
  }

  return {
    score: [0, ...values],
    name: "High Card",
  };
};

const compareScores = (firstScore, secondScore) => {
  const length = Math.max(firstScore.length, secondScore.length);

  for (let i = 0; i < length; i += 1) {
    const first = firstScore[i] || 0;
    const second = secondScore[i] || 0;

    if (first > second) return 1;
    if (first < second) return -1;
  }

  return 0;
};

const evaluateBestHand = (cards) => {
  let bestResult = null;

  for (let first = 0; first < cards.length - 4; first += 1) {
    for (let second = first + 1; second < cards.length - 3; second += 1) {
      for (let third = second + 1; third < cards.length - 2; third += 1) {
        for (let fourth = third + 1; fourth < cards.length - 1; fourth += 1) {
          for (let fifth = fourth + 1; fifth < cards.length; fifth += 1) {
            const result = evaluateFiveCards([
              cards[first],
              cards[second],
              cards[third],
              cards[fourth],
              cards[fifth],
            ]);

            if (
              !bestResult ||
              compareScores(result.score, bestResult.score) > 0
            ) {
              bestResult = result;
            }
          }
        }
      }
    }
  }

  return bestResult;
};

function TexasHoldemPage({ user, setUser }) {
  const navigate = useNavigate();

  const [betAmount, setBetAmount] = useState(1);
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);
  const [stage, setStage] = useState("idle");
  const [message, setMessage] = useState("Place your bet and deal!");
  const [pot, setPot] = useState(0);
  const [playerContribution, setPlayerContribution] = useState(0);
  const [dealerContribution, setDealerContribution] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDealerCards, setShowDealerCards] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [playerHandName, setPlayerHandName] = useState("");
  const [dealerHandName, setDealerHandName] = useState("");

  const updateStoredUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const deductCredits = async (amount) => {
    const response = await fetch(`${API_URL}/api/game/bet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user._id || user.id,
        betAmount: amount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not place bet.");
    }

    updateStoredUser(data.user);
    return data.user;
  };

  const saveGameResult = async (result, payout = 0) => {
  const response = await fetch(
    `${API_URL}/api/game/texas-holdem/result`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user._id || user.id,
        result,
        payout,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Could not save Texas Hold'em result."
    );
  }

  updateStoredUser(data.user);
};

  const triggerWinEffect = () => {
    setShowExplosion(true);
    window.setTimeout(() => setShowExplosion(false), 2000);
  };

  const deal = async () => {
    if (!user) {
      setMessage("Please log in first.");
      return;
    }

    if (betAmount < 1 || betAmount > 100) {
      setMessage("Bet must be between 1 and 100 credits.");
      return;
    }

    if (user.balance < betAmount) {
      setMessage("Not enough credits.");
      return;
    }

    setLoading(true);
    setMessage("Dealing the hole cards...");

    try {
      await deductCredits(betAmount);

      const shuffledDeck = shuffleDeck(createDeck());
      const playerCards = [shuffledDeck[0], shuffledDeck[2]];
      const dealerCards = [shuffledDeck[1], shuffledDeck[3]];

      setDeck(shuffledDeck.slice(4));
      setPlayerHand(playerCards);
      setDealerHand(dealerCards);
      setCommunityCards([]);
      setStage("preflop");
      setPot(betAmount * 2);
      setPlayerContribution(betAmount);
      setDealerContribution(betAmount);
      setShowDealerCards(false);
      setPlayerHandName("");
      setDealerHandName("");
      setMessage("Pre-Flop: Check, Raise, or Fold?");
    } catch (error) {
      setMessage(error.message || "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const revealNextCards = (currentDeck, currentStage) => {
    if (currentStage === "preflop") {
      return {
        nextDeck: currentDeck.slice(3),
        nextCards: currentDeck.slice(0, 3),
        nextStage: "flop",
        nextMessage: "The Flop: Check, Raise, or Fold?",
      };
    }

    if (currentStage === "flop") {
      return {
        nextDeck: currentDeck.slice(1),
        nextCards: [currentDeck[0]],
        nextStage: "turn",
        nextMessage: "The Turn: Check, Raise, or Fold?",
      };
    }

    return {
      nextDeck: currentDeck.slice(1),
      nextCards: [currentDeck[0]],
      nextStage: "river",
      nextMessage: "The River: Check, Raise, or Fold?",
    };
  };

  const showdown = async (finalCommunityCards = communityCards) => {
    const playerResult = evaluateBestHand([
      ...playerHand,
      ...finalCommunityCards,
    ]);

    const dealerResult = evaluateBestHand([
      ...dealerHand,
      ...finalCommunityCards,
    ]);

    setShowDealerCards(true);
    setPlayerHandName(playerResult.name);
    setDealerHandName(dealerResult.name);
    setStage("finished");

    const comparison = compareScores(playerResult.score, dealerResult.score);

    if (comparison > 0) {
      const payout = pot;
      await saveGameResult("win", payout);
      setMessage(`You win with ${playerResult.name}! +${payout} credits`);
      triggerWinEffect();
      return;
    }

    if (comparison < 0) {
      await saveGameResult("loss", 0);
      setMessage(`Dealer wins with ${dealerResult.name}.`);
      return;
    }

    await saveGameResult("push", playerContribution);
    setMessage(`Push — both players have ${playerResult.name}.`);
  };

  const check = async () => {
    if (!["preflop", "flop", "turn", "river"].includes(stage)) return;

    setLoading(true);

    try {
      if (stage === "river") {
        await showdown();
        return;
      }

      const {
        nextDeck,
        nextCards,
        nextStage,
        nextMessage,
      } = revealNextCards(deck, stage);

      setDeck(nextDeck);
      setCommunityCards((currentCards) => [
        ...currentCards,
        ...nextCards,
      ]);
      setStage(nextStage);
      setMessage(nextMessage);
    } catch (error) {
      setMessage(error.message || "Could not finish the hand.");
    } finally {
      setLoading(false);
    }
  };

  const raise = async () => {
    if (!["preflop", "flop", "turn", "river"].includes(stage)) return;

    if (!user || user.balance < betAmount) {
      setMessage("Not enough credits to raise.");
      return;
    }

    setLoading(true);

    try {
      await deductCredits(betAmount);

      const newPlayerContribution = playerContribution + betAmount;
      const newDealerContribution = dealerContribution + betAmount;
      const newPot = pot + betAmount * 2;

      setPlayerContribution(newPlayerContribution);
      setDealerContribution(newDealerContribution);
      setPot(newPot);

      if (stage === "river") {
        const playerResult = evaluateBestHand([
          ...playerHand,
          ...communityCards,
        ]);

        const dealerResult = evaluateBestHand([
          ...dealerHand,
          ...communityCards,
        ]);

        setShowDealerCards(true);
        setPlayerHandName(playerResult.name);
        setDealerHandName(dealerResult.name);
        setStage("finished");

        const comparison = compareScores(
          playerResult.score,
          dealerResult.score
        );

        if (comparison > 0) {
          await saveGameResult("win", newPot);
          setMessage(
            `Your raise paid off! ${playerResult.name} wins +${newPot} credits.`
          );
          triggerWinEffect();
        } else if (comparison < 0) {
          await saveGameResult("loss", 0);
          setMessage(`Dealer wins with ${dealerResult.name}.`);
        } else {
          await saveGameResult("push", newPlayerContribution);
          setMessage(`Push — both players have ${playerResult.name}.`);
        }

        return;
      }

      const {
        nextDeck,
        nextCards,
        nextStage,
        nextMessage,
      } = revealNextCards(deck, stage);

      setDeck(nextDeck);
      setCommunityCards((currentCards) => [
        ...currentCards,
        ...nextCards,
      ]);
      setStage(nextStage);
      setMessage(`Dealer calls. ${nextMessage}`);
    } catch (error) {
      setMessage(error.message || "Could not place raise.");
    } finally {
      setLoading(false);
    }
  };

  const fold = async () => {
    if (!["preflop", "flop", "turn", "river"].includes(stage)) {
      return;
    }

    setLoading(true);

    try {
      await saveGameResult("loss", 0);

      setShowDealerCards(true);
      setStage("finished");
      setMessage("You folded. Dealer wins the pot.");
    } catch (error) {
      setMessage(error.message || "Could not save the result.");
    } finally {
      setLoading(false);
    }
  };

  const isHandActive = ["preflop", "flop", "turn", "river"].includes(stage);

  return (
    <div className="casino-page texas-holdem-page">
      {showExplosion && <div className="win-explosion"></div>}

      <nav className="navbar">
        <div
          className="logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <span className="logo-icon">♠</span>
          <div>
            <h2>CASINO</h2>
            <p>MERN</p>
          </div>
        </div>

        <button
          className="back-home-btn-nav"
          onClick={() => navigate("/")}
        >
          ← Back Home
        </button>
      </nav>

      <div className="holdem-table">
        <div className="balance-badge">
          Balance: <span>{user?.balance ?? 0}</span> Credits
        </div>

        <div className="pot-badge">
          Pot: <span>{pot}</span> Credits
        </div>

        <div className="holdem-game-area">
          <div className="dealer-area">
            <h3 className="hand-label">
              Dealer {showDealerCards && dealerHandName ? `— ${dealerHandName}` : ""}
            </h3>

            <div className="hand">
              {dealerHand.map((card, index) => (
                <div key={`dealer-${index}`} className="card-wrapper">
                  <Card card={card} hidden={!showDealerCards} />
                </div>
              ))}
            </div>
          </div>

          <div className="community-area">
            <h3 className="hand-label">Community Cards</h3>

            <div className="community-hand">
              {[0, 1, 2, 3, 4].map((slot) => (
                <div key={slot} className="community-card-slot">
                  {communityCards[slot] ? (
                    <div className="card-wrapper">
                      <Card card={communityCards[slot]} />
                    </div>
                  ) : (
                    <span>{slot < 3 ? "FLOP" : slot === 3 ? "TURN" : "RIVER"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="center-message">
            <h2>{message}</h2>
          </div>

          <div className="player-area">
            <h3 className="hand-label">
              Your Hand {playerHandName ? `— ${playerHandName}` : ""}
            </h3>

            <div className="hand">
              {playerHand.map((card, index) => (
                <div key={`player-${index}`} className="card-wrapper">
                  <Card card={card} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="controls-panel">
          <div className="bet-controls">
            <button
              className="bet-adjust-btn"
              onClick={() =>
                setBetAmount(betAmount <= 50 ? 1 : betAmount - 50)
              }
              disabled={isHandActive || loading}
            >
              -50
            </button>

            <button
              className="bet-adjust-btn"
              onClick={() =>
                setBetAmount(betAmount <= 25 ? 1 : betAmount - 25)
              }
              disabled={isHandActive || loading}
            >
              -25
            </button>

            <button
              className="bet-adjust-btn"
              onClick={() =>
                setBetAmount(betAmount <= 10 ? 1 : betAmount - 10)
              }
              disabled={isHandActive || loading}
            >
              -10
            </button>

            <button
              className="bet-adjust-btn"
              onClick={() => setBetAmount(Math.max(1, betAmount - 1))}
              disabled={isHandActive || loading}
            >
              -1
            </button>

            <div className="bet-display">Bet: {betAmount}</div>

            <button
              className="bet-adjust-btn"
              onClick={() => setBetAmount(Math.min(100, betAmount + 1))}
              disabled={isHandActive || loading}
            >
              +1
            </button>

            <button
              className="bet-adjust-btn"
              onClick={() =>
                setBetAmount(
                  betAmount < 10 ? 10 : Math.min(100, betAmount + 10)
                )
              }
              disabled={isHandActive || loading}
            >
              +10
            </button>

            <button
              className="bet-adjust-btn"
              onClick={() =>
                setBetAmount(
                  betAmount < 25 ? 25 : Math.min(100, betAmount + 25)
                )
              }
              disabled={isHandActive || loading}
            >
              +25
            </button>

            <button
              className="bet-adjust-btn"
              onClick={() =>
                setBetAmount(
                  betAmount < 50 ? 50 : Math.min(100, betAmount + 50)
                )
              }
              disabled={isHandActive || loading}
            >
              +50
            </button>
          </div>

          <div className="action-controls">
            {isHandActive ? (
              <>
                <button
                  className="action-btn check-btn"
                  onClick={check}
                  disabled={loading}
                >
                  {stage === "river" ? "Showdown" : "Check"}
                </button>

                <button
                  className="action-btn raise-btn"
                  onClick={raise}
                  disabled={loading || user?.balance < betAmount}
                >
                  Raise {betAmount}
                </button>

                <button
                  className="action-btn fold-btn"
                  onClick={fold}
                  disabled={loading}
                >
                  Fold
                </button>
              </>
            ) : (
              <button
                className="action-btn deal-btn"
                onClick={deal}
                disabled={loading}
              >
                Deal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TexasHoldemPage;