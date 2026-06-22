/**
 * Server-only storage adapter for Dropzone user accounts.
 * Passwords are stored as salted hashes, never as readable text.
 */

import { promises as fs } from "fs";
import path from "path";
import { ApexPlatform } from "@/domain/apex-ranked/types/apex-tracker-types";

export type DropzoneAuthStorageMode = "file" | "memory" | "upstash";

export type StoredDropzoneUser = {
  apexName: string;
  createdAt: string;
  id: string;
  lastLoginAt: string | null;
  loginCount: number;
  passwordHash: string;
  passwordSalt: string;
  platform: ApexPlatform;
  updatedAt: string;
  verifiedRankDivision: number | null;
  verifiedRankName: string | null;
  verifiedRankScore: number | null;
};

export type DropzoneAuthDocument = {
  updatedAt: string;
  users: Record<string, StoredDropzoneUser>;
  version: 1;
};

declare global {
  var __dropzoneAuthDocument: DropzoneAuthDocument | undefined;
}

const DROPZONE_AUTH_REDIS_KEY = "dropzone:auth-users:v1";

function createEmptyDocument(): DropzoneAuthDocument {
  return {
    updatedAt: new Date(0).toISOString(),
    users: {},
    version: 1,
  };
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { token, url } : null;
}

export function getDropzoneAuthStorageMode(): DropzoneAuthStorageMode {
  if (getUpstashConfig()) return "upstash";
  if (process.env.DROPZONE_AUTH_STORE === "memory") return "memory";
  if (process.env.DROPZONE_AUTH_STORE === "file") return "file";
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production" ? "memory" : "file";
}

function getMemoryDocument() {
  globalThis.__dropzoneAuthDocument ??= createEmptyDocument();
  return globalThis.__dropzoneAuthDocument;
}

function setMemoryDocument(document: DropzoneAuthDocument) {
  globalThis.__dropzoneAuthDocument = document;
}

function getAuthFilePath() {
  return path.resolve(process.cwd(), process.env.DROPZONE_AUTH_FILE || ".dropzone-data/dropzone-auth-users.json");
}

async function readFileDocument() {
  const filePath = getAuthFilePath();
  try {
    const file = await fs.readFile(filePath, "utf8");
    return JSON.parse(file) as DropzoneAuthDocument;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Could not read Dropzone auth file. Falling back to a fresh document. ${String(error)}`);
    }
    return createEmptyDocument();
  }
}

async function writeFileDocument(document: DropzoneAuthDocument) {
  const filePath = getAuthFilePath();
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
  const [result] = await upstashPipeline([["GET", DROPZONE_AUTH_REDIS_KEY]]);
  if (result?.error) throw new Error(result.error);
  if (!result?.result) return createEmptyDocument();

  return typeof result.result === "string"
    ? (JSON.parse(result.result) as DropzoneAuthDocument)
    : (result.result as DropzoneAuthDocument);
}

async function writeUpstashDocument(document: DropzoneAuthDocument) {
  const [result] = await upstashPipeline([["SET", DROPZONE_AUTH_REDIS_KEY, JSON.stringify(document)]]);
  if (result?.error) throw new Error(result.error);
}

export async function readDropzoneAuthDocument() {
  const mode = getDropzoneAuthStorageMode();
  if (mode === "upstash") return readUpstashDocument();
  if (mode === "file") return readFileDocument();
  return getMemoryDocument();
}

export async function writeDropzoneAuthDocument(document: DropzoneAuthDocument) {
  document.updatedAt = new Date().toISOString();
  const mode = getDropzoneAuthStorageMode();

  if (mode === "upstash") {
    await writeUpstashDocument(document);
  } else if (mode === "file") {
    await writeFileDocument(document);
  } else {
    setMemoryDocument(document);
  }

  setMemoryDocument(document);
}
