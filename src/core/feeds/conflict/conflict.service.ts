import { Prisma } from "../../../generated/prisma/client";
import db from "../../../config/db.config";
import { createHttpClient } from "../../../utils/http.utils";
import logger from "../../../utils/logger.utils";
import { broadcast } from "../../../websocket/ws.server";
import {
  GDELTArticleResponse,
  GDELTGeoResponse,
  GDELTGeoFeature,
  GDELTArticle,
  NormalizedConflictArticle,
  NormalizedConflictGeo,
} from "./conflict.types";

const GDELT_BASE_URL = "https://api.gdeltproject.org";
const SOURCE = "conflict";

const CATEGORY = {
  ARTICLES: "articles",
  GEO: "geo",
} as const;

const CONFLICT_QUERY = encodeURIComponent("Israel Iran missile strike attack");

const httpClient = createHttpClient(GDELT_BASE_URL, 30000);

const parseSeenDate = (seendate: string): Date => {
  const cleaned = seendate.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    "$1-$2-$3T$4:$5:$6Z"
  );
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? new Date() : d;
};

const normalizeArticle = (article: GDELTArticle): NormalizedConflictArticle => ({
  externalId: `article_${Buffer.from(article.url).toString("base64").slice(0, 32)}`,
  title: article.title,
  url: article.url,
  domain: article.domain,
  sourcecountry: article.sourcecountry,
  language: article.language,
  seendate: article.seendate,
  recordedAt: parseSeenDate(article.seendate),
});

const normalizeGeo = (feature: GDELTGeoFeature): NormalizedConflictGeo => {
  const [lng, lat] = feature.geometry.coordinates;
  return {
    externalId: `geo_${Buffer.from(feature.properties.name + feature.properties.url)
      .toString("base64")
      .slice(0, 32)}`,
    locationName: feature.properties.name,
    lat,
    lng,
    url: feature.properties.url,
    domain: feature.properties.domain,
    mentionCount: feature.properties.count,
    tone: feature.properties.urltone,
    recordedAt: new Date(),
  };
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
  events: (NormalizedConflictArticle | NormalizedConflictGeo)[],
  getLatLng?: (e: NormalizedConflictArticle | NormalizedConflictGeo) => { lat?: number; lng?: number }
): Promise<void> => {
  if (!events.length) return;

  await db.feedEvent.createMany({
    data: events.map((event) => {
      const geo = getLatLng?.(event) ?? {};
      return {
        source: SOURCE,
        category,
        lat: geo.lat ?? null,
        lng: geo.lng ?? null,
        payload: event as unknown as Prisma.InputJsonValue,
        recordedAt: event.recordedAt,
      };
    }),
  });

  logger("INFO", `[${SOURCE}/${category}] Persisted ${events.length} new events`);
  events.forEach((event) => broadcast(`${SOURCE}/${category}`, event));
};

const withRetry = async <T>(
  fn: () => Promise<T>,
  label: string,
  retries = 2,
  delayMs = 5000
): Promise<T | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
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

export const fetchAndPersistConflictArticles = async (timespan = "15min"): Promise<void> => {
  const url = `/api/v2/doc/doc?query=${CONFLICT_QUERY}&mode=artlist&format=json&maxrecords=250&sort=datedesc&timespan=${timespan}`;

  const result = await withRetry(
    () => httpClient.get<GDELTArticleResponse>(url),
    "conflict/articles"
  );

  if (!result) return;

  const articles = result.data.articles;

  if (!articles || !articles.length) {
    logger("INFO", "[conflict/articles] No articles returned from GDELT");
    return;
  }

  const windowMs = 24 * 60 * 60 * 1000;
  const seenIds = await getSeenIds(CATEGORY.ARTICLES, windowMs);

  const normalized = articles
    .map(normalizeArticle)
    .filter((a) => !seenIds.has(a.externalId));

  await persistAndBroadcast(CATEGORY.ARTICLES, normalized);

  if (!normalized.length) {
    logger("INFO", "[conflict/articles] No new articles since last poll");
  }
};


export const getRecentConflictArticles = async (hours = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db.feedEvent.findMany({
    where: {
      source: SOURCE,
      category: CATEGORY.ARTICLES,
      recordedAt: { gte: since },
    },
    orderBy: { recordedAt: "desc" },
    take: 250,
  });
};
