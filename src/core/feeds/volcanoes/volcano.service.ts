import { Prisma } from "../../../generated/prisma/client";
import db from "../../../config/db.config";
import { createHttpClient } from "../../../utils/http.utils";
import logger from "../../../utils/logger.utils";
import { broadcast } from "../../../websocket/ws.server";
import {
  USGSVolcanoResponse,
  NormalizedVolcano,
  USGSVolcano,
} from "./volcano.types";
import { withRetry } from "../../../utils/retry.utils";
import https from "https";
import crypto from "crypto";

const USGS_BASE_URL = "https://volcanoes.usgs.gov";
const SOURCE = "volcano";

const CATEGORY = {
  ELEVATED: "elevated",
  MONITORED: "monitored",
} as const;

const volcanoAgent = new https.Agent({
  secureOptions: crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION,
});

const httpClient = createHttpClient(USGS_BASE_URL, 35000, volcanoAgent);

const normalize = (v: USGSVolcano): NormalizedVolcano => ({
  externalId: v.vnum,
  name: v.volcano_name,
  vnum: v.vnum,
  colorCode: v.color_code ?? null,
  alertLevel: v.alert_level ?? null,
  state: null,
  region: null,
  updatedAt: v.sent_utc ?? null,
  recordedAt: new Date(),
});

const getLastKnownStates = async (
  category: string,
  vnums: string[],
): Promise<Map<string, string | null>> => {
  const existing = await db.feedEvent.findMany({
    where: {
      source: SOURCE,
      category,
      payload: { path: ["externalId"], string_contains: "" },
    },
    orderBy: { recordedAt: "desc" },
    select: { payload: true },
  });

  const stateMap = new Map<string, string | null>();

  for (const row of existing) {
    const p = row.payload as Record<string, unknown>;
    const vnum = p["externalId"] as string;
    if (vnums.includes(vnum) && !stateMap.has(vnum)) {
      stateMap.set(vnum, (p["colorCode"] as string | null) ?? null);
    }
  }

  return stateMap;
};

const persistAndBroadcast = async (
  category: string,
  events: NormalizedVolcano[],
): Promise<void> => {
  if (!events.length) return;

  await db.feedEvent.createMany({
    data: events.map((v) => ({
      source: SOURCE,
      category,
      payload: v as unknown as Prisma.InputJsonValue,
      recordedAt: v.recordedAt,
    })),
  });

  logger(
    "INFO",
    `[${SOURCE}/${category}] Persisted ${events.length} state-change events`,
  );
  events.forEach((v) => broadcast(`${SOURCE}/${category}`, v));
};

export const fetchAndPersistElevatedVolcanoes = async (): Promise<void> => {
  const result = await withRetry(
    () =>
      httpClient.get<USGSVolcanoResponse>(
        "/hans-public/api/volcano/getElevatedVolcanoes",
      ),
    { label: "volcano/elevated", retries: 2, delayMs: 8000 },
  );

  if (!result) return;

  const volcanoes = result.data;

  if (!volcanoes.length) {
    logger("INFO", "[volcano/elevated] No elevated volcanoes in feed");
    return;
  }

  const normalized = volcanoes.map(normalize);
  const vnums = normalized.map((v) => v.externalId);
  const lastStates = await getLastKnownStates(CATEGORY.ELEVATED, vnums);

  const changed = normalized.filter((v) => {
    const last = lastStates.get(v.externalId);
    return last === undefined || last !== v.colorCode;
  });

  await persistAndBroadcast(CATEGORY.ELEVATED, changed);

  if (!changed.length) {
    logger("INFO", "[volcano/elevated] No alert level changes since last poll");
  }
};

export const fetchAndPersistMonitoredVolcanoes = async (): Promise<void> => {
  const result = await withRetry(
    () =>
      httpClient.get<USGSVolcanoResponse>(
        "/hans-public/api/volcano/getMonitoredVolcanoes",
      ),
    { label: "volcano/monitored", retries: 2, delayMs: 8000 },
  );

  if (!result) return;

  const volcanoes = result.data;

  if (!volcanoes.length) {
    logger("INFO", "[volcano/monitored] No monitored volcanoes in feed");
    return;
  }

  const normalized = volcanoes.map(normalize);
  const windowMs = 7 * 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - windowMs);

  const existing = await db.feedEvent.findMany({
    where: {
      source: SOURCE,
      category: CATEGORY.MONITORED,
      recordedAt: { gte: since },
    },
    select: { payload: true },
  });

  const seenVnums = new Set(
    existing
      .map((e) => {
        const p = e.payload as Record<string, unknown>;
        return typeof p["externalId"] === "string" ? p["externalId"] : null;
      })
      .filter((id): id is string => id !== null),
  );

  const newEntries = normalized.filter((v) => !seenVnums.has(v.externalId));

  await persistAndBroadcast(CATEGORY.MONITORED, newEntries);

  if (!newEntries.length) {
    logger(
      "INFO",
      "[volcano/monitored] No new monitored volcanoes since last refresh",
    );
  }
};

export const getElevatedVolcanoes = async () => {
  const subquery = await db.$queryRaw<{ vnum: string; max_recorded: Date }[]>`
    SELECT
      payload->>'externalId' AS vnum,
      MAX("recordedAt") AS max_recorded
    FROM "FeedEvent"
    WHERE source = 'volcano'
      AND category = 'elevated'
    GROUP BY payload->>'externalId'
  `;

  if (!subquery.length) return [];

  const latestDates = subquery.map((r) => r.max_recorded);
  const earliest = latestDates.reduce((a, b) => (a < b ? a : b));

  return db.feedEvent.findMany({
    where: {
      source: SOURCE,
      category: CATEGORY.ELEVATED,
      recordedAt: { gte: earliest },
    },
    orderBy: { recordedAt: "desc" },
  });
};

export const getMonitoredVolcanoes = async () => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return db.feedEvent.findMany({
    where: {
      source: SOURCE,
      category: CATEGORY.MONITORED,
      recordedAt: { gte: since },
    },
    orderBy: { recordedAt: "desc" },
    take: 200,
  });
};

export const getVolcanoHistory = async (vnum: string, days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.feedEvent.findMany({
    where: {
      source: SOURCE,
      category: CATEGORY.ELEVATED,
      recordedAt: { gte: since },
      payload: {
        path: ["externalId"],
        equals: vnum,
      },
    },
    orderBy: { recordedAt: "desc" },
  });
};
