import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PlinkoPage.css";

const API_URL = "https://casinomern.onrender.com";

const multipliers = {
  high: [100, 25, 10, 5, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 5, 10, 25, 100],
  medium: [20, 10, 5, 3, 1.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1.5, 3, 5, 10, 20],
  low: [10, 5, 2, 1.5, 1.2, 1, 0.8, 0.5, 0.5, 0.5, 0.8, 1, 1.2, 1.5, 2, 5, 10],
};

function PlinkoPage({ user, setUser }) {
  const navigate = useNavigate();
  const [betAmount, setBetAmount] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const [message, setMessage] = useState("Drop a ball!");
  
  const canvasRef = useRef(null);
  const ballsRef = useRef([]);
  const animFrameRef = useRef(null);

  // Board setup
  const ROWS = 16;
  const boardWidth = 800;
  const boardHeight = 600;
  const rowSpacing = boardHeight / (ROWS + 2);
  const colSpacing = boardWidth / (ROWS + 4);
  
  const pegs = [];
  for (let r = 0; r <= ROWS; r++) {
    const numPegs = r + 3;
    const rowWidth = (numPegs - 1) * colSpacing;
    const startX = (boardWidth - rowWidth) / 2;
    const y = (r + 1) * rowSpacing;
    const rowPegs = [];
    for (let c = 0; c < numPegs; c++) {
      rowPegs.push({ x: startX + c * colSpacing, y });
    }
    pegs.push(rowPegs);
  }

  const shuffle = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex > 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Clear board
    ctx.clearRect(0, 0, boardWidth, boardHeight);
    
    // Draw pegs
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    for (let r = 0; r < ROWS; r++) {
      for (let peg of pegs[r]) {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw multipliers at bottom
    const currentMults = multipliers[difficulty];
    const lastRow = pegs[ROWS];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 12px Arial";
    
    for (let i = 0; i < currentMults.length; i++) {
      const peg1 = lastRow[i];
      const peg2 = lastRow[i+1];
      const cx = (peg1.x + peg2.x) / 2;
      const cy = peg1.y;
      
      const mult = currentMults[i];
      let color = "rgba(100, 100, 100, 0.8)";
      if (mult >= 10) color = "rgba(255, 50, 50, 0.9)";
      else if (mult >= 2) color = "rgba(255, 150, 50, 0.9)";
      else if (mult >= 1) color = "rgba(50, 255, 50, 0.9)";
      else color = "rgba(50, 100, 255, 0.9)";

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(cx - colSpacing/2 + 2, cy - 15, colSpacing - 4, 30, 5);
      ctx.fill();
      
      ctx.fillStyle = "#fff";
      ctx.fillText(`${mult}x`, cx, cy);
    }

    // Update and draw balls
    const activeBalls = [];
    const speed = 0.25;

    for (const ball of ballsRef.current) {
      ball.t += speed;
      
      const maxT = ball.points.length - 1;
      if (ball.t >= maxT) {
        if (!ball.finished) {
           ball.finished = true;
           if (ball.payout > 0) {
               // Show message or effect
           }
        }
        // Ball stays in bucket for a moment then disappears
        ball.stayTimer = (ball.stayTimer || 0) + 1;
        if (ball.stayTimer < 50) {
            activeBalls.push(ball);
            const p = ball.points[maxT];
            ctx.fillStyle = "gold";
            ctx.beginPath();
            ctx.arc(p.x, p.y + 10, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        continue;
      }
      
      activeBalls.push(ball);
      
      const idx = Math.floor(ball.t);
      const frac = ball.t - idx;
      const p1 = ball.points[idx];
      const p2 = ball.points[idx+1];
      
      const x = p1.x + (p2.x - p1.x) * frac;
      let y = p1.y + (p2.y - p1.y) * frac;
      
      // Arc between pegs (except the first drop which is straight)
      if (idx > 0 && idx < maxT - 1) {
          y -= Math.sin(frac * Math.PI) * 15;
      }
      
      ctx.fillStyle = "magenta";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 10;
      ctx.shadowColor = "magenta";
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    ballsRef.current = activeBalls;
    animFrameRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [difficulty]); // re-run if difficulty changes to redraw multipliers

  const drop = async () => {
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

    // Visually deduct instantly for rapid firing
    setUser(prev => ({ ...prev, balance: prev.balance - betAmount }));
    setMessage("Dropping...");

    try {
      const res = await fetch(`${API_URL}/api/game/plinko/drop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id || user.id, betAmount, difficulty })
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Could not drop.");
        setUser(prev => ({ ...prev, balance: prev.balance + betAmount })); // revert
        return;
      }

      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Generate physics path
      const bucketIndex = data.bucketIndex; // 0 to 16
      const path = [];
      for (let i = 0; i < bucketIndex; i++) path.push(1); // Right
      for (let i = 0; i < 16 - bucketIndex; i++) path.push(0); // Left
      shuffle(path);

      let pIndex = 1; // start at middle peg of row 0
      const points = [];
      points.push({ x: pegs[0][pIndex].x, y: 0 }); // drop from top
      points.push(pegs[0][pIndex]); // hit first peg
      
      for (let r = 0; r < 16; r++) {
        pIndex += path[r];
        points.push(pegs[r+1][pIndex]);
      }
      
      // Final bucket drop
      const finalPeg1 = pegs[16][bucketIndex];
      const finalPeg2 = pegs[16][bucketIndex+1];
      points.push({ x: (finalPeg1.x + finalPeg2.x)/2, y: finalPeg1.y });

      ballsRef.current.push({
         points,
         t: 0,
         payout: data.payout,
         finished: false
      });
      
    } catch {
      setMessage("Server connection error.");
      setUser(prev => ({ ...prev, balance: prev.balance + betAmount })); // revert
    }
  };

  return (
    <div className="casino-page plinko-page">
      <nav className="navbar">
        <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span className="logo-icon">♠</span>
          <div><h2>CASINO</h2><p>MERN</p></div>
        </div>
        <button className="back-home-btn-nav" onClick={() => navigate("/")}>← Back Home</button>
      </nav>

      <div className="plinko-game-area">
        <div className="balance-badge">
          Balance: <span>{user?.balance ?? 0}</span> Credits
        </div>

        <div className="plinko-header">
          <h2>PLINKO</h2>
          <p style={{ color: "#fff" }}>{message}</p>
        </div>

        <div className="plinko-canvas-container">
          <canvas ref={canvasRef} width={800} height={600}></canvas>
        </div>

        <div className="difficulty-selector">
          <button 
             className={`diff-btn low ${difficulty === 'low' ? 'active' : ''}`}
             onClick={() => setDifficulty('low')}
          >Low Risk</button>
          <button 
             className={`diff-btn medium ${difficulty === 'medium' ? 'active' : ''}`}
             onClick={() => setDifficulty('medium')}
          >Medium Risk</button>
          <button 
             className={`diff-btn high ${difficulty === 'high' ? 'active' : ''}`}
             onClick={() => setDifficulty('high')}
          >High Risk</button>
        </div>

        <div className="plinko-bet-controls">
           <button className="bet-adjust-btn" onClick={() => setBetAmount(betAmount <= 10 ? 1 : betAmount - 10)}>-10</button>
           <button className="bet-adjust-btn" onClick={() => setBetAmount(Math.max(1, betAmount - 1))}>-1</button>
           <div className="plinko-bet-display">Bet: {betAmount}</div>
           <button className="bet-adjust-btn" onClick={() => setBetAmount(Math.min(100, betAmount + 1))}>+1</button>
           <button className="bet-adjust-btn" onClick={() => setBetAmount(betAmount < 10 ? 10 : Math.min(100, betAmount + 10))}>+10</button>
        </div>

        <button className="drop-btn" onClick={drop}>DROP BALL</button>
      </div>
    </div>
  );
}

export default PlinkoPage;
