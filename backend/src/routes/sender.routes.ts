import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db";
import nodemailer from "nodemailer";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: any, res) => {
  try {
    const senders = await prisma.sender.findMany({
      where: { userId: req.user.id },
      select: { id: true, email: true, displayName: true, createdAt: true }, // Don't expose passwords
    });
    
    res.json({ success: true, senders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch senders" });
  }
});

router.post("/", async (req: any, res) => {
  try {
    const { email, displayName } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Generate a fresh Ethereal test account for this sender
    const testAccount = await nodemailer.createTestAccount();

    const sender = await prisma.sender.create({
      data: {
        userId: req.user.id,
        email,
        displayName: displayName || email,
        etherealUser: testAccount.user,
        etherealPassword: testAccount.pass,
      },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });
    res.json({ success: true, sender });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create sender" });
  }
});

router.delete("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    await prisma.sender.delete({
      where: { id, userId: req.user.id },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete sender" });
  }
});

export default router;
