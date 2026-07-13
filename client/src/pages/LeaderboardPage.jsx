import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import "../styles/LeaderboardPage.css";

const API_URL = "https://casinomern.onrender.com";

function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_URL}/api/leaderboard`);
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.message || "Failed to fetch leaderboard");
        } else {
          setLeaderboard(data);
        }
      } catch (err) {
        setError("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="casino-page leaderboard-page">
      <nav className="navbar leaderboard-nav">
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

      <div className="leaderboard-container">
        <h1 className="leaderboard-title">HALL OF <span>FAME</span></h1>
        <p className="leaderboard-subtitle">Top players by total balance</p>

        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="leaderboard-content">
            <div className="top-three-grid">
              {leaderboard.slice(0, 3).map((player, index) => (
                <div key={player._id} className={`top-player-card rank-${index + 1}`}>
                  <div className="rank-badge">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                  </div>
                  <h3 className="player-name">{player.username}</h3>
                  <div className="player-stats">
                    <p className="balance-stat">{player.balance.toLocaleString()} Credits</p>
                    <p className="winrate-stat">
                      {player.totalGames > 0
                        ? Math.round((player.totalWins / player.totalGames) * 100)
                        : 0}% Win Rate
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rest-leaderboard">
              {leaderboard.slice(3).map((player, index) => (
                <div key={player._id} className="leaderboard-row">
                  <div className="row-rank">#{index + 4}</div>
                  <div className="row-name">{player.username}</div>
                  <div className="row-balance">{player.balance.toLocaleString()} Credits</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeaderboardPage;
