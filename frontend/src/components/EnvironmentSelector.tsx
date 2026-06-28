"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import type { Variable } from "@/lib/types";
import { KeyValueEditor } from "./KeyValueEditor";
import { Globe, Plus, Trash } from "./Icons";

export function EnvironmentSelector() {
  const environments = useStore((s) => s.environments);
  const activeEnvId = useStore((s) => s.activeEnvId);
  const setActiveEnv = useStore((s) => s.setActiveEnv);
  const setEnvModalOpen = useStore((s) => s.setEnvModalOpen);

  return (
    <div className="flex items-center gap-1.5">
      <Globe width={15} height={15} className="text-pm-muted" />
      <select
        value={activeEnvId ?? ""}
        onChange={(e) =>
          setActiveEnv(e.target.value ? Number(e.target.value) : null)
        }
        className="cursor-pointer rounded border border-pm-border bg-white px-2 py-1.5 text-[13px] outline-none hover:border-pm-border-strong"
      >
        <option value="">No Environment</option>
        {environments.map((env) => (
          <option key={env.id} value={env.id}>
            {env.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => setEnvModalOpen(true)}
        title="Manage environments"
        className="rounded p-1 text-pm-muted hover:bg-pm-hover hover:text-pm-orange"
      >
        <Globe width={16} height={16} />
      </button>
    </div>
  );
}

export function EnvironmentModal() {
  const open = useStore((s) => s.envModalOpen);
  const setOpen = useStore((s) => s.setEnvModalOpen);
  const environments = useStore((s) => s.environments);
  const saveEnvironment = useStore((s) => s.saveEnvironment);
  const deleteEnvironment = useStore((s) => s.deleteEnvironment);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [vars, setVars] = useState<Variable[]>([]);

  useEffect(() => {
    if (!open) return;
    const first = environments[0] ?? null;
    if (first) {
      setSelectedId(first.id);
      setName(first.name);
      setVars(first.variables.map((v) => ({ ...v })));
    } else {
      startNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function selectEnv(id: number) {
    const env = environments.find((e) => e.id === id);
    if (!env) return;
    setSelectedId(id);
    setName(env.name);
    setVars(env.variables.map((v) => ({ ...v })));
  }

  function startNew() {
    setSelectedId(null);
    setName("New Environment");
    setVars([]);
  }

  async function save() {
    await saveEnvironment(
      selectedId,
      name.trim() || "Untitled",
      vars.map((v) => ({ key: v.key, value: v.value, enabled: v.enabled }))
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex h-[70vh] w-[760px] overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* List */}
        <div className="flex w-56 flex-col border-r border-pm-border">
          <div className="flex items-center justify-between border-b border-pm-border px-3 py-2.5">
            <span className="text-[13px] font-semibold">Environments</span>
            <button
              onClick={startNew}
              className="text-pm-muted hover:text-pm-orange"
              title="New environment"
            >
              <Plus width={16} height={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {environments.map((env) => (
              <div
                key={env.id}
                className={`group flex items-center justify-between px-3 py-2 text-[13px] ${
                  selectedId === env.id ? "bg-pm-active" : "hover:bg-pm-hover"
                }`}
              >
                <button
                  className="flex-1 truncate text-left"
                  onClick={() => selectEnv(env.id)}
                >
                  {env.name}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${env.name}"?`)) {
                      deleteEnvironment(env.id);
                      if (selectedId === env.id) startNew();
                    }
                  }}
                  className="invisible text-pm-faint hover:text-method-delete group-hover:visible"
                >
                  <Trash width={13} height={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex flex-1 flex-col">
          <div className="border-b border-pm-border px-4 py-3">
            <input
              className="w-full rounded border border-pm-border px-2 py-1.5 text-[14px] font-medium outline-none focus:border-pm-orange"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Environment name"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="mb-2 text-2xs uppercase tracking-wide text-pm-muted">
              Variables — reference with {"{{key}}"}
            </p>
            <KeyValueEditor
              rows={vars}
              onChange={(rows) =>
                setVars(
                  rows.map((r) => ({
                    key: r.key,
                    value: r.value,
                    enabled: r.enabled,
                  }))
                )
              }
              keyPlaceholder="variable"
              valuePlaceholder="value"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-pm-border px-4 py-3">
            <button
              onClick={() => setOpen(false)}
              className="rounded border border-pm-border px-4 py-1.5 text-[13px] hover:bg-pm-hover"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="rounded bg-pm-orange px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-pm-orange-dark"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
