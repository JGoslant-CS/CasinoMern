import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL || "https://casinomern.onrender.com";

function VerifyEmailPage() {
  const { token } = useParams();

  const [status, setStatus] = useState(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token
      ? "Verifying your email..."
      : "No verification token was provided."
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/verify-email/${token}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Email verification failed.");
        }

        setStatus("success");
        setMessage(data.message || "Your email has been verified.");
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "The verification link is invalid or has expired."
        );
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <div>
        {status === "loading" && <h1>Verifying Email</h1>}
        {status === "success" && <h1>Email Verified!</h1>}
        {status === "error" && <h1>Verification Failed</h1>}

        <p>{message}</p>

        {status !== "loading" && (
          <Link to="/">
            <button type="button">Return to Home</button>
          </Link>
        )}
      </div>
    </main>
  );
}

export default VerifyEmailPage;