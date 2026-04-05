"use client";

import { useEffect, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useWorker } from "@/hooks/useWorker";
import type { Coord, WorkerResponse } from "@/engine/types";
import { chebyshevDistance } from "@/lib/math";

type AngelMode = "manual" | "ai";

export function useGameLoop(mode: AngelMode = "manual") {
  const phase = useGameStore((s) => s.phase);
  const angelPos = useGameStore((s) => s.angelPos);
  const angelPower = useGameStore((s) => s.angelPower);
  const grid = useGameStore((s) => s.grid);

  const onWorkerResult = useCallback((response: WorkerResponse) => {
    if (response.type === "move-result") {
      useGameStore.getState().angelMove(response.move, response.reasoning);
    }
  }, []);

  const { requestMove } = useWorker(onWorkerResult);

  // In AI mode, dispatch to worker when it's the angel's turn
  useEffect(() => {
    if (mode === "ai" && phase === "angel-thinking") {
      const s = useGameStore.getState();
      requestMove(s.grid, s.angelPos, s.angelPower, s.turnNumber, s.difficulty);
    }
  }, [mode, phase, requestMove]);

  const handleCellClick = useCallback(
    (cell: Coord) => {
      const store = useGameStore.getState();

      if (store.phase === "devil-turn") {
        const isAngel = cell.x === store.angelPos.x && cell.y === store.angelPos.y;
        const key = `${cell.x},${cell.y}`;
        const isBlocked = store.grid.has(key);
        if (!isAngel && !isBlocked) {
          store.devilMove(cell);
        }
      } else if (store.phase === "angel-thinking" && mode === "manual") {
        const dist = chebyshevDistance(store.angelPos, cell);
        const key = `${cell.x},${cell.y}`;
        const isBlocked = store.grid.has(key);
        const isSelf = cell.x === store.angelPos.x && cell.y === store.angelPos.y;
        if (!isBlocked && !isSelf && dist <= store.angelPower) {
          store.angelMove(cell);
        }
      }
    },
    [mode]
  );

  return { handleCellClick, phase, angelPos, angelPower, grid };
}
