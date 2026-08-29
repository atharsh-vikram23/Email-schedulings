import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "../../db";
import nodemailer from "nodemailer";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "dummy-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value || "";
        let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

        if (!user) {
          user = await prisma.user.create({
            data: {
              googleId: profile.id,
              email: email,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0].value,
            },
          });
          
          // Generate a fake testing account so they don't spam real people
          const testAccount = await nodemailer.createTestAccount();
          
          await prisma.sender.create({
            data: {
              userId: user.id,
              email: email,
              displayName: profile.displayName,
              etherealUser: testAccount.user,
              etherealPassword: testAccount.pass,
            }
          });
        }
        return done(null, user);
      } catch (err: any) {
        return done(err, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
