import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import "../styles/BlackjackPage.css";

const API_URL = "https://casinomern.onrender.com";

const Card = ({ card }) => {
  if (!card) return null;
  
  if (card.suit === "hidden") {
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
    spades: "♠"
  }[card.suit];

  return (
    <div className={`playing-card ${isRed ? "red" : "black"}`}>
      <div className="card-top">
        <span className="card-value">{card.value}</span>
        <span className="card-suit">{suitSymbol}</span>
      </div>
      <div className="card-center">
        {suitSymbol}
      </div>
      <div className="card-bottom">
        <span className="card-value">{card.value}</span>
        <span className="card-suit">{suitSymbol}</span>
      </div>
    </div>
  );
};

function BlackjackPage({ user, setUser }) {
  const navigate = useNavigate();

  const [betAmount, setBetAmount] = useState(1);
  const [gameId, setGameId] = useState(null);
  const [playerHand, setPlayerHand] = useState([]);
  const [splitHand, setSplitHand] = useState(null);
  const [activeHand, setActiveHand] = useState("playerHand");
  const [dealerHand, setDealerHand] = useState([]);
  const [status, setStatus] = useState("idle"); // idle, active, split_active, finished, player_won, dealer_won, push, blackjack
  const [message, setMessage] = useState("Place your bet and deal!");
  const [loading, setLoading] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);

  const calculateHandValue = (hand) => {
    let value = 0;
    let aces = 0;
    for (const card of hand) {
      if (card.value === "hidden") continue;
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
  };

  const getStatusMessage = (newStatus, pValue, dValue, sValue) => {
    if (newStatus === "active") return "Hit, Stand, or Double?";
    if (newStatus === "split_active") return `Playing ${activeHand === 'playerHand' ? 'Hand 1' : 'Hand 2'}...`;
    if (newStatus === "finished") return "Game Over - Check hands for results.";
    if (newStatus === "blackjack") return "BLACKJACK! You win 3:2 payout!";
    if (newStatus === "player_won") return "You win!";
    if (newStatus === "dealer_won") {
      if (pValue > 21) return "Bust! You lose.";
      return "Dealer wins.";
    }
    if (newStatus === "push") return "Push! Bet returned.";
    return "";
  };

  const handleStatusEffects = (newStatus) => {
      if (newStatus === "player_won" || newStatus === "blackjack" || newStatus === "finished") {
          setShowExplosion(true);
          setTimeout(() => setShowExplosion(false), 2000);
      }
  };

  const deal = async () => {
    if (!user) {
      setMessage("Please log in first.");
      return;
    }

    if (betAmount < 1) {
      setMessage("Bet must be at least 1 credit.");
      return;
    }

    if (user.balance < betAmount) {
      setMessage("Not enough credits.");
      return;
    }

    setLoading(true);
    setMessage("Dealing...");
    
    // Visually deduct bet at the start
    setUser({ ...user, balance: user.balance - betAmount });
    setPlayerHand([]);
    setDealerHand([]);
    setSplitHand(null);
    setActiveHand("playerHand");

    try {
      const res = await fetch(`${API_URL}/api/game/blackjack/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id || user.id,
          betAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Could not start game.");
        setUser(user); // revert balance
        setLoading(false);
        return;
      }

      setGameId(data.gameId);
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setSplitHand(data.splitHand || null);
      setActiveHand(data.activeHand || "playerHand");
      setStatus(data.status);
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      const pValue = calculateHandValue(data.playerHand);
      const dValue = calculateHandValue(data.dealerHand);
      setMessage(getStatusMessage(data.status, pValue, dValue, 0));
      handleStatusEffects(data.status);
      
    } catch {
      setMessage("Could not connect to server.");
      setUser(user);
    }
    setLoading(false);
  };

  const hit = async () => {
    if (!gameId || (status !== "active" && status !== "split_active")) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/game/blackjack/hit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Error hitting.");
        setLoading(false);
        return;
      }

      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setSplitHand(data.splitHand || null);
      setActiveHand(data.activeHand || "playerHand");
      setStatus(data.status);
      
      const pValue = calculateHandValue(data.playerHand);
      const sValue = data.splitHand ? calculateHandValue(data.splitHand) : 0;
      const dValue = calculateHandValue(data.dealerHand);
      setMessage(getStatusMessage(data.status, pValue, dValue, sValue));
      
    } catch {
      setMessage("Could not connect to server.");
    }
    setLoading(false);
  };

  const stand = async () => {
    if (!gameId || (status !== "active" && status !== "split_active")) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/game/blackjack/stand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Error standing.");
        setLoading(false);
        return;
      }

      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setSplitHand(data.splitHand || null);
      setActiveHand(data.activeHand || "playerHand");
      setStatus(data.status);
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      
      const pValue = calculateHandValue(data.playerHand);
      const sValue = data.splitHand ? calculateHandValue(data.splitHand) : 0;
      const dValue = calculateHandValue(data.dealerHand);
      setMessage(getStatusMessage(data.status, pValue, dValue, sValue));
      handleStatusEffects(data.status);

    } catch {
      setMessage("Could not connect to server.");
    }
    setLoading(false);
  };

  const doubleDown = async () => {
      if (!gameId || status !== "active" || playerHand.length !== 2) return;
      setLoading(true);
      try {
          const res = await fetch(`${API_URL}/api/game/blackjack/double`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ gameId }),
          });

          const data = await res.json();
          if (!res.ok) {
              setMessage(data.message || "Error doubling down.");
              setLoading(false);
              return;
          }

          setPlayerHand(data.playerHand);
          setDealerHand(data.dealerHand);
          setStatus(data.status);
          if (data.user) {
              setUser(data.user);
              localStorage.setItem("user", JSON.stringify(data.user));
          }

          const pValue = calculateHandValue(data.playerHand);
          const dValue = calculateHandValue(data.dealerHand);
          setMessage(getStatusMessage(data.status, pValue, dValue, 0));
          handleStatusEffects(data.status);
      } catch {
          setMessage("Could not connect to server.");
      }
      setLoading(false);
  };

  const split = async () => {
      if (!gameId || status !== "active" || playerHand.length !== 2) return;
      setLoading(true);
      try {
          const res = await fetch(`${API_URL}/api/game/blackjack/split`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ gameId }),
          });

          const data = await res.json();
          if (!res.ok) {
              setMessage(data.message || "Error splitting.");
              setLoading(false);
              return;
          }

          setPlayerHand(data.playerHand);
          setDealerHand(data.dealerHand);
          setSplitHand(data.splitHand);
          setActiveHand(data.activeHand);
          setStatus(data.status);
          if (data.user) {
              setUser(data.user);
              localStorage.setItem("user", JSON.stringify(data.user));
          }

          const pValue = calculateHandValue(data.playerHand);
          const dValue = calculateHandValue(data.dealerHand);
          setMessage(getStatusMessage(data.status, pValue, dValue, 0));
      } catch {
          setMessage("Could not connect to server.");
      }
      setLoading(false);
  };

  const pValue = calculateHandValue(playerHand);
  const sValue = splitHand ? calculateHandValue(splitHand) : 0;
  const dValue = calculateHandValue(dealerHand);

  const canDouble = status === "active" && playerHand.length === 2 && user?.balance >= betAmount;
  
  const canSplit = status === "active" && playerHand.length === 2 && 
      (["J", "Q", "K", "10"].includes(playerHand[0]?.value) ? 10 : playerHand[0]?.value) === 
      (["J", "Q", "K", "10"].includes(playerHand[1]?.value) ? 10 : playerHand[1]?.value) && 
      user?.balance >= betAmount;

  return (
    <div className="casino-page blackjack-page">
      {showExplosion && <div className="win-explosion"></div>}
      <nav className="navbar">
        <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span className="logo-icon">♠</span>
          <div>
            <h2>CASINO</h2>
            <p>MERN</p>
          </div>
        </div>
        <button className="back-home-btn-nav" onClick={() => navigate("/")}>
          ← Back Home
        </button>
      </nav>

      <div className="blackjack-table">
        <div className="balance-badge">
          Balance: <span>{user?.balance ?? 0}</span> Credits
        </div>

        <div className="game-area">
          <div className="dealer-area">
            <h3 className="hand-label">Dealer {status !== "active" && status !== "idle" && dValue > 0 ? `(${dValue})` : ""}</h3>
            <div className="hand">
              {dealerHand.map((card, idx) => (
                <div key={idx} className="card-wrapper">
                  <Card card={card} />
                </div>
              ))}
            </div>
          </div>

          <div className="center-message">
            <h2>{message}</h2>
          </div>

          <div className="player-hands-container">
              <div className={`player-area ${splitHand && activeHand === "playerHand" ? "active-hand-indicator" : ""}`}>
                <h3 className="hand-label">Your Hand {pValue > 0 ? `(${pValue})` : ""}</h3>
                <div className="hand">
                  {playerHand.map((card, idx) => (
                    <div key={`p1-${idx}`} className="card-wrapper">
                      <Card card={card} />
                    </div>
                  ))}
                </div>
              </div>

              {splitHand && (
                  <div className={`player-area split-area ${activeHand === "splitHand" ? "active-hand-indicator" : ""}`}>
                    <h3 className="hand-label">Split Hand {sValue > 0 ? `(${sValue})` : ""}</h3>
                    <div className="hand">
                      {splitHand.map((card, idx) => (
                        <div key={`s2-${idx}`} className="card-wrapper">
                          <Card card={card} />
                        </div>
                      ))}
                    </div>
                  </div>
              )}
          </div>
        </div>

        <div className="controls-panel">
          <div className="bet-controls">
            <button 
              className="bet-adjust-btn"
              onClick={() => setBetAmount(Math.max(1, betAmount - 10))}
              disabled={status === "active" || loading}
            >-10</button>
            <button 
              className="bet-adjust-btn"
              onClick={() => setBetAmount(Math.max(1, betAmount - 1))}
              disabled={status === "active" || loading}
            >-</button>
            <div className="bet-display">Bet: {betAmount}</div>
            <button 
              className="bet-adjust-btn"
              onClick={() => setBetAmount(betAmount + 1)}
              disabled={status === "active" || loading}
            >+</button>
            <button 
              className="bet-adjust-btn"
              onClick={() => setBetAmount(betAmount + 10)}
              disabled={status === "active" || loading}
            >+10</button>
          </div>

          <div className="action-controls">
            {status === "active" || status === "split_active" ? (
              <>
                <button className="action-btn hit-btn" onClick={hit} disabled={loading}>
                  Hit
                </button>
                <button className="action-btn stand-btn" onClick={stand} disabled={loading}>
                  Stand
                </button>
                {status === "active" && canDouble && (
                    <button className="action-btn double-btn" onClick={doubleDown} disabled={loading}>
                      Double
                    </button>
                )}
                {status === "active" && canSplit && (
                    <button className="action-btn split-btn" onClick={split} disabled={loading}>
                      Split
                    </button>
                )}
              </>
            ) : (
              <button className="action-btn deal-btn" onClick={deal} disabled={loading}>
                Deal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlackjackPage;
