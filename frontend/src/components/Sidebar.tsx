"use client";

import React, { useMemo, useState } from "react";
import { useStore, methodColorClass } from "@/store/useStore";
import type { Collection, SavedRequest } from "@/lib/types";
import {
  Chevron,
  Clock,
  Dots,
  Layers,
  Plus,
  Search,
  Trash,
} from "./Icons";

type Tab = "collections" | "history";

export function Sidebar() {
  const [tab, setTab] = useState<Tab>("collections");
  const collections = useStore((s) => s.collections);
  const createCollection = useStore((s) => s.createCollection);

  const [filter, setFilter] = useState("");

  function handleNewCollection() {
    const name = window.prompt("New collection name", "New Collection");
    if (name?.trim()) createCollection(name.trim());
  }

  return (
    <div className="flex h-full flex-col bg-pm-sidebar">
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-pm-border px-3 pt-2">
        <button
          className={`flex items-center gap-1.5 pb-2 ${
            tab === "collections"
              ? "tab-underline active"
              : "tab-underline"
          }`}
          onClick={() => setTab("collections")}
        >
          <Layers width={14} height={14} /> Collections
        </button>
        <button
          className={`flex items-center gap-1.5 pb-2 ${
            tab === "history" ? "tab-underline active" : "tab-underline"
          }`}
          onClick={() => setTab("history")}
        >
          <Clock width={14} height={14} /> History
        </button>
      </div>

      {tab === "collections" && (
        <>
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex flex-1 items-center gap-1.5 rounded border border-pm-border px-2">
              <Search width={13} height={13} className="text-pm-faint" />
              <input
                className="w-full bg-transparent py-1 text-[12px] outline-none placeholder:text-pm-faint"
                placeholder="Search collections"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <button
              onClick={handleNewCollection}
              title="New collection"
              className="rounded p-1 text-pm-muted hover:bg-pm-hover hover:text-pm-orange"
            >
              <Plus width={16} height={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-4">
            {collections.length === 0 && (
              <p className="px-4 py-6 text-[12px] text-pm-faint">
                No collections yet. Create one to start saving requests.
              </p>
            )}
            {collections
              .filter((c) =>
                c.name.toLowerCase().includes(filter.toLowerCase())
              )
              .map((c) => (
                <CollectionNode key={c.id} collection={c} />
              ))}
          </div>
        </>
      )}

      {tab === "history" && <HistoryList />}
    </div>
  );
}

function CollectionNode({ collection }: { collection: Collection }) {
  const [open, setOpen] = useState(true);
  const [menu, setMenu] = useState(false);
  const openRequest = useStore((s) => s.openRequest);
  const renameCollection = useStore((s) => s.renameCollection);
  const deleteCollection = useStore((s) => s.deleteCollection);
  const deleteRequest = useStore((s) => s.deleteRequest);

  return (
    <div className="select-none">
      <div className="group flex items-center gap-1 px-2 py-1.5 hover:bg-pm-hover">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-pm-faint transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          <Chevron width={14} height={14} />
        </button>
        <span className="flex-1 truncate text-[13px] font-medium">
          {collection.name}
        </span>
        <span className="text-2xs text-pm-faint">
          {collection.requests.length}
        </span>
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="invisible rounded p-0.5 text-pm-muted hover:bg-pm-active group-hover:visible"
          >
            <Dots width={15} height={15} />
          </button>
          {menu && (
            <div
              className="absolute right-0 z-20 mt-1 w-36 rounded border border-pm-border bg-white py-1 text-[12px] shadow-lg"
              onMouseLeave={() => setMenu(false)}
            >
              <button
                className="block w-full px-3 py-1.5 text-left hover:bg-pm-hover"
                onClick={() => {
                  setMenu(false);
                  const name = window.prompt("Rename collection", collection.name);
                  if (name?.trim()) renameCollection(collection.id, name.trim());
                }}
              >
                Rename
              </button>
              <button
                className="block w-full px-3 py-1.5 text-left text-method-delete hover:bg-pm-hover"
                onClick={() => {
                  setMenu(false);
                  if (
                    window.confirm(
                      `Delete "${collection.name}" and its requests?`
                    )
                  )
                    deleteCollection(collection.id);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {open &&
        collection.requests.map((r: SavedRequest) => (
          <div
            key={r.id}
            className="group flex cursor-pointer items-center gap-2 py-1.5 pl-9 pr-2 hover:bg-pm-hover"
            onClick={() => openRequest(r)}
          >
            <span
              className={`w-10 shrink-0 text-2xs font-bold ${methodColorClass(
                r.method
              )}`}
            >
              {r.method === "DELETE" ? "DEL" : r.method}
            </span>
            <span className="flex-1 truncate text-[13px]">{r.name}</span>
            <button
              className="invisible text-pm-faint hover:text-method-delete group-hover:visible"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete request "${r.name}"?`))
                  deleteRequest(r.id);
              }}
            >
              <Trash width={12} height={12} />
            </button>
          </div>
        ))}
    </div>
  );
}

function HistoryList() {
  const history = useStore((s) => s.history);
  const openFromHistory = useStore((s) => s.openFromHistory);
  const clearHistory = useStore((s) => s.clearHistory);

  const grouped = useMemo(() => history, [history]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-2xs uppercase tracking-wide text-pm-muted">
          {history.length} requests
        </span>
        {history.length > 0 && (
          <button
            className="text-2xs text-pm-muted hover:text-method-delete"
            onClick={() => {
              if (window.confirm("Clear all history?")) clearHistory();
            }}
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto pb-4">
        {grouped.length === 0 && (
          <p className="px-4 py-6 text-[12px] text-pm-faint">
            Sent requests will appear here.
          </p>
        )}
        {grouped.map((h) => (
          <div
            key={h.id}
            className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-pm-hover"
            onClick={() => openFromHistory(h)}
          >
            <span
              className={`w-10 shrink-0 text-2xs font-bold ${methodColorClass(
                h.method
              )}`}
            >
              {h.method === "DELETE" ? "DEL" : h.method}
            </span>
            <span className="flex-1 truncate text-[12px] text-pm-muted">
              {h.url}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
