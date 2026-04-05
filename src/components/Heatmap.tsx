"use client";

import { useGameStore } from "@/store/game-store";

interface HeatmapToggleProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
}

/**
 * Toggle button for the danger heatmap overlay.
 */
export default function HeatmapToggle({ enabled, onToggle }: HeatmapToggleProps) {
  const reasoning = useGameStore((s) => s.reasoning);
  const hasDangerData = reasoning && reasoning.dangerMap.length > 0;

  return (
    <button
      onClick={() => onToggle(!enabled)}
      disabled={!hasDangerData}
      className={`rounded border px-3 py-1.5 text-xs transition-colors ${
        enabled
          ? "border-red-700 bg-red-900/40 text-red-300"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {enabled ? "Hide Heatmap" : "Show Heatmap"}
    </button>
  );
}
