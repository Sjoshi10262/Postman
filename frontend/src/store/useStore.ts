// Central app state (Zustand). Holds sidebar data, open builder tabs, the
// selected environment, and UI bits like toasts and the save modal.

import { create } from "zustand";
import { api } from "@/lib/api";
import type {
  Collection,
  Environment,
  HistoryEntry,
  HttpMethod,
  KeyValue,
  RequestTab,
  SavedRequest,
} from "@/lib/types";

let tabCounter = 0;
const newTabId = () => `tab-${Date.now()}-${tabCounter++}`;

export interface Toast {
  id: number;
  message: string;
  kind: "success" | "error" | "info";
}

function blankTab(): RequestTab {
  return {
    tabId: newTabId(),
    savedId: null,
    collectionId: null,
    name: "Untitled Request",
    method: "GET",
    url: "",
    params: [],
    headers: [],
    auth: { type: "none" },
    body: { mode: "none" },
    dirty: false,
    response: null,
    loading: false,
  };
}

function tabFromSaved(r: SavedRequest): RequestTab {
  return {
    tabId: newTabId(),
    savedId: r.id,
    collectionId: r.collection_id,
    name: r.name,
    method: r.method,
    url: r.url,
    params: r.params ?? [],
    headers: r.headers ?? [],
    auth: r.auth ?? { type: "none" },
    body: r.body ?? { mode: "none" },
    dirty: false,
    response: null,
    loading: false,
  };
}

interface AppState {
  collections: Collection[];
  environments: Environment[];
  history: HistoryEntry[];
  activeEnvId: number | null;

  tabs: RequestTab[];
  activeTabId: string | null;

  toasts: Toast[];
  saveModalTabId: string | null; // tab being saved
  envModalOpen: boolean;

  loaded: boolean;

  // ---- bootstrap
  loadAll: () => Promise<void>;

