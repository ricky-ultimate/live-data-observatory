import { Router, Request, Response } from "express";
import {
  getRecentSolarWind,
  getRecentKpIndex,
  getActiveAlerts,
} from "./space-weather.service";

const router = Router();

router.get("/solar-wind", async (req: Request, res: Response) => {
  const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : 1;
  const events = await getRecentSolarWind(hours);
  res.status(200).json({ success: true, count: events.length, data: events });
});

router.get("/kp", async (req: Request, res: Response) => {
  const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : 24;
  const events = await getRecentKpIndex(hours);
  res.status(200).json({ success: true, count: events.length, data: events });
});

router.get("/alerts", async (_req: Request, res: Response) => {
  const events = await getActiveAlerts();
  res.status(200).json({ success: true, count: events.length, data: events });
});

export default router;
