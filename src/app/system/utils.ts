import type { BotHealthCheckItem, BotHealthResponse } from "@/types";

export type SysStatus = "OK" | "DEGRADED" | "DOWN" | "unreachable";
export type ActiveTab = "info" | "errors";
export type GoLiveStatus = "ok" | "warning" | "error" | "unknown";

export type GoLiveCheckItem = {
  name: string;
  status: GoLiveStatus;
  message: string;
  latencyMs: number | null;
};

export type ApiErrorsPayload = import("@/types").ApiError[] | { errors?: unknown };

export function formatSinceIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function buildApiErrorsPath(
  since?: string,
  statusGte?: number,
  limit?: number
): string {
  const params = new URLSearchParams();
  if (since) params.set("since", since);
  if (statusGte) params.set("status_gte", String(statusGte));
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  return `/errors${query ? `?${query}` : ""}`;
}

export function normalizeApiErrorsPayload(payload: ApiErrorsPayload): import("@/types").ApiError[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const inner = payload?.errors;
  return Array.isArray(inner) ? (inner as import("@/types").ApiError[]) : [];
}

export function normalizeSystemStatus(status: string | null | undefined): SysStatus {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "ok") return "OK";
  if (normalized === "degraded") return "DEGRADED";
  if (normalized === "down") return "DOWN";
  return "unreachable";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function readStringField(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(payload[key]);
    if (value) return value;
  }
  return null;
}

export function readHealthField(health: BotHealthResponse | null, keys: string[]): string | null {
  const root = asRecord(health);
  if (!root) return null;

  const direct = readStringField(root, keys);
  if (direct) return direct;

  const data = asRecord(root.data);
  if (!data) return null;
  return readStringField(data, keys);
}

function normalizeGoLiveStatus(status: string | null | undefined): GoLiveStatus {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "ok") return "ok";
  if (normalized === "warn" || normalized === "warning") return "warning";
  if (normalized === "fail" || normalized === "error") return "error";
  return "unknown";
}

function readHealthChecks(health: BotHealthResponse | null): BotHealthCheckItem[] {
  const root = asRecord(health);
  if (!root) return [];

  if (Array.isArray(root.checks)) {
    return root.checks as BotHealthCheckItem[];
  }

  const data = asRecord(root.data);
  if (data && Array.isArray(data.checks)) {
    return data.checks as BotHealthCheckItem[];
  }
  return [];
}

export function normalizeGoLiveChecks(health: BotHealthResponse | null): GoLiveCheckItem[] {
  return readHealthChecks(health).map((item, index) => {
    const rawItem = asRecord(item);
    const name = asString(rawItem?.name) ?? `check_${index + 1}`;
    const status = normalizeGoLiveStatus(asString(rawItem?.status));
    const message = asString(rawItem?.message) ?? "—";
    const latencyMs = asNumber(rawItem?.latency_ms);
    return { name, status, message, latencyMs };
  });
}
