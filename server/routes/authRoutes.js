import express from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
} from "../controllers/authController.js";
import "../config/passport.js";
import User from "../models/User.js";

const router = express.Router();

// Register a new user
router.post("/register", registerUser);

// Login an existing user
router.post("/login", loginUser);

// Verify a user's email
router.get("/verify-email/:token", verifyEmail);

// Resend email verification link
router.post("/resend-verification", resendVerificationEmail);

// Start Google OAuth login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL}/`,
    session: false,
  }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(
          `${process.env.CLIENT_URL}/?error=google-auth-failed`
        );
      }

      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const redirectUrl =
        `${process.env.CLIENT_URL}/auth/google/success` +
        `?token=${encodeURIComponent(token)}` +
        `&userId=${encodeURIComponent(req.user._id.toString())}` +
        `&username=${encodeURIComponent(req.user.username)}` +
        `&balance=${encodeURIComponent(req.user.balance)}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth callback error:", error);

      return res.redirect(
        `${process.env.CLIENT_URL}/?error=google-auth-failed`
      );
    }
  }
);

// Get user information
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;