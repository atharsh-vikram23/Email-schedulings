import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: any, res) => {
  try {
    const { q = "" } = req.query;
    
    if (!q) {
      return res.json({ success: true, emails: [] });
    }

    const emails = await prisma.scheduledEmail.findMany({
      where: {
        userId: req.user.id,
        OR: [
          { subject: { contains: String(q) } },
          { body: { contains: String(q) } },
          { recipient: { contains: String(q) } }
        ]
      },
      take: 20
    });

    res.json({ success: true, emails });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ success: false, message: "Search failed" });
  }
});

export default router;
