"use client";

import React, { useMemo, useState } from "react";
import type { RequestTab } from "@/lib/types";

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return "text-status-ok";
  if (code >= 300 && code < 400) return "text-status-redirect";
  return "text-status-client";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Lightweight JSON syntax highlighter -> HTML string.
function highlightJson(json: string): string {
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "text-[#0b7285]"; // number
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? "text-[#9a3412]" : "text-[#0ca750]"; // key : string
      } else if (/true|false/.test(match)) {
        cls = "text-[#7a41a6]";
      } else if (/null/.test(match)) {
        cls = "text-pm-faint";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

type RespTab = "body" | "headers";
type View = "pretty" | "raw";

export function ResponseViewer({ tab }: { tab: RequestTab }) {
  const [respTab, setRespTab] = useState<RespTab>("body");
  const [view, setView] = useState<View>("pretty");
  const res = tab.response;

  const prettyBody = useMemo(() => {
    if (!res || !res.ok) return "";
    if (res.is_json) {
      try {
        return JSON.stringify(JSON.parse(res.body), null, 2);
      } catch {
        return res.body;
      }
    }
    return res.body;
  }, [res]);

  if (tab.loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-pm-muted">
        <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-pm-orange border-t-transparent" />
        Sending request…
      </div>
    );
  }

  if (!res) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-pm-faint">
        <div className="text-[13px]">
          Click <span className="font-semibold text-pm-orange">Send</span> to
          get a response
        </div>
        <div className="text-2xs">⌘/Ctrl + Enter</div>
      </div>
    );
  }

  if (!res.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="text-[14px] font-semibold text-method-delete">
          {res.error}
        </div>
        <div className="max-w-md text-[13px] text-pm-muted">{res.detail}</div>
      </div>
    );
  }

  const headerEntries = Object.entries(res.headers);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Status row */}
      <div className="flex items-center gap-4 border-b border-pm-border px-4 py-2 text-[13px]">
        <div className="flex items-center gap-3">
          <span className={`font-semibold ${statusColor(res.status_code)}`}>
            {res.status_code} {res.status_text}
          </span>
          <span className="text-pm-muted">
            Time:{" "}
            <span className="font-medium text-status-ok">
              {res.time_ms} ms
            </span>
          </span>
          <span className="text-pm-muted">
            Size:{" "}
            <span className="font-medium text-status-ok">
              {formatSize(res.size_bytes)}
            </span>
          </span>
        </div>
      </div>

      {/* Response tabs */}
      <div className="flex items-center justify-between border-b border-pm-border px-4">
        <div className="flex items-center gap-5">
          {(["body", "headers"] as RespTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setRespTab(t)}
              className={`py-2.5 capitalize ${
                respTab === t ? "tab-underline active" : "tab-underline"
              }`}
            >
              {t}
              {t === "headers" && (
                <span className="ml-1 text-2xs text-pm-faint">
                  ({headerEntries.length})
                </span>
              )}
            </button>
          ))}
        </div>
        {respTab === "body" && (
          <div className="flex items-center gap-1 text-2xs">
            {(["pretty", "raw"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded px-2 py-1 capitalize ${
                  view === v
                    ? "bg-pm-active text-pm-orange"
                    : "text-pm-muted hover:bg-pm-hover"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        {respTab === "body" &&
          (view === "pretty" && res.is_json ? (
            <pre
              className="whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightJson(prettyBody) }}
            />
          ) : (
            <pre className="whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed text-pm-text">
              {view === "pretty" ? prettyBody : res.body}
            </pre>
          ))}

        {respTab === "headers" && (
          <table className="w-full text-[13px]">
            <tbody>
              {headerEntries.map(([k, v], i) => (
                <tr key={i} className="border-b border-pm-border">
                  <td className="w-1/3 px-4 py-1.5 font-medium text-pm-text">
                    {k}
                  </td>
                  <td className="break-all px-4 py-1.5 font-mono text-pm-muted">
                    {v}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
