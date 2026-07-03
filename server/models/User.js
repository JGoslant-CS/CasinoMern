import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    balance: {
      type: Number,
      default: 10,
      min: 0,
    },

    totalWins: {
      type: Number,
      default: 0,
    },

    totalLosses: {
      type: Number,
      default: 0,
    },

    totalGames: {
      type: Number,
      default: 0,
    },

    totalBalanceWon: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;