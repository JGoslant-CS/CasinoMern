import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import app from "../app.js";
import User from "../models/User.js";

dotenv.config();

const TEST_EMAIL = "vitest-test-user@casinomern.test";
const TEST_USERNAME = "vitest_test_user";
const TEST_PASSWORD = "correct-password-123";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  await User.create({
    username: TEST_USERNAME,
    email: TEST_EMAIL,
    passwordHash,
    balance: 10,
  });
});

afterAll(async () => {
  await User.deleteOne({ email: TEST_EMAIL });
  await mongoose.disconnect();
});

describe("GET /", () => {
  it("returns the running message", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Casino MERN server is running");
  });
});

describe("POST /api/auth/login", () => {
  it("returns 400 when email and password are missing", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Please enter email and password.");
  });

  it("returns 400 for a nonexistent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "does-not-exist@casinomern.test", password: "whatever" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("returns 400 for an existing email with the wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: "wrong-password" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("returns 200 and a token for correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(TEST_EMAIL);
  });
});
