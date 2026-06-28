"use client";

import React, { useEffect, useState } from "react";
import { useStore, METHODS, methodColorClass } from "@/store/useStore";
import type { KeyValue, RequestTab } from "@/lib/types";
import { KeyValueEditor } from "./KeyValueEditor";
import { Save, Send } from "./Icons";

// ---- URL <-> query-param syncing -------------------------------------------
function paramsToQuery(params: KeyValue[]): string {
  const enabled = params.filter((p) => p.enabled && p.key);
  if (enabled.length === 0) return "";
  return enabled
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
}

function applyParamsToUrl(url: string, params: KeyValue[]): string {
  const base = url.split("?")[0];
  const q = paramsToQuery(params);
  return q ? `${base}?${q}` : base;
}

function parseQueryFromUrl(url: string): KeyValue[] {
  const qIndex = url.indexOf("?");
  if (qIndex === -1) return [];
  const query = url.slice(qIndex + 1);
  if (!query) return [];
  return query.split("&").map((pair) => {
    const [k, v = ""] = pair.split("=");
    return {
      key: safeDecode(k),
      value: safeDecode(v),
      enabled: true,
    };
  });
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

type SubTab = "params" | "auth" | "headers" | "body";

export function RequestBuilder({ tab }: { tab: RequestTab }) {
  const updateTab = useStore((s) => s.updateTab);
  const sendActive = useStore((s) => s.sendActive);
  const openSaveModal = useStore((s) => s.openSaveModal);
  const [sub, setSub] = useState<SubTab>("params");

  const set = (patch: Partial<RequestTab>) => updateTab(tab.tabId, patch);

  // Keyboard: Ctrl/Cmd+Enter sends.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        sendActive();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sendActive]);

  function onUrlChange(url: string) {
    set({ url, params: parseQueryFromUrl(url) });
  }

  function onParamsChange(params: KeyValue[]) {
    set({ params, url: applyParamsToUrl(tab.url, params) });
  }

  const counts = {
    params: tab.params.filter((p) => p.key).length,
    headers: tab.headers.filter((h) => h.key).length,
    auth: tab.auth.type !== "none" ? 1 : 0,
    body: tab.body.mode !== "none" ? 1 : 0,
  };

  return (
    <div className="flex flex-col border-b border-pm-border">
      {/* URL bar */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex flex-1 items-stretch overflow-hidden rounded border border-pm-border-strong focus-within:border-pm-orange">
          <div className="relative">
            <select
              value={tab.method}
              onChange={(e) => set({ method: e.target.value as RequestTab["method"] })}
              className={`h-full cursor-pointer appearance-none bg-pm-bg py-2 pl-3 pr-7 text-[13px] font-bold ${methodColorClass(
                tab.method
              )}`}
            >
              {METHODS.map((m) => (
                <option key={m} value={m} className="text-pm-text">
                  {m}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-pm-faint">
              ▾
            </span>
          </div>
          <input
            className="w-full bg-white px-3 text-[13px] outline-none placeholder:text-pm-faint"
            placeholder="Enter URL or paste text"
            value={tab.url}
            onChange={(e) => onUrlChange(e.target.value)}
            spellCheck={false}
          />
        </div>
        <button
          onClick={sendActive}
          disabled={tab.loading}
          className="flex items-center gap-1.5 rounded bg-pm-orange px-5 py-2 text-[13px] font-semibold text-white hover:bg-pm-orange-dark disabled:opacity-60"
        >
          {tab.loading ? "Sending…" : "Send"}
          {!tab.loading && <Send width={14} height={14} />}
        </button>
        <button
          onClick={() => openSaveModal(tab.tabId)}
          className="flex items-center gap-1.5 rounded border border-pm-border px-3 py-2 text-[13px] text-pm-text hover:bg-pm-hover"
        >
          <Save width={14} height={14} /> Save
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-5 border-b border-pm-border px-4">
        {(["params", "auth", "headers", "body"] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSub(t)}
            className={`flex items-center gap-1.5 py-2.5 ${
              sub === t ? "tab-underline active" : "tab-underline"
            }`}
          >
            <span className="capitalize">
              {t === "auth" ? "Authorization" : t}
            </span>
            {counts[t] > 0 && (
              <span className="rounded-full bg-pm-active px-1.5 text-2xs text-pm-orange">
                {t === "auth" || t === "body" ? "" : counts[t]}
                {(t === "auth" || t === "body") && "•"}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div className="max-h-[34vh] overflow-y-auto px-4 py-3">
        {sub === "params" && (
          <>
            <p className="mb-2 text-2xs uppercase tracking-wide text-pm-muted">
              Query Params
            </p>
            <KeyValueEditor rows={tab.params} onChange={onParamsChange} />
          </>
        )}
        {sub === "headers" && (
          <>
            <p className="mb-2 text-2xs uppercase tracking-wide text-pm-muted">
              Headers
            </p>
            <KeyValueEditor
              rows={tab.headers}
              onChange={(headers) => set({ headers })}
            />
          </>
        )}
        {sub === "auth" && <AuthTab tab={tab} set={set} />}
        {sub === "body" && <BodyTab tab={tab} set={set} />}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- Auth
function AuthTab({
  tab,
  set,
}: {
  tab: RequestTab;
  set: (p: Partial<RequestTab>) => void;
}) {
  const auth = tab.auth;
  return (
    <div className="max-w-xl space-y-3">
      <label className="flex items-center gap-3 text-[13px]">
        <span className="w-20 text-pm-muted">Type</span>
        <select
          value={auth.type}
          onChange={(e) =>
            set({ auth: { ...auth, type: e.target.value as typeof auth.type } })
          }
          className="rounded border border-pm-border bg-white px-2 py-1.5 text-[13px]"
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
        </select>
      </label>

      {auth.type === "none" && (
        <p className="text-[13px] text-pm-muted">
          This request does not use any authorization.
        </p>
      )}

      {auth.type === "bearer" && (
        <label className="flex items-center gap-3 text-[13px]">
          <span className="w-20 text-pm-muted">Token</span>
          <input
            className="flex-1 rounded border border-pm-border px-2 py-1.5 font-mono text-[13px]"
            placeholder="{{token}} or paste a token"
            value={auth.token ?? ""}
            onChange={(e) => set({ auth: { ...auth, token: e.target.value } })}
          />
        </label>
      )}

      {auth.type === "basic" && (
        <>
          <label className="flex items-center gap-3 text-[13px]">
            <span className="w-20 text-pm-muted">Username</span>
            <input
              className="flex-1 rounded border border-pm-border px-2 py-1.5 text-[13px]"
              value={auth.username ?? ""}
              onChange={(e) =>
                set({ auth: { ...auth, username: e.target.value } })
              }
            />
          </label>
          <label className="flex items-center gap-3 text-[13px]">
            <span className="w-20 text-pm-muted">Password</span>
            <input
              className="flex-1 rounded border border-pm-border px-2 py-1.5 text-[13px]"
              type="password"
              value={auth.password ?? ""}
              onChange={(e) =>
                set({ auth: { ...auth, password: e.target.value } })
              }
            />
          </label>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- Body
function BodyTab({
  tab,
  set,
}: {
  tab: RequestTab;
  set: (p: Partial<RequestTab>) => void;
}) {
  const body = tab.body;
  const modes: { id: typeof body.mode; label: string }[] = [
    { id: "none", label: "none" },
    { id: "raw", label: "raw" },
    { id: "form-data", label: "form-data" },
    { id: "x-www-form-urlencoded", label: "x-www-form-urlencoded" },
  ];

  function prettify() {
    try {
      const parsed = JSON.parse(body.raw ?? "");
      set({ body: { ...body, raw: JSON.stringify(parsed, null, 2) } });
    } catch {
      /* leave as-is if not valid JSON */
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[13px]">
        {modes.map((m) => (
          <label key={m.id} className="flex items-center gap-1.5">
            <input
              type="radio"
              name={`body-${tab.tabId}`}
              checked={body.mode === m.id}
              onChange={() => set({ body: { ...body, mode: m.id } })}
              className="accent-pm-orange"
            />
            <span>{m.label}</span>
          </label>
        ))}
        {body.mode === "raw" && (
          <>
            <select
              value={body.raw_type ?? "json"}
              onChange={(e) =>
                set({
                  body: {
                    ...body,
                    raw_type: e.target.value as "json" | "text",
                  },
                })
              }
              className="rounded border border-pm-border bg-white px-2 py-1 text-2xs"
            >
              <option value="json">JSON</option>
              <option value="text">Text</option>
            </select>
            <button
              onClick={prettify}
              className="text-2xs text-pm-orange hover:underline"
            >
              Beautify
            </button>
          </>
        )}
      </div>

      {body.mode === "none" && (
        <p className="text-[13px] text-pm-muted">This request has no body.</p>
      )}

      {body.mode === "raw" && (
        <textarea
          className="h-44 w-full resize-y rounded border border-pm-border bg-white p-3 font-mono text-[13px] outline-none focus:border-pm-orange"
          placeholder={
            body.raw_type === "json" ? '{\n  "key": "value"\n}' : "Raw text body"
          }
          value={body.raw ?? ""}
          onChange={(e) => set({ body: { ...body, raw: e.target.value } })}
          spellCheck={false}
        />
      )}

      {(body.mode === "form-data" ||
        body.mode === "x-www-form-urlencoded") && (
        <KeyValueEditor
          rows={body.fields ?? []}
          onChange={(fields) => set({ body: { ...body, fields } })}
        />
      )}
    </div>
  );
}
