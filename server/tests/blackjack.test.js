import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("POST /api/game/blackjack/start", () => {
  it("deals a new game with a player hand, dealer hand, and deck", async () => {
    const res = await request(app).post("/api/game/blackjack/start");

    expect(res.status).toBe(200);
    expect(res.body.playerHand).toHaveLength(2);
    expect(res.body.dealerHand).toHaveLength(2);
    expect(Array.isArray(res.body.deck)).toBe(true);
    expect(res.body.deck.length).toBeGreaterThan(0);
    expect(["active", "blackjack"]).toContain(res.body.status);

    // Dealer's second card should be hidden in the returned dealerHand
    expect(res.body.dealerHand[1].value).toBe("hidden");

    // But realDealerHand should contain the actual card
    expect(res.body.realDealerHand[1].value).not.toBe("hidden");
  });
});

describe("POST /api/game/blackjack/hit", () => {
  it("returns 400 when deck or playerHand is missing", async () => {
    const res = await request(app)
      .post("/api/game/blackjack/hit")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing deck or playerHand.");
  });

  it("returns 400 when the deck is empty", async () => {
    const res = await request(app)
      .post("/api/game/blackjack/hit")
      .send({ deck: [], playerHand: [{ suit: "hearts", value: "5" }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("The deck is empty.");
  });

  it("draws one card and adds it to the player's hand", async () => {
    // Start a real game first so we have a valid deck/hand to hit with
    const startRes = await request(app).post("/api/game/blackjack/start");
    const { deck, playerHand, dealerHand, realDealerHand } = startRes.body;

    const hitRes = await request(app)
      .post("/api/game/blackjack/hit")
      .send({ deck, playerHand, dealerHand, realDealerHand });

    expect(hitRes.status).toBe(200);
    expect(hitRes.body.playerHand.length).toBe(playerHand.length + 1);
    expect(hitRes.body.deck.length).toBe(deck.length - 1);
    expect(["active", "bust", "stand"]).toContain(hitRes.body.status);
  });
});

describe("POST /api/game/blackjack/stand", () => {
  it("returns 400 when game data is missing", async () => {
    const res = await request(app)
      .post("/api/game/blackjack/stand")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing game data.");
  });

  it("plays out the dealer's hand and returns a final result", async () => {
    const startRes = await request(app).post("/api/game/blackjack/start");
    const { deck, playerHand, realDealerHand } = startRes.body;

    const standRes = await request(app)
      .post("/api/game/blackjack/stand")
      .send({ deck, playerHand, dealerHand: realDealerHand });

    expect(standRes.status).toBe(200);
    expect(["dealer_bust", "player_won", "dealer_won", "push"]).toContain(
      standRes.body.status
    );
    expect(["win", "loss", "tie"]).toContain(standRes.body.result);
    expect(typeof standRes.body.playerTotal).toBe("number");
    expect(typeof standRes.body.dealerTotal).toBe("number");
  });
});
