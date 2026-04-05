"use client";

import { useGameStore } from "@/store/game-store";
import type { GamePhase } from "@/engine/types";

const PHASE_LABEL: Record<GamePhase, string> = {
  idle: "Idle",
  "devil-turn": "Your turn — click a cell to block",
  "angel-thinking": "Angel is thinking...",
  "angel-moved": "Angel moved",
  "devil-wins": "You win! The angel is trapped",
};

export default function HUD() {
  const phase = useGameStore((s) => s.phase);
  const turnNumber = useGameStore((s) => s.turnNumber);
  const blockedCount = useGameStore((s) => s.grid.size);
  const resetGame = useGameStore((s) => s.resetGame);

  return (
    <div className="flex items-center gap-4 border-b border-zinc-800 px-4 py-2 text-sm">
      <span className="font-semibold">Turn {turnNumber}</span>
      <span className="text-zinc-500">|</span>
      <span className="text-zinc-400">Blocks: {blockedCount}</span>
      <span className="text-zinc-500">|</span>
      <span
        className={
          phase === "devil-wins"
            ? "font-semibold text-green-400"
            : phase === "devil-turn"
              ? "text-red-400"
              : "text-amber-400"
        }
      >
        {PHASE_LABEL[phase]}
      </span>
      <div className="ml-auto">
        <button
          onClick={() => resetGame()}
          className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
