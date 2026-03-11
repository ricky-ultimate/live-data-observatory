import { Router, Request, Response } from "express";
import { getUpcomingAsteroids, getHazardousAsteroids } from "./asteroid.service";

const router = Router();

router.get("/upcoming", async (req: Request, res: Response) => {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
  const events = await getUpcomingAsteroids(days);
  res.status(200).json({ success: true, count: events.length, data: events });
});

router.get("/hazardous", async (req: Request, res: Response) => {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
  const events = await getHazardousAsteroids(days);
  res.status(200).json({ success: true, count: events.length, data: events });
});

export default router;
