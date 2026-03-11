import { Prisma } from "../../../generated/prisma/client";
import db from "../../../config/db.config";
import { createHttpClient } from "../../../utils/http.utils";
import logger from "../../../utils/logger.utils";
import { broadcast } from "../../../websocket/ws.server";
import {
  NOAASolarWindResponse,
  NOAAKpIndexResponse,
  NOAAAlertResponse,
  NormalizedSolarWind,
  NormalizedKpIndex,
  NormalizedSpaceWeatherAlert,
} from "./space-weather.types";

const NOAA_BASE_URL = "https://services.swpc.noaa.gov";
const SOURCE = "space_weather";

const CATEGORY = {
  SOLAR_WIND: "solar_wind",
  KP_INDEX: "kp_index",
  ALERT: "alert",
} as const;

const httpClient = createHttpClient(NOAA_BASE_URL);

const safeFloat = (val: string): number | null => {
  const n = parseFloat(val);
  if (isNaN(n) || n <= -9990) return null;
  return n;
};

const getSeenIds = async (category: string, windowMs: number): Promise<Set<string>> => {
  const since = new Date(Date.now() - windowMs);

  const existing = await db.feedEvent.findMany({
    where: {
      source: SOURCE,
      category,
      recordedAt: { gte: since },
    },
    select: { payload: true },
  });

  return new Set(
    existing
      .map((e) => {
        const p = e.payload as Record<string, unknown>;
        return typeof p["externalId"] === "string" ? p["externalId"] : null;
      })
      .filter((id): id is string => id !== null)
  );
};

const persistAndBroadcast = async (
  category: string,
  events: (NormalizedSolarWind | NormalizedKpIndex | NormalizedSpaceWeatherAlert)[]
): Promise<void> => {
  if (!events.length) return;

  await db.feedEvent.createMany({
    data: events.map((event) => ({
      source: SOURCE,
      category,
      payload: event as unknown as Prisma.InputJsonValue,
      recordedAt: event.recordedAt,
    })),
  });

  logger("INFO", `[${SOURCE}/${category}] Persisted ${events.length} new events`);

  events.forEach((event) => broadcast(`${SOURCE}/${category}`, event));
};

export const fetchAndPersistSolarWind = async (): Promise<void> => {
  const response = await httpClient.get<NOAASolarWindResponse>(
    "/products/solar-wind/plasma-1-day.json"
  );

  const rows = response.data.slice(1);
  const windowMs = 15 * 60 * 1000;
  const cutoff = new Date(Date.now() - windowMs);

  const recent = rows.filter((row) => new Date(row[0] + "Z") >= cutoff);

  if (!recent.length) {
    logger("INFO", "[space_weather/solar_wind] No recent rows in feed window");
    return;
  }

  const seenIds = await getSeenIds(CATEGORY.SOLAR_WIND, windowMs);

  const normalized: NormalizedSolarWind[] = recent
    .map((row): NormalizedSolarWind => ({
      externalId: `solar_wind_${row[0]}`,
      timeTag: row[0],
      density: safeFloat(row[1]),
      speed: safeFloat(row[2]),
      temperature: safeFloat(row[3]),
      recordedAt: new Date(row[0] + "Z"),
    }))
    .filter((e) => !seenIds.has(e.externalId));

  await persistAndBroadcast(CATEGORY.SOLAR_WIND, normalized);
};

export const fetchAndPersistKpIndex = async (): Promise<void> => {
  const response = await httpClient.get<NOAAKpIndexResponse>(
    "/products/noaa-planetary-k-index.json"
  );

  const rows = response.data.slice(1);
  const windowMs = 4 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - windowMs);

  const recent = rows.filter((row) => new Date(row[0] + "Z") >= cutoff);

  if (!recent.length) {
    logger("INFO", "[space_weather/kp_index] No recent rows in feed window");
    return;
  }

  const seenIds = await getSeenIds(CATEGORY.KP_INDEX, windowMs);

  const normalized: NormalizedKpIndex[] = recent
    .map((row): NormalizedKpIndex => ({
      externalId: `kp_${row[0]}`,
      timeTag: row[0],
      kp: safeFloat(row[1]),
      kpFraction: safeFloat(row[2]),
      recordedAt: new Date(row[0] + "Z"),
    }))
    .filter((e) => !seenIds.has(e.externalId));

  await persistAndBroadcast(CATEGORY.KP_INDEX, normalized);
};

export const fetchAndPersistSpaceWeatherAlerts = async (): Promise<void> => {
  const response = await httpClient.get<NOAAAlertResponse>("/products/alerts.json");

  const alerts = response.data;

  if (!alerts.length) {
    logger("INFO", "[space_weather/alert] No active alerts");
    return;
  }

  const windowMs = 7 * 24 * 60 * 60 * 1000;
  const seenIds = await getSeenIds(CATEGORY.ALERT, windowMs);

  const normalized: NormalizedSpaceWeatherAlert[] = alerts
    .map((alert): NormalizedSpaceWeatherAlert => ({
      externalId: `alert_${alert.issue_datetime}`,
      issueTime: alert.issue_datetime,
      message: alert.message,
      recordedAt: new Date(alert.issue_datetime + "Z"),
    }))
    .filter((e) => !seenIds.has(e.externalId));

  await persistAndBroadcast(CATEGORY.ALERT, normalized);
};

export const getRecentSolarWind = async (hours = 1) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db.feedEvent.findMany({
    where: { source: SOURCE, category: CATEGORY.SOLAR_WIND, recordedAt: { gte: since } },
    orderBy: { recordedAt: "desc" },
    take: 500,
  });
};

export const getRecentKpIndex = async (hours = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db.feedEvent.findMany({
    where: { source: SOURCE, category: CATEGORY.KP_INDEX, recordedAt: { gte: since } },
    orderBy: { recordedAt: "desc" },
    take: 100,
  });
};

export const getActiveAlerts = async () => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return db.feedEvent.findMany({
    where: { source: SOURCE, category: CATEGORY.ALERT, recordedAt: { gte: since } },
    orderBy: { recordedAt: "desc" },
    take: 50,
  });
};
