import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function GoogleAuthSuccess({ setUser }) {
  const navigate = useNavigate();

  useEffect(() => {
    const completeGoogleLogin = () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const token = params.get("token");
        const userId = params.get("userId");
        const username = params.get("username");
        const balanceParam = params.get("balance");

        if (!token || !userId) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          navigate("/", {
            replace: true,
          });

          return;
        }

        const balance = Number(balanceParam);

        const googleUser = {
          id: userId,
          _id: userId,
          username: username || "Google User",
          balance: Number.isFinite(balance) ? balance : 10,
        };

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(googleUser));

        if (setUser) {
          setUser(googleUser);
        }

        navigate("/", {
          replace: true,
        });
      } catch (error) {
        console.error("Google login error:", error);

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/", {
          replace: true,
        });
      }
    };

    completeGoogleLogin();
  }, [navigate, setUser]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        color: "white",
        fontSize: "1.2rem",
      }}
    >
      Signing you in...
    </div>
  );
}

export default GoogleAuthSuccess;