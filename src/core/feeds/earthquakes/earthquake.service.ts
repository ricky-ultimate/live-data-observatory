import db from "../../../config/db.config";
import { createHttpClient } from "../../../utils/http.utils";
import logger from "../../../utils/logger.utils";
import { broadcast } from "../../../websocket/ws.server";
import {
  USGSGeoJSONResponse,
  USGSFeature,
  NormalizedEarthquake,
} from "./earthquake.types";

const USGS_BASE_URL = "https://earthquake.usgs.gov";
const USGS_FEED_PATH = "/earthquakes/feed/v1.0/summary/all_hour.geojson";
const SOURCE = "earthquake";

const httpClient = createHttpClient(USGS_BASE_URL);

const normalize = (feature: USGSFeature): NormalizedEarthquake => {
  const [lng, lat, depth] = feature.geometry.coordinates;
  return {
    externalId: feature.id,
    magnitude: feature.properties.mag,
    place: feature.properties.place,
    lat,
    lng,
    depth,
    tsunami: feature.properties.tsunami === 1,
    significance: feature.properties.sig,
    recordedAt: new Date(feature.properties.time),
  };
};

export const fetchAndPersistEarthquakes = async (): Promise<void> => {
  const response = await httpClient.get<USGSGeoJSONResponse>(USGS_FEED_PATH);
  const features = response.data.features;

  if (!features.length) {
    logger("INFO", "USGS feed returned no features");
    return;
  }

  const normalized = features.map(normalize);

  const existingIds = await db.feedEvent.findMany({
    where: {
      source: SOURCE,
      payload: {
        path: ["externalId"],
        not: null,
      },
    },
    select: { payload: true },
  });

  const seenIds = new Set(
    existingIds
      .map((e) => (e.payload as Record<string, unknown>)["externalId"] as string)
      .filter(Boolean)
  );

  const newEvents = normalized.filter((eq) => !seenIds.has(eq.externalId));

  if (!newEvents.length) {
    logger("INFO", "No new earthquake events to persist");
    return;
  }

  await db.feedEvent.createMany({
    data: newEvents.map((eq) => ({
      source: SOURCE,
      lat: eq.lat,
      lng: eq.lng,
      payload: eq as unknown as Record<string, unknown>,
      recordedAt: eq.recordedAt,
    })),
  });

  logger("INFO", `Persisted ${newEvents.length} new earthquake events`);

  newEvents.forEach((eq) => broadcast(SOURCE, eq));
};

export const getRecentEarthquakes = async (hours = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return db.feedEvent.findMany({
    where: {
      source: SOURCE,
      recordedAt: { gte: since },
    },
    orderBy: { recordedAt: "desc" },
    take: 200,
  });
};
