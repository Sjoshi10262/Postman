"use client";

import React from "react";
import { useStore, methodColorClass } from "@/store/useStore";
import { Plus, X } from "./Icons";

export function RequestTabs() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const closeTab = useStore((s) => s.closeTab);
  const openBlankTab = useStore((s) => s.openBlankTab);

  return (
    <div className="flex items-center border-b border-pm-border bg-pm-bg">
      <div className="flex flex-1 items-stretch overflow-x-auto">
        {tabs.map((t) => {
          const active = t.tabId === activeTabId;
          return (
            <div
              key={t.tabId}
              onClick={() => setActiveTab(t.tabId)}
              className={`group flex max-w-[220px] shrink-0 cursor-pointer items-center gap-2 border-r border-pm-border px-3 py-2 text-[12px] ${
                active
                  ? "border-t-2 border-t-pm-orange bg-white"
                  : "border-t-2 border-t-transparent text-pm-muted hover:bg-pm-hover"
              }`}
            >
              <span
                className={`text-2xs font-bold ${methodColorClass(t.method)}`}
              >
                {t.method === "DELETE" ? "DEL" : t.method}
              </span>
              <span className="flex-1 truncate">
                {t.name}
                {t.dirty && (
                  <span className="ml-1 text-pm-orange" title="Unsaved">
                    •
                  </span>
                )}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.tabId);
                }}
                className="invisible rounded p-0.5 text-pm-faint hover:bg-pm-active hover:text-pm-text group-hover:visible"
              >
                <X width={12} height={12} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={openBlankTab}
        title="New request"
        className="px-3 py-2 text-pm-muted hover:text-pm-orange"
      >
        <Plus width={16} height={16} />
      </button>
    </div>
  );
}
