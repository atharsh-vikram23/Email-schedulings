import { Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import prisma from "../db";
import { getTransporter } from "../integrations/email/nodemailer";
import { checkRateLimit, hasSentSlackNotification } from "../utils/rate-limiter";
import { sendRateLimitNotification } from "../integrations/slack/notifier";
import { emailQueue } from "../queues/email.queue";
import { format } from "date-fns";
import nodemailer from "nodemailer";

export const startWorker = () => {
  const worker = new Worker(
    "email-queue",
    async (job: Job) => {
      const { scheduledEmailId } = job.data;
      
      const email = await prisma.scheduledEmail.findUnique({
        where: { id: scheduledEmailId },
        include: { sender: true, campaign: true, user: true },
      });

      if (!email || email.status !== "scheduled") {
        return;
      }

      const senderId = email.senderId;
      const hourlyLimit = Math.min(
        email.campaign.hourlyLimit,
        Number(process.env.MAX_EMAILS_PER_HOUR) || 200
      );

      const now = new Date();
      const hourWindow = format(now, "yyyy-MM-dd-HH");

      const minDelayMs = Number(process.env.MIN_EMAIL_DELAY_MS) || 2000;
      const lastSendTimeRaw = await redis.get(`last-send:${senderId}`);
      const lastSendTime = lastSendTimeRaw ? parseInt(lastSendTimeRaw, 10) : 0;
      const timeSinceLastSend = Date.now() - lastSendTime;
      
      if (timeSinceLastSend < minDelayMs) {
        const requiredDelay = minDelayMs - timeSinceLastSend;
        await emailQueue.add("send-email", { scheduledEmailId: email.id }, { delay: requiredDelay });
        return;
      }

      const limitCheck = await checkRateLimit(senderId, hourWindow, hourlyLimit);
      
      if (!limitCheck.allowed) {
        console.log(`Rate limit reached for sender ${senderId}. Rescheduling email ${email.id}.`);
        
        const notified = await hasSentSlackNotification(senderId, hourWindow);
        if (!notified) {
          await sendRateLimitNotification(email.userId, email.sender.email, hourlyLimit, hourWindow);
        }

        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1);
        nextHour.setMinutes(0);
        nextHour.setSeconds(email.campaign.delaySeconds * limitCheck.currentCount);
        
        const delay = Math.max(0, nextHour.getTime() - Date.now());
        
        await emailQueue.add("send-email", { scheduledEmailId: email.id }, { delay });
        return;
      }
      
      const updated = await prisma.scheduledEmail.updateMany({
        where: { id: email.id, status: "scheduled" },
        data: { status: "processing", attempts: { increment: 1 } },
      });

      if (updated.count === 0) return;
      
      await redis.set(`last-send:${senderId}`, Date.now().toString());

      try {
        const transporter = getTransporter(email.sender.etherealUser!, email.sender.etherealPassword!);
        
        const info = await transporter.sendMail({
          from: `"${email.sender.displayName}" <${email.sender.email}>`,
          to: email.recipient,
          subject: email.subject,
          text: email.body,
        });

        console.log(`Email sent: ${info.messageId}`);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`Ethereal Preview URL: ${previewUrl}`);
        }

        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: "sent", sentAt: new Date() },
        });

      } catch (error: any) {
        console.error(`Failed to send email ${email.id}:`, error);
        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: "failed", failedAt: new Date(), errorMessage: error.message },
        });
      }
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on("ready", () => {
    console.log("🟢 BullMQ Email Worker is running and connected to Redis");
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
  });
};
