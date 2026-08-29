import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db";
import axios from "axios";

const router = Router();

router.use(requireAuth);

router.get("/connect", (req: any, res) => {
  const slackClientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;
  const scope = "chat:write,chat:write.public"; // Needed to post messages
  
  const state = req.user.id; // simple state passing for demo
  
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${slackClientId}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
  res.redirect(slackAuthUrl);
});

router.get("/callback", async (req: any, res) => {
  try {
    const { code, state: userId } = req.query;
    
    // In a real app we'd verify the state parameter securely, for this demo we just map it back to user
    const response = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || "",
        client_secret: process.env.SLACK_CLIENT_SECRET || "",
        code: code as string,
        redirect_uri: process.env.SLACK_REDIRECT_URI || "",
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = response.data;

    if (!data.ok) {
      console.error("Slack OAuth Error:", data.error);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?slackError=true`);
    }

    const { access_token, team, incoming_webhook } = data;

    // Use incoming webhook channel if exists, else try to use general chat:write
    await prisma.slackConnection.upsert({
      where: { userId: userId as string },
      update: {
        accessToken: access_token,
        teamId: team.id,
        teamName: team.name,
        channelId: incoming_webhook?.channel_id || "general",
        channelName: incoming_webhook?.channel || "general",
      },
      create: {
        userId: userId as string,
        accessToken: access_token,
        teamId: team.id,
        teamName: team.name,
        channelId: incoming_webhook?.channel_id || "general",
        channelName: incoming_webhook?.channel || "general",
      },
    });

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?slackSuccess=true`);
  } catch (error) {
    console.error("Slack callback failed", error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?slackError=true`);
  }
});

router.get("/status", async (req: any, res) => {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId: req.user.id },
    });
    res.json({ success: true, connected: !!connection, teamName: connection?.teamName });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch Slack status" });
  }
});

router.post("/disconnect", async (req: any, res) => {
  try {
    await prisma.slackConnection.delete({
      where: { userId: req.user.id },
    });
    res.json({ success: true });
  } catch (error) {
    // If it doesn't exist, ignore
    res.json({ success: true });
  }
});

export default router;
