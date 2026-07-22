import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function GoogleAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userId = params.get("userId");

    if (token && userId) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({ 
        id: userId, 
        _id: userId,
        username: "Google User",
        balance: 10 
      }));
      navigate("/");
    } else {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh",
      color: "white",
      fontSize: "1.2rem"
    }}>
      Signing you in...
    </div>
  );
}

export default GoogleAuthSuccess;