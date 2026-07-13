import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/RoulettePage.css";

const API_URL = "https://casinomern.onrender.com";

const rouletteNumbers = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34,
  6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26,
];

const redNumbers = new Set([
  1, 3, 5, 7, 9,
  12, 14, 16, 18,
  19, 21, 23, 25, 27,
  30, 32, 34, 36,
]);

function getNumberColor(number) {
  if (number === 0) {
    return "green";
  }

  return redNumbers.has(number) ? "red" : "black";
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function RoulettePage({ user, setUser }) {
  const navigate = useNavigate();

  const [betAmount, setBetAmount] = useState(1);
  const [betType, setBetType] = useState("red");
  const [selectedNumber, setSelectedNumber] = useState(0);

  const [message, setMessage] = useState(
    "Choose red, black, or one number."
  );

  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const [ballDropping, setBallDropping] = useState(false);
  const [winningNumber, setWinningNumber] = useState(null);

  const numberAngle = 360 / rouletteNumbers.length;

  const pockets = useMemo(() => {
    return rouletteNumbers.map((number, index) => ({
      number,
      index,
      color: getNumberColor(number),
      rotation: index * numberAngle,
    }));
  }, [numberAngle]);

  const updateStoredUser = (balance) => {
    const updatedUser = {
      ...user,
      balance,
    };

    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const handleSpin = async () => {
    if (!user) {
      setMessage("You must be logged in to play.");
      return;
    }

    const numericBet = Number(betAmount);

    if (
      !Number.isInteger(numericBet) ||
      numericBet < 1 ||
      numericBet > 100
    ) {
      setMessage("Bet must be a whole number between 1 and 100.");
      return;
    }

    if (user.balance < numericBet) {
      setMessage("You do not have enough credits.");
      return;
    }

    if (
      betType === "number" &&
      (
        !Number.isInteger(Number(selectedNumber)) ||
        Number(selectedNumber) < 0 ||
        Number(selectedNumber) > 36
      )
    ) {
      setMessage("Choose a number between 0 and 36.");
      return;
    }

    setIsSpinning(true);
    setWinningNumber(null);
    setBallDropping(false);
    setMessage("The wheel is spinning...");

    try {
      const response = await fetch(`${API_URL}/api/game/roulette`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user._id || user.id,
          betAmount: numericBet,
          betType,
          selectedNumber:
            betType === "number"
              ? Number(selectedNumber)
              : null,
        }),
      });

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `The server returned an invalid response. Status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Roulette request failed.");
      }

      const winningIndex = rouletteNumbers.indexOf(
        data.winningNumber
      );

      if (winningIndex === -1) {
        throw new Error("The server returned an invalid winning number.");
      }

      /*
        The wheel spins clockwise for appearance.

        The ball spins counterclockwise and finishes at the exact
        screen position of the server-selected winning pocket.

        The ball—not the pointer—now shows the winning number.
      */
      const nextWheelRotation =
        wheelRotation + (5 * 360) + 137;

      const winningPocketAngle =
        nextWheelRotation + winningIndex * numberAngle;

      const currentBallAngle = normalizeAngle(ballRotation);
      const targetBallAngle = normalizeAngle(winningPocketAngle);

      const counterClockwiseAdjustment =
        -normalizeAngle(currentBallAngle - targetBallAngle);

      const nextBallRotation =
        ballRotation -
        (7 * 360) +
        counterClockwiseAdjustment;

      setWheelRotation(nextWheelRotation);
      setBallRotation(nextBallRotation);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setBallDropping(true);
        });
      });

      window.setTimeout(() => {
        setWinningNumber(data.winningNumber);
        updateStoredUser(data.balance);

        if (data.won) {
          setMessage(
            `The ball landed on ${data.winningNumber} ${data.winningColor}. You won ${data.payout} credits!`
          );
        } else {
          setMessage(
            `The ball landed on ${data.winningNumber} ${data.winningColor}. Better luck next time.`
          );
        }

        setIsSpinning(false);
      }, 5400);
    } catch (error) {
      console.error("Roulette error:", error);

      setMessage(
        error.message || "Could not connect to the server."
      );

      setBallDropping(false);
      setIsSpinning(false);
    }
  };

  return (
    <main className="roulette-page">
      <header className="roulette-header">
        <button
          className="roulette-back-button"
          type="button"
          onClick={() => navigate("/")}
        >
          ← Back to Casino
        </button>

        <div className="roulette-user-info">
          <span>{user?.username || "Guest"}</span>
          <strong>{user?.balance ?? 0} credits</strong>
        </div>
      </header>

      <section className="roulette-content">
        <div className="roulette-title-area">
          <p className="roulette-eyebrow">Casino MERN</p>
          <h1>European Roulette</h1>
          <p>
            Bet on red, black, or one exact number from 0 to 36.
          </p>
        </div>

        <div className="roulette-game-layout">
          <section className="roulette-wheel-section">
            <div
              className={`roulette-wheel ${
                isSpinning ? "wheel-spinning" : ""
              }`}
              style={{
                transform: `rotate(${wheelRotation}deg)`,
              }}
            >
              <div className="roulette-pocket-ring">
                {pockets.map((pocket) => (
                  <div
                    className={`roulette-pocket roulette-pocket-${pocket.color}`}
                    key={pocket.number}
                    style={{
                      transform: `rotate(${pocket.rotation}deg)`,
                    }}
                  >
                    <span
                      style={{
                        transform: `rotate(${-pocket.rotation}deg)`,
                      }}
                    >
                      {pocket.number}
                    </span>
                  </div>
                ))}
              </div>

              <div className="roulette-inner-ring" />

              <div className="roulette-center">
                <span>CASINO</span>
                <strong>MERN</strong>
              </div>
            </div>

            <div
              className={`roulette-ball-orbit ${
                ballDropping ? "ball-dropping" : ""
              }`}
              style={{
                transform: `rotate(${ballRotation}deg)`,
              }}
            >
              <div
                className={`roulette-ball ${
                  isSpinning ? "ball-bouncing" : ""
                }`}
              />
            </div>

            {winningNumber !== null && (
              <div className="roulette-winning-display">
                <span>The ball landed on</span>

                <strong
                  className={`winning-${getNumberColor(
                    winningNumber
                  )}`}
                >
                  {winningNumber}
                </strong>
              </div>
            )}
          </section>

          <section className="roulette-controls">
            <h2>Place Your Bet</h2>

            <label className="roulette-label" htmlFor="bet-amount">
              Bet amount
            </label>

            <input
              id="bet-amount"
              className="roulette-bet-input"
              type="number"
              min="1"
              max="100"
              step="1"
              value={betAmount}
              disabled={isSpinning}
              onChange={(event) => {
                setBetAmount(Number(event.target.value));
              }}
            />

            <p className="roulette-limit">
              Minimum 1 credit · Maximum 100 credits
            </p>

            <div className="roulette-bet-types">
              <button
                type="button"
                className={`roulette-choice roulette-red-choice ${
                  betType === "red" ? "selected" : ""
                }`}
                disabled={isSpinning}
                onClick={() => setBetType("red")}
              >
                Red
                <span>Pays 1:1</span>
              </button>

              <button
                type="button"
                className={`roulette-choice roulette-black-choice ${
                  betType === "black" ? "selected" : ""
                }`}
                disabled={isSpinning}
                onClick={() => setBetType("black")}
              >
                Black
                <span>Pays 1:1</span>
              </button>

              <button
                type="button"
                className={`roulette-choice roulette-number-choice ${
                  betType === "number" ? "selected" : ""
                }`}
                disabled={isSpinning}
                onClick={() => setBetType("number")}
              >
                Exact Number
                <span>Pays 35:1</span>
              </button>
            </div>

            {betType === "number" && (
              <div className="roulette-number-grid">
                {Array.from({ length: 37 }, (_, number) => (
                  <button
                    key={number}
                    type="button"
                    disabled={isSpinning}
                    className={`number-button number-${getNumberColor(
                      number
                    )} ${
                      Number(selectedNumber) === number
                        ? "selected-number"
                        : ""
                    }`}
                    onClick={() => setSelectedNumber(number)}
                  >
                    {number}
                  </button>
                ))}
              </div>
            )}

            <div className="roulette-current-bet">
              <span>Current bet</span>

              <strong>
                {betAmount} credit{betAmount === 1 ? "" : "s"} on{" "}
                {betType === "number"
                  ? `number ${selectedNumber}`
                  : betType}
              </strong>
            </div>

            <button
              type="button"
              className="roulette-spin-button"
              disabled={isSpinning || !user}
              onClick={handleSpin}
            >
              {isSpinning ? "Spinning..." : "Spin the Wheel"}
            </button>

            <p
              className={`roulette-message ${
                message.includes("You won")
                  ? "success-message"
                  : ""
              }`}
            >
              {message}
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

export default RoulettePage;
