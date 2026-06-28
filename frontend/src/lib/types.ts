// Shared types mirroring the backend schemas.

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export type AuthType = "none" | "bearer" | "basic";

export interface Auth {
  type: AuthType;
  token?: string;
  username?: string;
  password?: string;
}

export type BodyMode = "none" | "raw" | "form-data" | "x-www-form-urlencoded";

export interface Body {
  mode: BodyMode;
  raw?: string;
  raw_type?: "json" | "text";
  fields?: KeyValue[];
}

export interface SavedRequest {
  id: number;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: Auth;
  body: Body;
  collection_id: number | null;
  folder_id: number | null;
}

export interface Folder {
  id: number;
  name: string;
  collection_id: number;
}

export interface Collection {
  id: number;
  name: string;
  description: string;
  folders: Folder[];
  requests: SavedRequest[];
}

export interface Variable {
  id?: number;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: number;
  name: string;
  variables: Variable[];
}

export interface HistoryEntry {
  id: number;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: Auth;
  body: Body;
  status_code: number | null;
  response_time_ms: number | null;
  response_size_bytes: number | null;
  created_at: string;
}

// A request open in a builder tab. Mirrors SavedRequest but may be unsaved.
export interface RequestTab {
  tabId: string;
  savedId: number | null; // null until saved
  collectionId: number | null;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: Auth;
  body: Body;
  dirty: boolean;
  response: RunResult | null;
  loading: boolean;
}

export interface RunSuccess {
  ok: true;
  status_code: number;
  status_text: string;
  time_ms: number;
  size_bytes: number;
  headers: Record<string, string>;
  body: string;
  is_json: boolean;
}

export interface RunError {
  ok: false;
  error: string;
  detail: string;
}

export type RunResult = RunSuccess | RunError;
