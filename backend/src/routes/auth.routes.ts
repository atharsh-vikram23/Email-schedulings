import { Router } from "express";
import passport from "passport";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect to frontend dashboard
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  }
);

router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  res.json({ success: true, user: req.user });
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.json({ success: true });
  });
});

export default router;
