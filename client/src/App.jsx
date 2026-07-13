import { useEffect, useRef, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "./App.css";
import rouletteImg from "./assets/roulette.png";
import blackjackImg from "./assets/blackjack.png";
import pokerImg from "./assets/poker.png";
import slotImg from "./assets/slot.png";
import cautionImg from "./assets/caution.png";
import SlotsPage from "./pages/SlotsPage";
import RoulettePage from "./pages/RoulettePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import BlackjackPage from "./pages/BlackjackPage";

const API_URL = "https://casinomern.onrender.com";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const gamesRef = useRef(null);

  useEffect(() => {
    switch (location.pathname) {
      case "/":
        document.title = "Casino MERN - Play Slots, Roulette & More";
        break;
      case "/slots":
        document.title = "Casino MERN - Slot Machine";
        break;
      case "/roulette":
        document.title = "Casino MERN - European Roulette";
        break;
      case "/leaderboard":
        document.title = "Casino MERN - Leaderboard";
        break;
      case "/blackjack":
        document.title = "Casino MERN - Blackjack";
        break;
      default:
        document.title = "Casino MERN";
    }
  }, [location.pathname]);
  const [showLogin, setShowLogin] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const scrollToGames = () => {
    gamesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handlePlay = () => {
    if (!user) {
      setMessage("Please login or register before playing.");
      setIsRegister(false);
      setShowLogin(true);
      return;
    }

    alert("Game coming soon!");
  };

  const handleBlackjackPlay = () => {
    if (!user) {
      setMessage("Please login or register before playing.");
      setIsRegister(false);
      setShowLogin(true);
      return;
    }

    navigate("/blackjack");
  };

  const handleSlotsPlay = () => {
    if (!user) {
      setMessage("Please login or register before playing.");
      setIsRegister(false);
      setShowLogin(true);
      return;
    }

    navigate("/slots");
  };

  const handleRoulettePlay = () => {
    if (!user) {
        setMessage("Please login or register before playing.");
        setIsRegister(false);
        setShowLogin(true);
        return;
    }

    navigate("/roulette");
  }; 

  const handleSecretBonus = async () => {
    if (!user) {
      setMessage("Please login or register to claim the bonus.");
      setIsRegister(false);
      setShowLogin(true);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/game/bonus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user._id || user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Could not add bonus credits.");
        return;
      }

      const updatedUser = {
        ...user,
        balance: data.balance ?? data.credits,
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      alert(data.message || "Secret bonus found! +10 credits");
    } catch {
      alert("Could not connect to the server.");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAuth = async () => {
    setMessage("");

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";

    const body = isRegister
      ? {
          username: form.username,
          email: form.email,
          password: form.password,
        }
      : {
          email: form.email,
          password: form.password,
        };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || data.message || "Something went wrong.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setShowLogin(false);
      setMessage("");
      setForm({ username: "", email: "", password: "" });
    } catch {
      setMessage("Could not connect to server.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setShowLogout(false);
  };

  const HomePage = (
    <div className="casino-page">
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">♠</span>

          <div>
            <h2>CASINO</h2>
            <p>MERN</p>
          </div>

          <span
            className="logo-icon"
            onClick={handleSecretBonus}
            title="Feeling lucky?"
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleSecretBonus();
              }
            }}
          >
            ♠
          </span>
        </div>

        <div className="nav-actions" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button className="leaderboard-btn" onClick={() => navigate("/leaderboard")}>
            🏆 Leaderboard
          </button>

          {user ? (
            <button className="login-btn" onClick={() => setShowLogout(true)}>
              {user.username} • {user.balance} Credits
            </button>
          ) : (
            <button className="login-btn" onClick={() => setShowLogin(true)}>
              Login
            </button>
          )}
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-content">
          <h1>
            PLAY YOUR <span>FAVORITE GAMES</span>
          </h1>
          <p>
            Roulette, Blackjack, and Texas Hold&apos;em. Real games. Real
            excitement.
          </p>
          <button className="play-btn" onClick={scrollToGames}>
            PLAY NOW ❯
          </button>
        </div>
      </section>

      <section className="games-section" ref={gamesRef}>
        <h2>CHOOSE YOUR GAME</h2>

        <div className="game-grid">
          <GameCard
            image={rouletteImg}
            icon="◎"
            title="ROULETTE"
            desc="Spin the wheel and test your luck."
            button="PLAY ROULETTE"
            onPlay={handleRoulettePlay}
          />

          <GameCard
            image={blackjackImg}
            icon="🃏"
            title="BLACKJACK"
            desc="Beat the dealer by getting as close to 21 as you can."
            button="PLAY BLACKJACK"
            onPlay={handleBlackjackPlay}
          />

          <GameCard
            image={pokerImg}
            icon="♠"
            title="TEXAS HOLD&apos;EM"
            desc="Bluff, bet, and win big."
            button="PLAY TEXAS HOLD&apos;EM"
            onPlay={handlePlay}
          />

          <GameCard
            image={slotImg}
            icon="🎰"
            title="SLOT MACHINE"
            desc="Spin the reels and chase the jackpot."
            button="PLAY SLOTS"
            onPlay={handleSlotsPlay}
          />

          <GameCard
            image={cautionImg}
            icon="🚧"
            title="COMING SOON..."
            desc="More casino games are being added soon."
            button="COMING SOON"
            onPlay={handlePlay}
            comingSoon={true}
          />
        </div>
      </section>

      <footer>© 2026 Casino MERN. All rights reserved.</footer>

      {showLogin && (
        <div className="modal-overlay">
          <div className="login-modal">
            <button className="close-btn" onClick={() => setShowLogin(false)}>
              ×
            </button>

            <div className="tabs">
              <button
                className={!isRegister ? "active" : ""}
                onClick={() => {
                  setIsRegister(false);
                  setMessage("");
                }}
              >
                Login
              </button>

              <button
                className={isRegister ? "active" : ""}
                onClick={() => {
                  setIsRegister(true);
                  setMessage("");
                }}
              >
                Register
              </button>
            </div>

            {isRegister && (
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                type="text"
                placeholder="Username"
              />
            )}

            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              placeholder="Email"
            />

            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              type="password"
              placeholder="Password"
            />

            {message && <p className="auth-message">{message}</p>}

            <button className="modal-submit" onClick={handleAuth}>
              {isRegister ? "Create Account" : "Login"}
            </button>
          </div>
        </div>
      )}

      {showLogout && (
        <div className="modal-overlay">
          <div className="login-modal">
            <button className="close-btn" onClick={() => setShowLogout(false)}>
              ×
            </button>
            <h2>Logout?</h2>
            <p className="switch-text">Do you want to log out of your account?</p>
            <button className="modal-submit" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={HomePage} />
      <Route path="/slots" element={<SlotsPage user={user} setUser={setUser} />} />
      <Route path="/roulette" element={<RoulettePage user={user} setUser={setUser} />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/blackjack" element={<BlackjackPage user={user} setUser={setUser} />} />
    </Routes>
  );
}

function GameCard({ image, icon, title, desc, button, onPlay, comingSoon }) {
  return (
    <div className={comingSoon ? "game-card coming-soon-card" : "game-card"}>
      <div className="card-image">
        <img src={image} alt={title} />
        <div className="card-overlay">
          <span>{icon}</span>
        </div>
      </div>

      <div className="card-content">
        <h3>{title}</h3>
        <p>{desc}</p>
        <button onClick={onPlay}>{button} ❯</button>
      </div>
    </div>
  );
}

export default App;