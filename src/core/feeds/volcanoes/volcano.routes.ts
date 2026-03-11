import { Router, Request, Response } from "express";
import {
  getElevatedVolcanoes,
  getMonitoredVolcanoes,
  getVolcanoHistory,
} from "./volcano.service";

const router = Router();

router.get("/elevated", async (_req: Request, res: Response) => {
  const events = await getElevatedVolcanoes();
  res.status(200).json({ success: true, count: events.length, data: events });
});

router.get("/monitored", async (_req: Request, res: Response) => {
  const events = await getMonitoredVolcanoes();
  res.status(200).json({ success: true, count: events.length, data: events });
});

router.get("/:vnum/history", async (req: Request, res: Response) => {
  const vnum = Array.isArray(req.params.vnum) ? req.params.vnum[0] : req.params.vnum;
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
  const events = await getVolcanoHistory(vnum, days);
  res.status(200).json({ success: true, count: events.length, data: events });
});

export default router;
