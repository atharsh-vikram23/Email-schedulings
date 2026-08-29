import axios from "axios";
import prisma from "../../db";

export const sendRateLimitNotification = async (userId: string, senderEmail: string, limit: number, window: string) => {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      console.log(`User ${userId} has no Slack connected. Skipping notification.`);
      return;
    }

    const message = `⚠️ *Email rate limit reached*\n*Sender:* ${senderEmail}\n*Limit:* ${limit} emails/hour\n*Current window:* ${window}\nAdditional emails have been rescheduled to the next available window.`;

    await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: connection.channelId,
        text: message,
      },
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      }
    );
    console.log(`Slack notification sent to user ${userId} for sender ${senderEmail}`);
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
  }
};
