import { Prisma } from "../../../generated/prisma/client";
import db from "../../../config/db.config";
import { createHttpClient } from "../../../utils/http.utils";
import logger from "../../../utils/logger.utils";
import { broadcast } from "../../../websocket/ws.server";
import { NeoWsFeedResponse, NeoWsAsteroid, NormalizedAsteroid } from "./asteroid.types";

const NASA_BASE_URL = "https://api.nasa.gov";
const NASA_API_KEY = "DEMO_KEY";
const SOURCE = "asteroid";

const httpClient = createHttpClient(NASA_BASE_URL, 30000);

const formatDate = (date: Date): string => date.toISOString().split("T")[0];

const normalize = (asteroid: NeoWsAsteroid): NormalizedAsteroid | null => {
  const approach = asteroid.close_approach_data[0];
  if (!approach) return null;

  return {
    externalId: `${asteroid.id}_${approach.close_approach_date}`,
    name: asteroid.name,
    nasaJplUrl: asteroid.nasa_jpl_url,
    absoluteMagnitude: asteroid.absolute_magnitude_h,
    estimatedDiameterMinKm: asteroid.estimated_diameter.kilometers.estimated_diameter_min,
    estimatedDiameterMaxKm: asteroid.estimated_diameter.kilometers.estimated_diameter_max,
    isPotentiallyHazardous: asteroid.is_potentially_hazardous_asteroid,
    closeApproachDate: approach.close_approach_date,
    closeApproachTimestamp: approach.epoch_date_close_approach,
    velocityKmPerHour: parseFloat(approach.relative_velocity.kilometers_per_hour),
    missDistanceKm: parseFloat(approach.miss_distance.kilometers),
    missDistanceLunar: parseFloat(approach.miss_distance.lunar),
    orbitingBody: approach.orbiting_body,
    recordedAt: new Date(approach.epoch_date_close_approach),
  };
};

const withRetry = async <T>(
  fn: () => Promise<T>,
  label: string,
  retries = 2,
  delayMs = 8000
): Promise<T | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isLast = attempt === retries;
      logger(
        "WARN",
        `[${label}] Attempt ${attempt}/${retries} failed${isLast ? ", giving up" : `, retrying in ${delayMs}ms`}`
      );
      if (!isLast) await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  return null;
};

export const fetchAndPersistAsteroids = async (): Promise<void> => {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 7);

  const startStr = formatDate(today);
  const endStr = formatDate(endDate);

  const url = `/neo/rest/v1/feed?start_date=${startStr}&end_date=${endStr}&api_key=${NASA_API_KEY}`;

  const result = await withRetry(
    () => httpClient.get<NeoWsFeedResponse>(url),
    "asteroid"
  );

  if (!result) return;

  const nearEarthObjects = result.data.near_earth_objects;
  const allAsteroids = Object.values(nearEarthObjects).flat();

  if (!allAsteroids.length) {
    logger("INFO", "[asteroid] No asteroids in feed window");
    return;
  }

  const normalized = allAsteroids
    .map(normalize)
    .filter((a): a is NormalizedAsteroid => a !== null);

  const windowMs = 8 * 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - windowMs);

  const existing = await db.feedEvent.findMany({
    where: {
      source: SOURCE,
      recordedAt: { gte: since },
    },
    select: { payload: true },
  });

  const seenIds = new Set(
    existing
      .map((e) => {
        const p = e.payload as Record<string, unknown>;
        return typeof p["externalId"] === "string" ? p["externalId"] : null;
      })
      .filter((id): id is string => id !== null)
  );

  const newEvents = normalized.filter((a) => !seenIds.has(a.externalId));

  if (!newEvents.length) {
    logger("INFO", "[asteroid] No new asteroid approaches to persist");
    return;
  }

  await db.feedEvent.createMany({
    data: newEvents.map((a) => ({
      source: SOURCE,
      payload: a as unknown as Prisma.InputJsonValue,
      recordedAt: a.recordedAt,
    })),
  });

  logger("INFO", `[asteroid] Persisted ${newEvents.length} new asteroid approach events`);
  newEvents.forEach((a) => broadcast(SOURCE, a));
};

export const getUpcomingAsteroids = async (days = 7) => {
  const since = new Date();
  const until = new Date();
  until.setDate(until.getDate() + days);

  return db.feedEvent.findMany({
    where: {
      source: SOURCE,
      recordedAt: { gte: since, lte: until },
    },
    orderBy: { recordedAt: "asc" },
    take: 200,
  });
};

export const getHazardousAsteroids = async (days = 7) => {
  const since = new Date();
  const until = new Date();
  until.setDate(until.getDate() + days);

  const events = await db.feedEvent.findMany({
    where: {
      source: SOURCE,
      recordedAt: { gte: since, lte: until },
    },
    orderBy: { recordedAt: "asc" },
  });

  return events.filter((e) => {
    const p = e.payload as Record<string, unknown>;
    return p["isPotentiallyHazardous"] === true;
  });
};
