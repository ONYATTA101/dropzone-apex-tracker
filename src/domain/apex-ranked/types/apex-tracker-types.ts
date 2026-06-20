/**
 * Shared data contracts used by the Apex tracker domain, API routes, and dashboard UI.
 * Keeping these types in one purpose-named file prevents the API response shape from
 * leaking directly into the rest of the application.
 */

export type ApexPlatform = "PC" | "PS4" | "X1";

// DataSource lets the UI show whether the app is using real API data or local demo data.
export type DataSource = "live" | "demo";

// RankProgress powers the progress bars and "RP remaining" labels.
export type RankProgress = {
  currentFloor: number;
  nextThreshold: number | null;
  remaining: number | null;
  earned: number;
  divisionSize: number | null;
  percent: number;
  nextLabel: string;
};

// PlayerRankStatus is the clean internal player shape used everywhere after API normalization.
// Add new player fields here first if future UI cards need more data.
export type PlayerRankStatus = {
  id: string;
  name: string;
  platform: ApexPlatform;
  avatar: string | null;
  level: number;
  rankName: string;
  rankDivision: number;
  rankScore: number;
  rankPosition: number | null;
  rankImage: string | null;
  legend: string;
  updatedAt: string;
  source: DataSource;
  progress: RankProgress;
};

// RankedMapRotation is intentionally small because the dashboard only needs current/next map.
export type RankedMapRotation = {
  current: string;
  next: string;
  asset: string | null;
  endsAt: number;
  source: DataSource;
};

// This is what the app stores in localStorage for each tracked player.
// It avoids storing full API responses in the browser.
export type TrackedPlayerIdentity = {
  name: string;
  platform: ApexPlatform;
};

// Batch requests let the browser ask for the whole roster in one API call.
export type PlayerRankBatchRequest = TrackedPlayerIdentity & {
  primary?: boolean;
  requestKey?: string;
};

export type PlayerRankBatchResult = {
  player: PlayerRankStatus;
  requestKey: string;
  requested: TrackedPlayerIdentity;
};

export type PlayerRankBatchError = TrackedPlayerIdentity & {
  error: string;
  requestKey: string;
};

export type PlayerRankBatchResponse = {
  results: PlayerRankBatchResult[];
  players: PlayerRankStatus[];
  errors: PlayerRankBatchError[];
};
