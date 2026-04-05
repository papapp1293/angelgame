"use client";

import { useGameStore } from "@/store/game-store";
import type { Difficulty } from "@/engine/types";

const DIFFICULTIES: { value: Difficulty; label: string; desc: string }[] = [
  { value: "easy", label: "Easy", desc: "No lookahead \u2014 Angel reacts only" },
  { value: "medium", label: "Medium", desc: "1-step lookahead" },
  { value: "hard", label: "Hard", desc: "2-step lookahead" },
];

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onShowTutorial: () => void;
}

export default function SettingsPanel({ open, onClose, onShowTutorial }: SettingsPanelProps) {
  const angelPower = useGameStore((s) => s.angelPower);
  const difficulty = useGameStore((s) => s.difficulty);
  const setAngelPower = useGameStore((s) => s.setAngelPower);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 transition-colors hover:text-zinc-300"
          >
            &times;
          </button>
        </div>

        {/* Angel Power */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Angel Power (k = {angelPower})
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((k) => (
              <button
                key={k}
                onClick={() => setAngelPower(k)}
                className={`flex-1 rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
                  angelPower === k
                    ? "border-amber-500 bg-amber-500/20 text-amber-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-zinc-600">
            Jump range: {2 * angelPower + 1}&times;{2 * angelPower + 1} area.
            {angelPower === 1 ? " Trappable!" : " Mathematically untrappable."}
          </p>
        </div>

        {/* Difficulty */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            AI Difficulty
          </label>
          <div className="space-y-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm transition-colors ${
                  difficulty === d.value
                    ? "border-amber-500 bg-amber-500/20 text-amber-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }`}
              >
                <span className="font-medium">{d.label}</span>
                <span className="text-xs text-zinc-500">{d.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
          <button
            onClick={() => {
              onClose();
              onShowTutorial();
            }}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            View Tutorial
          </button>
          <button
            onClick={() => {
              resetGame();
              onClose();
            }}
            className="rounded bg-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-600"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
