import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import passport from "passport";
import session from "express-session";

// Route imports
import authRoutes from "./routes/auth.routes";
import senderRoutes from "./routes/sender.routes";
import emailRoutes from "./routes/email.routes";
import slackRoutes from "./routes/slack.routes";
import searchRoutes from "./routes/search.routes";

// Integrations
import "./integrations/google/passport";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());

// Session for Passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    proxy: true, // Required for Render/Heroku secure cookies
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/senders", senderRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/slack", slackRoutes);
app.use("/api/search", searchRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: "connected",
    mode: "lightweight",
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    code: err.code || "INTERNAL_ERROR",
  });
});

export default app;
