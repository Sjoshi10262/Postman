"use client";

import React from "react";
import type { KeyValue } from "@/lib/types";
import { Trash } from "./Icons";

/**
 * Postman-style key/value table. Always shows one trailing empty row; typing in
 * it materialises a new row, matching Postman's "ghost row" behaviour.
 */
export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  // Display rows = real rows + a trailing ghost row.
  const display = [...rows, { key: "", value: "", enabled: true }];

  function update(idx: number, patch: Partial<KeyValue>) {
    const next = display.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    // Drop trailing fully-empty rows except keep data the user typed.
    const cleaned = next.filter(
      (r, i) => i < next.length - 1 || r.key || r.value
    );
    onChange(cleaned);
  }

  function remove(idx: number) {
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <div className="overflow-hidden rounded border border-pm-border">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-pm-bg text-2xs uppercase tracking-wide text-pm-muted">
            <th className="w-8 border-b border-pm-border" />
            <th className="border-b border-r border-pm-border px-2 py-1.5 text-left font-semibold">
              Key
            </th>
            <th className="border-b border-pm-border px-2 py-1.5 text-left font-semibold">
              Value
            </th>
            <th className="w-8 border-b border-pm-border" />
          </tr>
        </thead>
        <tbody>
          {display.map((row, idx) => {
            const isGhost = idx === display.length - 1;
            return (
              <tr key={idx} className="group hover:bg-pm-bg/60">
                <td className="border-r border-pm-border text-center">
                  {!isGhost && (
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) =>
                        update(idx, { enabled: e.target.checked })
                      }
                      className="accent-pm-orange"
                    />
                  )}
                </td>
                <td className="border-r border-pm-border">
                  <input
                    className="kv-input"
                    placeholder={keyPlaceholder}
                    value={row.key}
                    onChange={(e) => update(idx, { key: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="kv-input"
                    placeholder={valuePlaceholder}
                    value={row.value}
                    onChange={(e) => update(idx, { value: e.target.value })}
                  />
                </td>
                <td className="text-center">
                  {!isGhost && (
                    <button
                      onClick={() => remove(idx)}
                      className="invisible text-pm-faint hover:text-method-delete group-hover:visible"
                      title="Remove"
                    >
                      <Trash width={13} height={13} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
