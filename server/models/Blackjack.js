import mongoose from "mongoose";

const blackjackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deck: {
      type: Array, // Array of strings like "H-10", "S-A"
      required: true,
    },
    playerHand: {
      type: Array,
      default: [],
    },
    dealerHand: {
      type: Array,
      default: [],
    },
    betAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "player_won", "dealer_won", "push", "blackjack"],
      default: "active",
    },
  },
  { timestamps: true }
);

const Blackjack = mongoose.model("Blackjack", blackjackSchema);
export default Blackjack;