  // ---- tabs
  openBlankTab: () => void;
  openRequest: (r: SavedRequest) => void;
  openFromHistory: (h: HistoryEntry) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, patch: Partial<RequestTab>) => void;
  activeTab: () => RequestTab | undefined;

  // ---- sending
  sendActive: () => Promise<void>;

  // ---- collections / requests
  createCollection: (name: string) => Promise<void>;
  renameCollection: (id: number, name: string) => Promise<void>;
  deleteCollection: (id: number) => Promise<void>;
  saveTab: (tabId: string, name: string, collectionId: number) => Promise<void>;
  deleteRequest: (id: number) => Promise<void>;

  // ---- environments
  setActiveEnv: (id: number | null) => void;
  saveEnvironment: (
    id: number | null,
    name: string,
    variables: { key: string; value: string; enabled: boolean }[]
  ) => Promise<void>;
  deleteEnvironment: (id: number) => Promise<void>;

  // ---- history
  refreshHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;

  // ---- ui
  pushToast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  openSaveModal: (tabId: string) => void;
  closeSaveModal: () => void;
  setEnvModalOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  collections: [],
  environments: [],
  history: [],
  activeEnvId: null,
  tabs: [],
  activeTabId: null,
  toasts: [],
  saveModalTabId: null,
  envModalOpen: false,
  loaded: false,

  loadAll: async () => {
    try {
      const [collections, environments, history] = await Promise.all([
        api.listCollections(),
        api.listEnvironments(),
        api.listHistory(),
      ]);
      const firstTab = blankTab();
      set({
        collections,
        environments,
        history,
        activeEnvId: environments[0]?.id ?? null,
        tabs: [firstTab],
        activeTabId: firstTab.tabId,
        loaded: true,
      });
    } catch (e) {
      set({ loaded: true });
      get().pushToast(
        "Could not reach the backend. Is the server running?",
        "error"
      );
    }
  },

  openBlankTab: () => {
    const t = blankTab();
    set((s) => ({ tabs: [...s.tabs, t], activeTabId: t.tabId }));
  },

  openRequest: (r) => {
    const existing = get().tabs.find((t) => t.savedId === r.id);
    if (existing) {
      set({ activeTabId: existing.tabId });
      return;
    }
    const t = tabFromSaved(r);
    set((s) => ({ tabs: [...s.tabs, t], activeTabId: t.tabId }));
  },

  openFromHistory: (h) => {
    const t: RequestTab = {
      ...blankTab(),
      name: h.url,
      method: h.method,
      url: h.url,
      params: h.params ?? [],
      headers: h.headers ?? [],
      auth: h.auth ?? { type: "none" },
      body: h.body ?? { mode: "none" },
    };
    set((s) => ({ tabs: [...s.tabs, t], activeTabId: t.tabId }));
  },

  closeTab: (tabId) => {
    set((s) => {
      const tabs = s.tabs.filter((t) => t.tabId !== tabId);
      let activeTabId = s.activeTabId;
      if (activeTabId === tabId) {
        activeTabId = tabs.length ? tabs[tabs.length - 1].tabId : null;
      }
      if (tabs.length === 0) {
        const t = blankTab();
        return { tabs: [t], activeTabId: t.tabId };
      }
      return { tabs, activeTabId };
    });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateTab: (tabId, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.tabId === tabId ? { ...t, ...patch, dirty: true } : t
      ),
    })),

  activeTab: () => get().tabs.find((t) => t.tabId === get().activeTabId),

  sendActive: async () => {
    const tab = get().activeTab();
    if (!tab) return;
    if (!tab.url.trim()) {
      get().pushToast("Enter a request URL first.", "error");
      return;
    }
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.tabId === tab.tabId ? { ...t, loading: true, response: null } : t
      ),
    }));
    try {
      const result = await api.run({
        method: tab.method,
        url: tab.url,
        params: tab.params,
        headers: tab.headers,
        auth: tab.auth,
        body: tab.body,
        environment_id: get().activeEnvId,
      });
      set((s) => ({
        tabs: s.tabs.map((t) =>
          t.tabId === tab.tabId ? { ...t, loading: false, response: result } : t
        ),
      }));
      get().refreshHistory();
    } catch (e) {
      set((s) => ({
        tabs: s.tabs.map((t) =>
          t.tabId === tab.tabId
            ? {
                ...t,
                loading: false,
                response: {
                  ok: false,
                  error: "Request failed",
                  detail: String(e),
                },
              }
            : t
        ),
      }));
    }
  },

  createCollection: async (name) => {
    await api.createCollection(name);
    set({ collections: await api.listCollections() });
    get().pushToast(`Created collection "${name}"`, "success");
  },

  renameCollection: async (id, name) => {
    await api.renameCollection(id, name);
    set({ collections: await api.listCollections() });
    get().pushToast("Collection renamed", "success");
  },

  deleteCollection: async (id) => {
    await api.deleteCollection(id);
    set({ collections: await api.listCollections() });
    get().pushToast("Collection deleted", "info");
  },

  saveTab: async (tabId, name, collectionId) => {
    const tab = get().tabs.find((t) => t.tabId === tabId);
    if (!tab) return;
    const payload = {
      name,
      method: tab.method,
      url: tab.url,
      params: tab.params,
      headers: tab.headers,
      auth: tab.auth,
      body: tab.body,
      collection_id: collectionId,
    };
    let saved: SavedRequest;
    if (tab.savedId) {
      saved = await api.updateRequest(tab.savedId, payload);
    } else {
      saved = await api.createRequest(payload);
    }
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.tabId === tabId
          ? { ...t, savedId: saved.id, name, collectionId, dirty: false }
          : t
      ),
      saveModalTabId: null,
    }));
    set({ collections: await api.listCollections() });
    get().pushToast(`Saved "${name}"`, "success");
  },

  deleteRequest: async (id) => {
    await api.deleteRequest(id);
    set({ collections: await api.listCollections() });
    get().pushToast("Request deleted", "info");
  },

  setActiveEnv: (id) => set({ activeEnvId: id }),

  saveEnvironment: async (id, name, variables) => {
    if (id) {
      await api.updateEnvironment(id, { name, variables });
    } else {
      const created = await api.createEnvironment(name, variables);
      set({ activeEnvId: created.id });
    }
    set({ environments: await api.listEnvironments(), envModalOpen: false });
    get().pushToast(`Environment "${name}" saved`, "success");
  },

  deleteEnvironment: async (id) => {
    await api.deleteEnvironment(id);
    const environments = await api.listEnvironments();
    set((s) => ({
      environments,
      activeEnvId:
        s.activeEnvId === id ? environments[0]?.id ?? null : s.activeEnvId,
    }));
    get().pushToast("Environment deleted", "info");
  },

  refreshHistory: async () => {
    try {
      set({ history: await api.listHistory() });
    } catch {
      /* non-fatal */
    }
  },

  clearHistory: async () => {
    await api.clearHistory();
    set({ history: [] });
    get().pushToast("History cleared", "info");
  },

  pushToast: (message, kind = "info") => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => get().dismissToast(id), 3500);
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  openSaveModal: (tabId) => set({ saveModalTabId: tabId }),
  closeSaveModal: () => set({ saveModalTabId: null }),
  setEnvModalOpen: (open) => set({ envModalOpen: open }),
}));

// Helpers reused by components ------------------------------------------------
export const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export function methodColorClass(method: string): string {
  const map: Record<string, string> = {
    GET: "text-method-get",
    POST: "text-method-post",
    PUT: "text-method-put",
    PATCH: "text-method-patch",
    DELETE: "text-method-delete",
    HEAD: "text-method-head",
    OPTIONS: "text-method-options",
  };
  return map[method] ?? "text-pm-muted";
}

export function emptyRow(): KeyValue {
  return { key: "", value: "", enabled: true };
}
