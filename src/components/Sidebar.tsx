"use client";

import { useGameStore } from "@/store/game-store";
import type { AngelReasoning } from "@/engine/types";

function formatVector(v: { x: number; y: number }): string {
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)})`;
}

function ReasoningPanel({ reasoning }: { reasoning: AngelReasoning }) {
  return (
    <div className="space-y-4">
      {/* Compute time */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Performance
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tabular-nums text-zinc-200">
            {reasoning.computeTimeMs.toFixed(1)}ms
          </span>
          <span className="text-xs text-zinc-500">
            depth {reasoning.lookaheadDepth}
          </span>
        </div>
      </div>

      {/* Escape vector */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Escape Vector
        </h3>
        <span className="font-mono text-sm text-amber-400">
          {formatVector(reasoning.escapeVector)}
        </span>
      </div>

      {/* Top candidates */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Top Candidates
        </h3>
        <div className="space-y-0.5">
          {reasoning.candidates.slice(0, 6).map((c, i) => {
            const isTop = i === 0;
            return (
              <div
                key={`${c.coord.x},${c.coord.y}`}
                className={`flex items-center justify-between rounded px-2 py-0.5 font-mono text-xs ${
                  isTop
                    ? "bg-amber-900/30 text-amber-300"
                    : "text-zinc-400"
                }`}
              >
                <span>
                  ({c.coord.x}, {c.coord.y})
                </span>
                <span className="tabular-nums">
                  {c.score > 0 ? "+" : ""}
                  {c.score.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danger summary */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Danger Map
        </h3>
        <div className="flex gap-3 text-xs text-zinc-400">
          <span>
            Cells:{" "}
            <span className="text-zinc-200">{reasoning.dangerMap.length}</span>
          </span>
          {reasoning.dangerMap.length > 0 && (
            <>
              <span>
                Max:{" "}
                <span className="text-red-400">
                  {Math.max(...reasoning.dangerMap.map((d) => d.danger)).toFixed(1)}
                </span>
              </span>
              <span>
                Min:{" "}
                <span className="text-green-400">
                  {Math.min(...reasoning.dangerMap.map((d) => d.danger)).toFixed(1)}
                </span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const reasoning = useGameStore((s) => s.reasoning);
  const turnNumber = useGameStore((s) => s.turnNumber);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950 p-4">
      <h2 className="mb-3 text-sm font-bold tracking-tight text-zinc-300">
        Angel Strategy
      </h2>

      {reasoning ? (
        <ReasoningPanel reasoning={reasoning} />
      ) : (
        <p className="text-xs text-zinc-600">
          {turnNumber === 0
            ? "Place a block to start. The angel will respond."
            : "Waiting for angel move..."}
        </p>
      )}
    </aside>
  );
}
