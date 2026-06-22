/**
 * Server-only storage adapter for RP history.
 * Local development writes a JSON file; production should use Upstash/Vercel KV env vars.
 */

import { promises as fs } from "fs";
import path from "path";
import { ApexPlatform, PlayerRpHistoryTrend } from "@/domain/apex-ranked/types/apex-tracker-types";

export type RpHistoryStorageMode = "file" | "memory" | "upstash";

export type StoredRpHistoryDay = {
  baselineRankDivision: number;
  baselineRankName: string;
  baselineRp: number;
  currentRankDivision: number;
  currentRankName: string;
  currentRp: number;
  dateKey: string;
  firstSeenAt: string;
  heatStreakCount: number;
  highestRp: number;
  lastDeltaRp: number;
  lastSeenAt: string;
  lowestRp: number;
  previousRp: number;
  rankChanged: boolean;
  rankDirection: PlayerRpHistoryTrend;
  updateCount: number;
};

export type StoredRpPlayerHistory = {
  days: Record<string, StoredRpHistoryDay>;
  key: string;
  latest?: StoredRpHistoryDay;
  name: string;
  platform: ApexPlatform;
};

export type RpHistoryDocument = {
  players: Record<string, StoredRpPlayerHistory>;
  updatedAt: string;
  version: 1;
};

declare global {
  var __dropzoneRpHistoryDocument: RpHistoryDocument | undefined;
}

const RP_HISTORY_REDIS_KEY = "dropzone:rp-history:v1";

function createEmptyDocument(): RpHistoryDocument {
  return {
    players: {},
    updatedAt: new Date(0).toISOString(),
    version: 1,
  };
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { token, url } : null;
}

export function getRpHistoryStorageMode(): RpHistoryStorageMode {
  if (getUpstashConfig()) return "upstash";
  if (process.env.DROPZONE_RP_HISTORY_STORE === "memory") return "memory";
  if (process.env.DROPZONE_RP_HISTORY_STORE === "file") return "file";
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production" ? "memory" : "file";
}

function getMemoryDocument() {
  globalThis.__dropzoneRpHistoryDocument ??= createEmptyDocument();
  return globalThis.__dropzoneRpHistoryDocument;
}

function setMemoryDocument(document: RpHistoryDocument) {
  globalThis.__dropzoneRpHistoryDocument = document;
}

function getHistoryFilePath() {
  return path.resolve(process.cwd(), process.env.DROPZONE_RP_HISTORY_FILE || ".dropzone-data/rp-history.json");
}

async function readFileDocument() {
  const filePath = getHistoryFilePath();
  try {
    const file = await fs.readFile(filePath, "utf8");
    return JSON.parse(file) as RpHistoryDocument;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Could not read RP history file. Falling back to a fresh document. ${String(error)}`);
    }
    return createEmptyDocument();
  }
}

async function writeFileDocument(document: RpHistoryDocument) {
  const filePath = getHistoryFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(document, null, 2), "utf8");
}

async function upstashPipeline(commands: unknown[][]) {
  const config = getUpstashConfig();
  if (!config) throw new Error("Upstash REST configuration is missing.");

  const response = await fetch(`${config.url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash REST request failed with ${response.status}.`);
  }

  return (await response.json()) as Array<{ error?: string; result?: unknown }>;
}

async function readUpstashDocument() {
  const [result] = await upstashPipeline([["GET", RP_HISTORY_REDIS_KEY]]);
  if (result?.error) throw new Error(result.error);
  if (!result?.result) return createEmptyDocument();

  return typeof result.result === "string"
    ? (JSON.parse(result.result) as RpHistoryDocument)
    : (result.result as RpHistoryDocument);
}

async function writeUpstashDocument(document: RpHistoryDocument) {
  const [result] = await upstashPipeline([["SET", RP_HISTORY_REDIS_KEY, JSON.stringify(document)]]);
  if (result?.error) throw new Error(result.error);
}

export async function readRpHistoryDocument() {
  const mode = getRpHistoryStorageMode();
  if (mode === "upstash") return readUpstashDocument();
  if (mode === "file") return readFileDocument();
  return getMemoryDocument();
}

export async function writeRpHistoryDocument(document: RpHistoryDocument) {
  document.updatedAt = new Date().toISOString();
  const mode = getRpHistoryStorageMode();

  if (mode === "upstash") {
    await writeUpstashDocument(document);
  } else if (mode === "file") {
    await writeFileDocument(document);
  } else {
    setMemoryDocument(document);
  }

  setMemoryDocument(document);
}
