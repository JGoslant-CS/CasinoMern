import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "..//styles/RoulettePage.css";

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

function RoulettePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [betAmount, setBetAmount] = useState(1);
  const [betType, setBetType] = useState("red");
  const [selectedNumber, setSelectedNumber] = useState(0);
  const [message, setMessage] = useState(
    "Choose red, black, or one number."
  );

  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
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

  const updateStoredUser = (credits) => {
    const updatedUser = {
      ...user,
      credits,
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
      numericBet > 10
    ) {
      setMessage("Bet must be a whole number between 1 and 10.");
      return;
    }

    if (user.credits < numericBet) {
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
    setMessage("The wheel is spinning...");

    try {
      const response = await fetch(`${API_URL}/api/game/roulette`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user._id,
          betAmount: numericBet,
          betType,
          selectedNumber:
            betType === "number"
              ? Number(selectedNumber)
              : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Roulette request failed.");
      }

      const winningIndex = rouletteNumbers.indexOf(
        data.winningNumber
      );

      /*
        The pointer is at the top of the wheel.

        We rotate the winning pocket to the pointer while adding
        several complete spins.
      */
      const completeWheelSpins = 5 * 360;
      const targetWheelAngle =
        completeWheelSpins -
        winningIndex * numberAngle;

      const completeBallSpins = 8 * 360;
      const targetBallAngle =
        completeBallSpins +
        winningIndex * numberAngle;

      setWheelRotation((current) => current + targetWheelAngle);
      setBallRotation((current) => current + targetBallAngle);

      window.setTimeout(() => {
        setWinningNumber(data.winningNumber);
        updateStoredUser(data.credits);

        if (data.won) {
          setMessage(
            `Winner: ${data.winningNumber} ${data.winningColor}. You won ${data.payout} credits!`
          );
        } else {
          setMessage(
            `Winner: ${data.winningNumber} ${data.winningColor}. Better luck next time.`
          );
        }

        setIsSpinning(false);
      }, 5200);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Could not connect to the server.");
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
          <strong>{user?.credits ?? 0} credits</strong>
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
            <div className="roulette-pointer" />

            <div
              className="roulette-wheel"
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
              className="roulette-ball-orbit"
              style={{
                transform: `rotate(${ballRotation}deg)`,
              }}
            >
              <div className="roulette-ball" />
            </div>

            {winningNumber !== null && (
              <div className="roulette-winning-display">
                <span>Winning number</span>
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
              max="10"
              step="1"
              value={betAmount}
              disabled={isSpinning}
              onChange={(event) => {
                setBetAmount(Number(event.target.value));
              }}
            />

            <p className="roulette-limit">
              Minimum 1 credit · Maximum 10 credits
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
                message.includes("won")
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