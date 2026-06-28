"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

export function SaveRequestModal() {
  const tabId = useStore((s) => s.saveModalTabId);
  const tabs = useStore((s) => s.tabs);
  const collections = useStore((s) => s.collections);
  const saveTab = useStore((s) => s.saveTab);
  const createCollection = useStore((s) => s.createCollection);
  const closeSaveModal = useStore((s) => s.closeSaveModal);

  const tab = tabs.find((t) => t.tabId === tabId);
  const [name, setName] = useState("");
  const [collectionId, setCollectionId] = useState<number | null>(null);

  useEffect(() => {
    if (tab) {
      setName(tab.name);
      setCollectionId(tab.collectionId ?? collections[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  if (!tabId || !tab) return null;

  async function handleSave() {
    let target = collectionId;
    if (target == null) {
      await createCollection("My Collection");
      const refreshed = useStore.getState().collections;
      target = refreshed[refreshed.length - 1]?.id ?? null;
    }
    if (target == null) return;
    await saveTab(tab!.tabId, name.trim() || "Untitled Request", target);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={closeSaveModal}
    >
      <div
        className="w-[460px] rounded-lg bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-[15px] font-semibold">Save request</h2>

        <label className="mb-1 block text-2xs uppercase tracking-wide text-pm-muted">
          Request name
        </label>
        <input
          autoFocus
          className="mb-4 w-full rounded border border-pm-border px-2.5 py-2 text-[13px] outline-none focus:border-pm-orange"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />

        <label className="mb-1 block text-2xs uppercase tracking-wide text-pm-muted">
          Save to collection
        </label>
        <select
          className="mb-5 w-full rounded border border-pm-border bg-white px-2.5 py-2 text-[13px] outline-none focus:border-pm-orange"
          value={collectionId ?? ""}
          onChange={(e) =>
            setCollectionId(e.target.value ? Number(e.target.value) : null)
          }
        >
          {collections.length === 0 && (
            <option value="">Create &quot;My Collection&quot;</option>
          )}
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            onClick={closeSaveModal}
            className="rounded border border-pm-border px-4 py-1.5 text-[13px] hover:bg-pm-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded bg-pm-orange px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-pm-orange-dark"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto max-w-sm cursor-pointer rounded-md px-4 py-2.5 text-[13px] text-white shadow-lg ${
            t.kind === "success"
              ? "bg-status-ok"
              : t.kind === "error"
                ? "bg-method-delete"
                : "bg-pm-text"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
