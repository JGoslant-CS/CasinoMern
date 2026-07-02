import { useState } from "react";
import "./App.css";
import rouletteImg from "./assets/roulette.png";
import blackjackImg from "./assets/blackjack.png";
import pokerImg from "./assets/poker.png";



function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  return (
    <div className="casino-page">
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">♠</span>
          <div>
            <h2>CASINO</h2>
            <p>MERN</p>
          </div>
        </div>

        <button className="login-btn" onClick={() => setShowLogin(true)}>
          ♙ Login
        </button>
      </nav>

      <section className="hero-section">
        <div className="hero-content">
          <h1>
            PLAY YOUR <span>FAVORITE GAMES</span>
          </h1>
          <p>Roulette, Blackjack, and Texas Hold'em. Real games. Real excitement.</p>
          <button className="play-btn">PLAY NOW ❯</button>
        </div>
      </section>

      <section className="games-section">
        <h2>♣ ♦ CHOOSE YOUR GAME ♥ ♠</h2>

        <div className="game-grid">
          <GameCard
            image={rouletteImg}
            icon="◎"
            title="ROULETTE"
             desc="Spin the wheel and test your luck. Will it be red, black, or green?"
             button="PLAY ROULETTE"
            />

           <GameCard
             image={blackjackImg}
             icon="🃏"
             title="BLACKJACK"
             desc="Beat the dealer by getting as close to 21 as you can."
             button="PLAY BLACKJACK"
           />

           <GameCard
             image={pokerImg}
             icon="♠"
             title="TEXAS HOLD'EM"
             desc="The ultimate poker experience. Bluff, bet, and win big."
             button="PLAY TEXAS HOLD'EM"
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
                onClick={() => setIsRegister(false)}
              >
                Login
              </button>
              <button
                className={isRegister ? "active" : ""}
                onClick={() => setIsRegister(true)}
              >
                Register
              </button>
            </div>

            <input type="email" placeholder="Email" />
            <input type="password" placeholder="Password" />

            {isRegister && <input type="password" placeholder="Confirm Password" />}

            <button className="modal-submit">
              {isRegister ? "Create Account" : "Login"}
            </button>

            <p className="switch-text">
              {isRegister ? "Already have an account?" : "Don't have an account?"}
              <span onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? " Login" : " Register"}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function GameCard({ image, icon, title, desc, button }) {
  return (
    <div className="game-card">

      <div className="card-image">
        <img src={image} alt={title} />
        <div className="card-overlay">
          <span>{icon}</span>
        </div>
      </div>

      <div className="card-content">
        <h3>{title}</h3>
        <p>{desc}</p>
        <button>{button} ❯</button>
      </div>

    </div>
  );
}

export default App;

