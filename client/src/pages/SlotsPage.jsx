import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/SlotsPage.css";

const API_URL = "https://casinomern.onrender.com";

const symbols = ["🍒", "🍋", "🔔", "💎", "7️⃣", "🍀"];

function SlotsPage({ user, setUser }) {
  const navigate = useNavigate();

  const [betAmount, setBetAmount] = useState(1);
  const [reels, setReels] = useState(["🍒", "🍋", "🔔"]);
  const [message, setMessage] = useState("");
  const [spinning, setSpinning] = useState(false);

  const placeBet = async () => {
    const res = await fetch(`${API_URL}/api/game/bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user._id ||user.id,
        betAmount,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.message || "Could not place bet.");
      return false;
    }

    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    return true;
  };

  const saveGameResult = async (won, payout) => {
    const res = await fetch(`${API_URL}/api/game/result`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user._id || user.id,
        won,
        payout,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.message || "Could not save result.");
      return;
    }

    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
  };

  const spin = async () => {
    if (!user) {
      setMessage("Please log in first.");
      return;
    }

    if (betAmount < 1 || betAmount > 10) {
      setMessage("Bet must be between 1 and 10 credits.");
      return;
    }

    if (user.balance < betAmount) {
      setMessage("Not enough credits.");
      return;
    }

    setSpinning(true);
    setMessage("");

    const betPlaced = await placeBet();

    if (!betPlaced) {
      setSpinning(false);
      return;
    }

    setTimeout(async () => {
      const newReels = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ];

      setReels(newReels);

      let payout = 0;
      let won = false;

      if (newReels[0] === newReels[1] && newReels[1] === newReels[2]) {
        payout = betAmount * 8;
        won = true;
        setMessage(`JACKPOT! You won ${payout} credits!`);
      } else if (
        newReels[0] === newReels[1] ||
        newReels[1] === newReels[2] ||
        newReels[0] === newReels[2]
      ) {
        payout = betAmount * 2;
        won = true;
        setMessage(`Nice! You won ${payout} credits!`);
      } else {
        setMessage(`You lost ${betAmount} credit${betAmount > 1 ? "s" : ""}.`);
      }

      await saveGameResult(won, payout);
      setSpinning(false);
    }, 800);
  };

  return (
    <div className="slots-page">
      <button className="back-home-btn" onClick={() => navigate("/")}>
        ← Back Home
      </button>

      <div className="slots-card">
        <h1>Slots</h1>

        <p className="balance-text">
          Balance: <span>{user?.balance ?? 0}</span> credits
        </p>

        <div className="reels">
          {reels.map((symbol, index) => (
            <div key={index} className={spinning ? "reel spinning" : "reel"}>
              {symbol}
            </div>
          ))}
        </div>

        <div className="bet-controls">
          <button
            onClick={() => setBetAmount((prev) => Math.max(1, prev - 1))}
            disabled={spinning}
          >
            -
          </button>

          <div className="bet-display">Bet: {betAmount}</div>

          <button
            onClick={() => setBetAmount((prev) => Math.min(10, prev + 1))}
            disabled={spinning}
          >
            +
          </button>
        </div>

        <button className="max-bet-btn" onClick={() => setBetAmount(10)} disabled={spinning}>
          Max Bet 10
        </button>

        <button className="spin-btn" onClick={spin} disabled={spinning}>
          {spinning ? "Spinning..." : "Spin"}
        </button>

        {message && <p className="slot-message">{message}</p>}

        <div className="payout-box">
          <p>Three matching symbols = 8x bet</p>
          <p>Two matching symbols = 2x bet</p>
        </div>
      </div>
    </div>
  );
}

export default SlotsPage;