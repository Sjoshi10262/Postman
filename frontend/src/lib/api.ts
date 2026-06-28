// Thin typed client over the FastAPI backend.

import type {
  Collection,
  Environment,
  HistoryEntry,
  RunResult,
  SavedRequest,
} from "./types";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Collections
  listCollections: () => req<Collection[]>("/collections"),
  createCollection: (name: string) =>
    req<Collection>("/collections", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  renameCollection: (id: number, name: string) =>
    req<Collection>(`/collections/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteCollection: (id: number) =>
    req<void>(`/collections/${id}`, { method: "DELETE" }),

  // Requests
  createRequest: (payload: Partial<SavedRequest>) =>
    req<SavedRequest>("/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateRequest: (id: number, payload: Partial<SavedRequest>) =>
    req<SavedRequest>(`/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteRequest: (id: number) =>
    req<void>(`/requests/${id}`, { method: "DELETE" }),

  // Environments
  listEnvironments: () => req<Environment[]>("/environments"),
  createEnvironment: (name: string, variables: Environment["variables"]) =>
    req<Environment>("/environments", {
      method: "POST",
      body: JSON.stringify({ name, variables }),
    }),
  updateEnvironment: (
    id: number,
    payload: { name?: string; variables?: Environment["variables"] }
  ) =>
    req<Environment>(`/environments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteEnvironment: (id: number) =>
    req<void>(`/environments/${id}`, { method: "DELETE" }),

  // History
  listHistory: () => req<HistoryEntry[]>("/history"),
  clearHistory: () => req<void>("/history", { method: "DELETE" }),
  deleteHistoryEntry: (id: number) =>
    req<void>(`/history/${id}`, { method: "DELETE" }),

  // Run
  run: (payload: {
    method: string;
    url: string;
    params: unknown[];
    headers: unknown[];
    auth: unknown;
    body: unknown;
    environment_id: number | null;
  }) =>
    req<RunResult>("/run", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
