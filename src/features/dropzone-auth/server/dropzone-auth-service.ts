/**
 * Dropzone account auth logic: Apex ID verification, password hashing, sessions, and admin summaries.
 * This file intentionally never exposes password hashes to browser/admin responses.
 */

import {
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { ApexPlatform, PlayerRankStatus, TrackedPlayerIdentity } from "@/domain/apex-ranked/types/apex-tracker-types";
import {
  getDropzoneAuthStorageMode,
  readDropzoneAuthDocument,
  StoredDropzoneUser,
  writeDropzoneAuthDocument,
} from "@/features/dropzone-auth/server/dropzone-auth-store";
import { getPlayerRankStatus, normalizeApexPlatform } from "@/integrations/apex-legends-status/player-rank-service";

export type PublicDropzoneUser = {
  apexName: string;
  createdAt: string;
  id: string;
  lastLoginAt: string | null;
  loginCount: number;
  platform: ApexPlatform;
  updatedAt: string;
  verifiedRankDivision: number | null;
  verifiedRankName: string | null;
  verifiedRankScore: number | null;
};

export type DropzoneSession = {
  apexName: string;
  expiresAt: number;
  platform: ApexPlatform;
  userId: string;
};

export const DROPZONE_SESSION_COOKIE = "dropzone_session";
export const DROPZONE_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const SESSION_SIGNATURE_ALGORITHM = "sha256";

export class DropzoneAuthError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "DropzoneAuthError";
  }
}

export function normalizeAuthIdentity(identity: TrackedPlayerIdentity): TrackedPlayerIdentity {
  return {
    name: identity.name.trim(),
    platform: normalizeApexPlatform(identity.platform),
  };
}

export function getDropzoneUserKey(identity: TrackedPlayerIdentity) {
  const normalized = normalizeAuthIdentity(identity);
  return `${normalized.platform}:${normalized.name.toLowerCase()}`;
}

function getSessionSecret() {
  const secret =
    process.env.DROPZONE_AUTH_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.DROPZONE_CRON_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "dropzone-local-development-session-secret");

  if (!secret) {
    throw new DropzoneAuthError("Dropzone auth session secret is not configured.", 500);
  }

  return secret;
}

function getAdminSecret() {
  return process.env.DROPZONE_ADMIN_SECRET || "";
}

function assertValidPassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new DropzoneAuthError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new DropzoneAuthError(`Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`);
  }
}

function hashPassword(password: string, salt = randomBytes(16).toString("base64url")) {
  const passwordHash = scryptSync(password, salt, 64).toString("base64url");
  return { passwordHash, passwordSalt: salt };
}

