import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();

        if (!email) {
          return done(new Error("Google account did not provide an email."));
        }

        // Return the existing account if this email is already registered
        let user = await User.findOne({ email });

        if (user) {
          return done(null, user);
        }

        // Create a username from the Google display name
        const baseUsername = (
          profile.displayName ||
          email.split("@")[0] ||
          "google_player"
        )
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_]/g, "")
          .toLowerCase();

        let username = baseUsername || "google_player";
        let suffix = 1;

        // Make sure the username is unique
        while (await User.findOne({ username })) {
          username = `${baseUsername || "google_player"}${suffix}`;
          suffix += 1;
        }

        user = await User.create({
          username,
          email,
          passwordHash: "google_oauth",
          balance: 10,

          // Google has already verified ownership of the email.
          isVerified: true,
          verificationToken: null,
          verificationTokenExpires: null,
        });

        return done(null, user);
      } catch (error) {
        console.error("Google OAuth strategy error:", error);
        return done(error, null);
      }
    }
  )
);

export default passport;