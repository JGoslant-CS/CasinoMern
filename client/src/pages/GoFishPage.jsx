import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import "../styles/GoFishPage.css";

const DECK_API_URL = "https://deckofcardsapi.com/api/deck";

const VALUE_ORDER = {
  ACE: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  JACK: 11,
  QUEEN: 12,
  KING: 13,
};

const DISPLAY_VALUES = {
  ACE: "Ace",
  JACK: "Jack",
  QUEEN: "Queen",
  KING: "King",
};

function GoFishPage() {
  const navigate = useNavigate();

  const [deckId, setDeckId] = useState("");
  const [remaining, setRemaining] = useState(52);

  const [playerHand, setPlayerHand] = useState([]);
  const [computerHand, setComputerHand] = useState([]);

  const [playerBooks, setPlayerBooks] = useState([]);
  const [computerBooks, setComputerBooks] = useState([]);

  const [message, setMessage] = useState(
    "Start a new game to begin playing."
  );

  const [loading, setLoading] = useState(false);
  const [computerThinking, setComputerThinking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const sortCards = (cards) => {
    return [...cards].sort((a, b) => {
      const valueDifference =
        VALUE_ORDER[a.value] - VALUE_ORDER[b.value];

      if (valueDifference !== 0) {
        return valueDifference;
      }

      return a.suit.localeCompare(b.suit);
    });
  };

  const formatRank = (rank) => {
    return DISPLAY_VALUES[rank] || rank;
  };

  const getUniqueRanks = (hand) => {
    return [...new Set(hand.map((card) => card.value))].sort(
      (a, b) => VALUE_ORDER[a] - VALUE_ORDER[b]
    );
  };

  const playerRanks = useMemo(
    () => getUniqueRanks(playerHand),
    [playerHand]
  );

  const collectBooks = (hand, currentBooks) => {
    const counts = hand.reduce((accumulator, card) => {
      accumulator[card.value] =
        (accumulator[card.value] || 0) + 1;

      return accumulator;
    }, {});

    const newBookRanks = Object.keys(counts).filter(
      (rank) =>
        counts[rank] === 4 &&
        !currentBooks.includes(rank)
    );

    if (newBookRanks.length === 0) {
      return {
        hand,
        books: currentBooks,
        collectedRanks: [],
      };
    }

    const updatedHand = hand.filter(
      (card) => !newBookRanks.includes(card.value)
    );

    return {
      hand: updatedHand,
      books: [...currentBooks, ...newBookRanks],
      collectedRanks: newBookRanks,
    };
  };

  const drawCards = async (currentDeckId, count = 1) => {
    if (!currentDeckId || count < 1) {
      return [];
    }

    const response = await fetch(
      `${DECK_API_URL}/${currentDeckId}/draw/?count=${count}`
    );

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error("Could not draw cards from the deck.");
    }

    setRemaining(data.remaining);

    return data.cards || [];
  };

  const startNewGame = async () => {
    try {
      setLoading(true);
      setGameOver(false);
      setGameStarted(false);
      setComputerThinking(false);

      setPlayerHand([]);
      setComputerHand([]);
      setPlayerBooks([]);
      setComputerBooks([]);

      setMessage("Shuffling and dealing the cards...");

      /*
       * This request creates a new shuffled deck and draws
       * 14 cards in one API request.
       */
      const response = await fetch(
        `${DECK_API_URL}/new/draw/?count=14`
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error("Could not create a new deck.");
      }

      const newPlayerHand = data.cards.slice(0, 7);
      const newComputerHand = data.cards.slice(7, 14);

      const playerBookResult = collectBooks(
        newPlayerHand,
        []
      );

      const computerBookResult = collectBooks(
        newComputerHand,
        []
      );

      setDeckId(data.deck_id);
      setRemaining(data.remaining);

      setPlayerHand(sortCards(playerBookResult.hand));
      setComputerHand(sortCards(computerBookResult.hand));

      setPlayerBooks(playerBookResult.books);
      setComputerBooks(computerBookResult.books);

      setGameStarted(true);
      setMessage(
        "Your turn. Select a rank from your hand."
      );
    } catch (error) {
      console.error("Go Fish setup error:", error);

      setMessage(
        "Could not start Go Fish. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const checkForGameOver = (
    nextPlayerHand,
    nextComputerHand,
    nextPlayerBooks,
    nextComputerBooks,
    cardsRemaining
  ) => {
    const allBooksCollected =
      nextPlayerBooks.length + nextComputerBooks.length >= 13;

    const noCardsLeft =
      cardsRemaining === 0 &&
      nextPlayerHand.length === 0 &&
      nextComputerHand.length === 0;

    if (!allBooksCollected && !noCardsLeft) {
      return false;
    }

    setGameOver(true);
    setComputerThinking(false);

    if (nextPlayerBooks.length > nextComputerBooks.length) {
      setMessage(
        `You win ${nextPlayerBooks.length} to ${nextComputerBooks.length}!`
      );
    } else if (
      nextComputerBooks.length > nextPlayerBooks.length
    ) {
      setMessage(
        `The computer wins ${nextComputerBooks.length} to ${nextPlayerBooks.length}.`
      );
    } else {
      setMessage(
        `The game ends in a ${nextPlayerBooks.length}-${nextComputerBooks.length} tie.`
      );
    }

    return true;
  };

  const refillEmptyHand = async (
    hand,
    currentDeckId
  ) => {
    if (hand.length > 0 || remaining <= 0) {
      return hand;
    }

    const drawnCards = await drawCards(currentDeckId, 1);

    return [...hand, ...drawnCards];
  };

  const runComputerTurn = async (
    suppliedPlayerHand,
    suppliedComputerHand,
    suppliedPlayerBooks,
    suppliedComputerBooks
  ) => {
    try {
      setComputerThinking(true);

      let nextPlayerHand = [...suppliedPlayerHand];
      let nextComputerHand = [...suppliedComputerHand];
      let nextComputerBooks = [...suppliedComputerBooks];

      if (
        nextComputerHand.length === 0 &&
        remaining > 0
      ) {
        const refillCards = await drawCards(deckId, 1);
        nextComputerHand.push(...refillCards);
      }

      if (nextComputerHand.length === 0) {
        setPlayerHand(sortCards(nextPlayerHand));
        setComputerHand([]);
        setComputerThinking(false);
        setMessage("Your turn.");

        return;
      }

      /*
       * The computer randomly chooses one rank it currently owns.
       */
      const availableRanks = getUniqueRanks(
        nextComputerHand
      );

      const requestedRank =
        availableRanks[
          Math.floor(Math.random() * availableRanks.length)
        ];

      setMessage(
        `Computer asks: Do you have any ${formatRank(
          requestedRank
        )}s?`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 900)
      );

      const matchingPlayerCards = nextPlayerHand.filter(
        (card) => card.value === requestedRank
      );

      if (matchingPlayerCards.length > 0) {
        nextPlayerHand = nextPlayerHand.filter(
          (card) => card.value !== requestedRank
        );

        nextComputerHand = [
          ...nextComputerHand,
          ...matchingPlayerCards,
        ];

        setMessage(
          `You gave the computer ${matchingPlayerCards.length} ${formatRank(
            requestedRank
          )}${matchingPlayerCards.length === 1 ? "" : "s"}.`
        );
      } else if (remaining > 0) {
        setMessage("You say: Go Fish!");

        await new Promise((resolve) =>
          setTimeout(resolve, 700)
        );

        const drawnCards = await drawCards(deckId, 1);

        nextComputerHand = [
          ...nextComputerHand,
          ...drawnCards,
        ];

        setMessage("The computer drew a card.");
      } else {
        setMessage(
          "You say: Go Fish, but the deck is empty."
        );
      }

      const computerBookResult = collectBooks(
        nextComputerHand,
        nextComputerBooks
      );

      nextComputerHand = computerBookResult.hand;
      nextComputerBooks = computerBookResult.books;

      if (computerBookResult.collectedRanks.length > 0) {
        setMessage(
          `The computer completed a book of ${formatRank(
            computerBookResult.collectedRanks[0]
          )}s.`
        );
      }

      if (
        nextPlayerHand.length === 0 &&
        remaining > 0
      ) {
        const refillCards = await drawCards(deckId, 1);
        nextPlayerHand = [
          ...nextPlayerHand,
          ...refillCards,
        ];
      }

      setPlayerHand(sortCards(nextPlayerHand));
      setComputerHand(sortCards(nextComputerHand));
      setComputerBooks(nextComputerBooks);

      const finished = checkForGameOver(
        nextPlayerHand,
        nextComputerHand,
        suppliedPlayerBooks,
        nextComputerBooks,
        remaining
      );

      if (!finished) {
        setMessage(
          "Your turn. Select another rank."
        );
      }
    } catch (error) {
      console.error("Computer turn error:", error);

      setMessage(
        "Something went wrong during the computer's turn."
      );
    } finally {
      setComputerThinking(false);
    }
  };

  const askComputerForRank = async (requestedRank) => {
    if (
      !gameStarted ||
      gameOver ||
      computerThinking ||
      loading
    ) {
      return;
    }

    try {
      let nextPlayerHand = [...playerHand];
      let nextComputerHand = [...computerHand];
      let nextPlayerBooks = [...playerBooks];

      setMessage(
        `You ask: Do you have any ${formatRank(
          requestedRank
        )}s?`
      );

      const matchingComputerCards =
        nextComputerHand.filter(
          (card) => card.value === requestedRank
        );

      if (matchingComputerCards.length > 0) {
        nextComputerHand = nextComputerHand.filter(
          (card) => card.value !== requestedRank
        );

        nextPlayerHand = [
          ...nextPlayerHand,
          ...matchingComputerCards,
        ];

        setMessage(
          `The computer gave you ${matchingComputerCards.length} ${formatRank(
            requestedRank
          )}${matchingComputerCards.length === 1 ? "" : "s"}.`
        );
      } else if (remaining > 0) {
        setMessage("Computer says: Go Fish!");

        const drawnCards = await drawCards(deckId, 1);
        nextPlayerHand = [
          ...nextPlayerHand,
          ...drawnCards,
        ];

        if (
          drawnCards[0]?.value === requestedRank
        ) {
          setMessage(
            `Go Fish! You drew the ${formatRank(
              requestedRank
            )} you requested.`
          );
        } else {
          setMessage("Go Fish! You drew one card.");
        }
      } else {
        setMessage(
          "The computer has none, and the deck is empty."
        );
      }

      const playerBookResult = collectBooks(
        nextPlayerHand,
        nextPlayerBooks
      );

      nextPlayerHand = playerBookResult.hand;
      nextPlayerBooks = playerBookResult.books;

      if (playerBookResult.collectedRanks.length > 0) {
        setMessage(
          `You completed a book of ${formatRank(
            playerBookResult.collectedRanks[0]
          )}s!`
        );
      }

      /*
       * Refill an empty computer hand when cards remain.
       */
      if (
        nextComputerHand.length === 0 &&
        remaining > 0
      ) {
        const refillCards = await drawCards(deckId, 1);
        nextComputerHand = [
          ...nextComputerHand,
          ...refillCards,
        ];
      }

      setPlayerHand(sortCards(nextPlayerHand));
      setComputerHand(sortCards(nextComputerHand));
      setPlayerBooks(nextPlayerBooks);

      const finished = checkForGameOver(
        nextPlayerHand,
        nextComputerHand,
        nextPlayerBooks,
        computerBooks,
        remaining
      );

      if (finished) {
        return;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 900)
      );

      await runComputerTurn(
        nextPlayerHand,
        nextComputerHand,
        nextPlayerBooks,
        computerBooks
      );
    } catch (error) {
      console.error("Player turn error:", error);

      setMessage(
        "Something went wrong while drawing a card."
      );
      setComputerThinking(false);
    }
  };

  useEffect(() => {
    startNewGame();
    // This should only run once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="casino-page go-fish-page">
      <nav className="navbar go-fish-nav">
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

      <main className="go-fish-container">
        <header className="go-fish-header">
          <h1 className="go-fish-title">
            GO <span>FISH</span>
          </h1>

          <p className="go-fish-subtitle">
            Powered by the Deck of Cards third-party API
          </p>
        </header>

        <section className="go-fish-scoreboard">
          <div className="go-fish-score">
            <span>Your Books</span>
            <strong>{playerBooks.length}</strong>
          </div>

          <div className="go-fish-score deck-score">
            <span>Cards Remaining</span>
            <strong>{remaining}</strong>
          </div>

          <div className="go-fish-score">
            <span>Computer Books</span>
            <strong>{computerBooks.length}</strong>
          </div>
        </section>

        <section className="go-fish-message-box">
          <p>{message}</p>

          {computerThinking && (
            <span className="thinking-text">
              Computer is thinking...
            </span>
          )}
        </section>

        <section className="computer-area">
          <div className="hand-heading">
            <div>
              <h2>Computer Hand</h2>
              <p>{computerHand.length} cards</p>
            </div>

            <div className="book-list">
              {computerBooks.map((rank) => (
                <span
                  key={rank}
                  className="book-badge computer-book"
                >
                  {formatRank(rank)}s
                </span>
              ))}
            </div>
          </div>

          <div className="computer-cards">
            {computerHand.map((card, index) => (
              <div
                className="card-back"
                key={`${card.code}-${index}`}
                title="Computer card"
              >
                <span>♠</span>
              </div>
            ))}

            {computerHand.length === 0 && (
              <p className="empty-hand-message">
                No cards in the computer hand
              </p>
            )}
          </div>
        </section>

        <section className="player-area">
          <div className="hand-heading">
            <div>
              <h2>Your Hand</h2>
              <p>
                Click a rank below to ask the computer
              </p>
            </div>

            <div className="book-list">
              {playerBooks.map((rank) => (
                <span
                  key={rank}
                  className="book-badge player-book"
                >
                  {formatRank(rank)}s
                </span>
              ))}
            </div>
          </div>

          <div className="player-cards">
            {playerHand.map((card, index) => (
              <button
                type="button"
                className="playing-card-button"
                key={`${card.code}-${index}`}
                onClick={() =>
                  askComputerForRank(card.value)
                }
                disabled={
                  computerThinking ||
                  loading ||
                  gameOver
                }
                title={`Ask for ${formatRank(
                  card.value
                )}s`}
              >
                <img
                  src={card.image}
                  alt={`${card.value} of ${card.suit}`}
                />
              </button>
            ))}

            {playerHand.length === 0 && (
              <p className="empty-hand-message">
                You currently have no cards
              </p>
            )}
          </div>

          <div className="rank-buttons">
            {playerRanks.map((rank) => (
              <button
                type="button"
                key={rank}
                onClick={() =>
                  askComputerForRank(rank)
                }
                disabled={
                  computerThinking ||
                  loading ||
                  gameOver
                }
              >
                Ask for {formatRank(rank)}s
              </button>
            ))}
          </div>
        </section>

        <section className="go-fish-controls">
          <button
            type="button"
            className="new-go-fish-btn"
            onClick={startNewGame}
            disabled={loading || computerThinking}
          >
            {loading ? "Dealing..." : "New Game"}
          </button>
        </section>
      </main>
    </div>
  );
}

export default GoFishPage;