function verifyPassword(password: string, user: StoredDropzoneUser) {
  const candidate = Buffer.from(hashPassword(password, user.passwordSalt).passwordHash, "base64url");
  const stored = Buffer.from(user.passwordHash, "base64url");

  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function toPublicUser(user: StoredDropzoneUser): PublicDropzoneUser {
  return {
    apexName: user.apexName,
    createdAt: user.createdAt,
    id: user.id,
    lastLoginAt: user.lastLoginAt,
    loginCount: user.loginCount,
    platform: user.platform,
    updatedAt: user.updatedAt,
    verifiedRankDivision: user.verifiedRankDivision,
    verifiedRankName: user.verifiedRankName,
    verifiedRankScore: user.verifiedRankScore,
  };
}

function signPayload(payload: string) {
  return createHmac(SESSION_SIGNATURE_ALGORITHM, getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function createSessionPayload(user: StoredDropzoneUser): DropzoneSession {
  return {
    apexName: user.apexName,
    expiresAt: Date.now() + DROPZONE_SESSION_TTL_SECONDS * 1000,
    platform: user.platform,
    userId: user.id,
  };
}

export function createSessionCookieValue(user: StoredDropzoneUser) {
  const payload = Buffer.from(JSON.stringify(createSessionPayload(user)), "utf8").toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function verifySessionCookieValue(value?: string | null): DropzoneSession | null {
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expectedSignature = signPayload(payload);
  const candidate = Buffer.from(signature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");

  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DropzoneSession;
    if (!session.userId || !session.apexName || !session.platform || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function verifyApexIdentity(identity: TrackedPlayerIdentity): Promise<PlayerRankStatus> {
  const normalized = normalizeAuthIdentity(identity);
  if (!normalized.name) {
    throw new DropzoneAuthError("Apex ID is required.");
  }

  return getPlayerRankStatus(normalized, true, { forceRefresh: false });
}

export async function lookupDropzoneAccount(identity: TrackedPlayerIdentity) {
  const normalized = normalizeAuthIdentity(identity);
  const [player, document] = await Promise.all([
    verifyApexIdentity(normalized),
    readDropzoneAuthDocument(),
  ]);
  const user = document.users[getDropzoneUserKey(normalized)];

  return {
    accountExists: Boolean(user),
    player,
    storageMode: getDropzoneAuthStorageMode(),
  };
}

export async function registerDropzoneAccount(identity: TrackedPlayerIdentity, password: string) {
  assertValidPassword(password);
  const normalized = normalizeAuthIdentity(identity);
  const player = await verifyApexIdentity(normalized);
  const document = await readDropzoneAuthDocument();
  const userKey = getDropzoneUserKey(normalized);

  if (document.users[userKey]) {
    throw new DropzoneAuthError("That Dropzone account already exists.", 409);
  }

  const now = new Date().toISOString();
  const passwordFields = hashPassword(password);
  const user: StoredDropzoneUser = {
    ...passwordFields,
    apexName: player.name,
    createdAt: now,
    id: randomUUID(),
    lastLoginAt: now,
    loginCount: 1,
    platform: player.platform,
    updatedAt: now,
    verifiedRankDivision: player.rankDivision,
    verifiedRankName: player.rankName,
    verifiedRankScore: player.rankScore,
  };

  document.users[userKey] = user;
  await writeDropzoneAuthDocument(document);

  return {
    player,
    sessionCookie: createSessionCookieValue(user),
    user: toPublicUser(user),
  };
}

export async function loginDropzoneAccount(identity: TrackedPlayerIdentity, password: string) {
  const normalized = normalizeAuthIdentity(identity);
  const document = await readDropzoneAuthDocument();
  const userKey = getDropzoneUserKey(normalized);
  const user = document.users[userKey];

  if (!user || !verifyPassword(password, user)) {
    throw new DropzoneAuthError("Apex ID or password is incorrect.", 401);
  }

  const now = new Date().toISOString();
  const verifiedPlayer = await getPlayerRankStatus(
    { name: user.apexName, platform: user.platform },
    true,
    { forceRefresh: false },
  ).catch(() => null);
  const updatedUser: StoredDropzoneUser = {
    ...user,
    apexName: verifiedPlayer?.name ?? user.apexName,
    lastLoginAt: now,
    loginCount: user.loginCount + 1,
    platform: verifiedPlayer?.platform ?? user.platform,
    updatedAt: now,
    verifiedRankDivision: verifiedPlayer?.rankDivision ?? user.verifiedRankDivision,
    verifiedRankName: verifiedPlayer?.rankName ?? user.verifiedRankName,
    verifiedRankScore: verifiedPlayer?.rankScore ?? user.verifiedRankScore,
  };

  document.users[userKey] = updatedUser;
  await writeDropzoneAuthDocument(document);

  return {
    player: verifiedPlayer,
    sessionCookie: createSessionCookieValue(updatedUser),
    user: toPublicUser(updatedUser),
  };
}

export async function getSessionUser(session: DropzoneSession | null) {
  if (!session) return null;

  const document = await readDropzoneAuthDocument();
  const user = Object.values(document.users).find((candidate) => candidate.id === session.userId);
  return user ? toPublicUser(user) : null;
}

export async function listAdminUsers(secret: string) {
  const configuredSecret = getAdminSecret();
  const localFallbackSecret = process.env.NODE_ENV === "production" ? "" : "dropzone-local-admin";
  const allowedSecret = configuredSecret || localFallbackSecret;

  if (!allowedSecret || secret !== allowedSecret) {
    throw new DropzoneAuthError("Admin access is not authorized.", 401);
  }

  const document = await readDropzoneAuthDocument();
  const users = Object.values(document.users)
    .map(toPublicUser)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    storageMode: getDropzoneAuthStorageMode(),
    updatedAt: document.updatedAt,
    userCount: users.length,
    users,
  };
}
