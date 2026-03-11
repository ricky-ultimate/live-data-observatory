import { Router, Request, Response } from "express";
import { getRecentConflictArticles } from "./conflict.service";

const router = Router();

router.get("/articles", async (req: Request, res: Response) => {
  const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : 24;
  const events = await getRecentConflictArticles(hours);
  res.status(200).json({ success: true, count: events.length, data: events });
});

export default router;
