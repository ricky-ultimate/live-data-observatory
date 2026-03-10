-- CreateTable
CREATE TABLE "FeedEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "payload" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedEvent_source_recordedAt_idx" ON "FeedEvent"("source", "recordedAt");
