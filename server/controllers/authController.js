import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import sendVerificationEmail from "../utils/sendVerificationEmail.js";

const createVerificationToken = () => {
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const hashedVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  return {
    verificationToken,
    hashedVerificationToken,
  };
};

export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Please fill in all fields.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername },
      ],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username or email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { verificationToken, hashedVerificationToken } =
      createVerificationToken();

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      balance: 10,
      isVerified: false,
      verificationToken: hashedVerificationToken,
      verificationTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
    });

    try {
      await sendVerificationEmail({
        email: user.email,
        username: user.username,
        verificationToken,
      });
    } catch (emailError) {
      console.error(
        "Verification email error:",
        emailError.message
      );

      return res.status(500).json({
        message:
          "Your account was created, but the verification email could not be sent. Please request another verification email.",
      });
    }

    res.status(201).json({
      message:
        "Registration successful. Check your email for a verification link before logging in.",
      requiresVerification: true,
      email: user.email,
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      message: "Server error during registration.",
      error: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(400).json({
        message: "Invalid email or password.",
      });
    }

    /*
      New email/password accounts have isVerified set to false.

      Existing accounts created before email verification was added
      may not have the isVerified field. Those accounts will still
      be allowed to log in.
    */
    if (user.isVerified === false) {
      return res.status(403).json({
        message:
          "Please verify your email before logging in.",
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Server error during login.",
      error: error.message,
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        message: "Verification token is missing.",
      });
    }

    const hashedVerificationToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      verificationToken: hashedVerificationToken,
      verificationTokenExpires: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message:
          "This verification link is invalid or has expired.",
      });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    await user.save();

    res.json({
      message:
        "Your email has been verified. You can now log in.",
    });
  } catch (error) {
    console.error("Email verification error:", error.message);

    res.status(500).json({
      message: "Server error during email verification.",
      error: error.message,
    });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Please enter your email address.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "No account was found with that email.",
      });
    }

    if (user.isVerified === true) {
      return res.status(400).json({
        message: "This email address is already verified.",
      });
    }

    /*
      An old account with no isVerified field does not require
      verification, so do not create a verification token for it.
    */
    if (user.isVerified === undefined) {
      return res.status(400).json({
        message:
          "This existing account does not require email verification.",
      });
    }

    const { verificationToken, hashedVerificationToken } =
      createVerificationToken();

    user.verificationToken = hashedVerificationToken;
    user.verificationTokenExpires = new Date(
      Date.now() + 60 * 60 * 1000
    );

    await user.save();

    await sendVerificationEmail({
      email: user.email,
      username: user.username,
      verificationToken,
    });

    res.json({
      message:
        "A new verification email has been sent. Check your inbox.",
    });
  } catch (error) {
    console.error(
      "Resend verification error:",
      error.message
    );

    res.status(500).json({
      message:
        "Server error while resending the verification email.",
      error: error.message,
    });
  }
};