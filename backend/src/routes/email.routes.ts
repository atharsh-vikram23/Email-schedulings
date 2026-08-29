import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db";
import { emailQueue } from "../queues/email.queue";
import { z } from "zod";

const router = Router();

router.use(requireAuth);

const scheduleSchema = z.object({
  senderId: z.string(),
  subject: z.string().min(1),
  body: z.string().min(1),
  startTime: z.string().datetime(),
  delaySeconds: z.number().min(0),
  hourlyLimit: z.number().min(1),
  recipients: z.array(z.string().email()).min(1),
});

router.post("/schedule", async (req: any, res) => {
  try {
    const validated = scheduleSchema.parse(req.body);
    const { senderId, subject, body, startTime, delaySeconds, hourlyLimit, recipients } = validated;

    // Verify sender belongs to user
    const sender = await prisma.sender.findUnique({
      where: { id: senderId, userId: req.user.id },
    });
    if (!sender) {
      return res.status(404).json({ success: false, message: "Sender not found" });
    }

    const campaignId = await prisma.$transaction(async (tx) => {
      const campaign = await tx.emailCampaign.create({
        data: {
          userId: req.user.id,
          senderId,
          subject,
          body,
          startTime: new Date(startTime),
          delaySeconds,
          hourlyLimit,
        },
      });

      const startMs = new Date(startTime).getTime();
      
      const emailsToSchedule = recipients.map((recipient, index) => {
        const scheduledTimeMs = startMs + index * delaySeconds * 1000;
        return {
          campaignId: campaign.id,
          userId: req.user.id,
          senderId,
          recipient,
          subject,
          body,
          scheduledAt: new Date(scheduledTimeMs),
          idempotencyKey: `${campaign.id}-${recipient}-${index}`,
        };
      });

      await tx.scheduledEmail.createMany({
        data: emailsToSchedule,
      });

      return campaign.id;
    });

    // After DB commits successfully, add to BullMQ in bulk
    const scheduledEmails = await prisma.scheduledEmail.findMany({
      where: { campaignId },
    });

    const jobs = scheduledEmails.map((email) => {
      const delay = Math.max(0, email.scheduledAt.getTime() - Date.now());
      return {
        name: "send-email",
        data: { scheduledEmailId: email.id },
        opts: { delay, jobId: `schedule-${email.id}` },
      };
    });

    // Bulk add to Queue
    await emailQueue.addBulk(jobs);

    res.json({ success: true, campaignId, scheduledCount: recipients.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation error", issues: error.issues });
    }
    console.error("Schedule error:", error);
    res.status(500).json({ success: false, message: "Failed to schedule emails" });
  }
});

router.get("/scheduled", async (req: any, res) => {
  try {
    const emails = await prisma.scheduledEmail.findMany({
      where: { userId: req.user.id, status: { in: ["scheduled", "processing"] } },
      orderBy: { scheduledAt: "asc" },
      take: 50, // pagination simplified for demo
    });
    res.json({ success: true, emails });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch scheduled emails" });
  }
});

router.get("/sent", async (req: any, res) => {
  try {
    const emails = await prisma.scheduledEmail.findMany({
      where: { userId: req.user.id, status: { in: ["sent", "failed"] } },
      orderBy: { sentAt: "desc" },
      take: 50,
    });
    res.json({ success: true, emails });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch sent emails" });
  }
});

export default router;
