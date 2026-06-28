"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { Sidebar } from "@/components/Sidebar";
import { RequestTabs } from "@/components/RequestTabs";
import { RequestBuilder } from "@/components/RequestBuilder";
import { ResponseViewer } from "@/components/ResponseViewer";
import {
  EnvironmentSelector,
  EnvironmentModal,
} from "@/components/EnvironmentSelector";
import { SaveRequestModal, Toasts } from "@/components/SaveRequestModal";

export default function Page() {
  const loaded = useStore((s) => s.loaded);
  const loadAll = useStore((s) => s.loadAll);
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.tabId === activeTabId);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ---- resizable sidebar -----------------------------------------------
  const [sidebarW, setSidebarW] = useState(300);
  const draggingSidebar = useRef(false);

  // ---- resizable request/response split --------------------------------
  const [responseH, setResponseH] = useState(0.45); // fraction of main area
  const draggingSplit = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (draggingSidebar.current) {
      setSidebarW(Math.min(520, Math.max(220, e.clientX)));
    }
    if (draggingSplit.current && mainRef.current) {
      const rect = mainRef.current.getBoundingClientRect();
      const frac = 1 - (e.clientY - rect.top) / rect.height;
      setResponseH(Math.min(0.8, Math.max(0.2, frac)));
    }
  }, []);

  const onMouseUp = useCallback(() => {
    draggingSidebar.current = false;
    draggingSplit.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-pm-border bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-pm-orange text-[14px] font-bold text-white">
            P
          </div>
          <span className="text-[14px] font-semibold">API Client</span>
          <span className="ml-1 rounded bg-pm-bg px-1.5 py-0.5 text-2xs text-pm-muted">
            Postman Clone
          </span>
        </div>
        <div className="flex items-center gap-3">
          <EnvironmentSelector />
          <button
            className="rounded border border-pm-border px-2.5 py-1.5 text-2xs text-pm-muted hover:bg-pm-hover"
            onClick={() =>
              useStore
                .getState()
                .pushToast("Settings — coming soon", "info")
            }
          >
            ⚙ Settings
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pm-active text-[12px] font-semibold text-pm-orange">
            U
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="shrink-0 overflow-hidden border-r border-pm-border"
          style={{ width: sidebarW }}
        >
          <Sidebar />
        </aside>
        <div
          className="resizer w-1"
          onMouseDown={() => {
            draggingSidebar.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        />

        {/* Main work area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {!loaded ? (
            <div className="flex flex-1 items-center justify-center text-[13px] text-pm-muted">
              <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-pm-orange border-t-transparent" />
              Loading workspace…
            </div>
          ) : (
            <>
              <RequestTabs />
              {activeTab && (
                <div ref={mainRef} className="flex flex-1 flex-col overflow-hidden">
                  {/* Request portion */}
                  <div
                    className="flex flex-col overflow-hidden"
                    style={{ flexBasis: `${(1 - responseH) * 100}%` }}
                  >
                    <RequestBuilder tab={activeTab} />
                  </div>

                  {/* Split handle */}
                  <div
                    className="resizer resizer-h h-1 border-y border-pm-border"
                    onMouseDown={() => {
                      draggingSplit.current = true;
                      document.body.style.cursor = "row-resize";
                      document.body.style.userSelect = "none";
                    }}
                  />

                  {/* Response portion */}
                  <div
                    className="flex flex-col overflow-hidden bg-white"
                    style={{ flexBasis: `${responseH * 100}%` }}
                  >
                    <div className="border-b border-pm-border px-4 py-2 text-[13px] font-semibold">
                      Response
                    </div>
                    <ResponseViewer tab={activeTab} />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Overlays */}
      <SaveRequestModal />
      <EnvironmentModal />
      <Toasts />
    </div>
  );
}
