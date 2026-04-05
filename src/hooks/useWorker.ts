"use client";

import { useRef, useCallback, useEffect } from "react";
import type {
  WorkerRequest,
  WorkerResponse,
  CellState,
  SparseGrid,
  Coord,
  Difficulty,
} from "@/engine/types";

interface UseWorkerReturn {
  /** Send game state to the worker for AI computation. */
  requestMove: (
    grid: SparseGrid,
    angelPos: Coord,
    angelPower: number,
    turnNumber: number,
    difficulty: Difficulty
  ) => void;
  /** Whether the worker is currently computing. */
  busy: boolean;
  /** Terminate the worker. */
  terminate: () => void;
}

/**
 * Manages the Angel AI Web Worker lifecycle.
 * Creates the worker on mount, terminates on unmount.
 * Calls onResult when the worker returns a move.
 */
export function useWorker(
  onResult: (response: WorkerResponse) => void
): UseWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Create worker on mount
  useEffect(() => {
    const worker = new Worker(
      new URL("../engine/worker.ts", import.meta.url)
    );

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      busyRef.current = false;
      onResultRef.current(e.data);
    };

    worker.onerror = (err) => {
      console.error("[Angel Worker] Error:", err);
      busyRef.current = false;
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const requestMove = useCallback(
    (
      grid: SparseGrid,
      angelPos: Coord,
      angelPower: number,
      turnNumber: number,
      difficulty: Difficulty
    ) => {
      const worker = workerRef.current;
      if (!worker || busyRef.current) return;

      busyRef.current = true;

      // Serialize the Map for transfer
      const serializedGrid: [string, CellState][] = [...grid.entries()];

      const request: WorkerRequest = {
        type: "compute-move",
        grid: serializedGrid,
        angelPos,
        angelPower,
        turnNumber,
        difficulty,
      };

      worker.postMessage(request);
    },
    []
  );

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    busyRef.current = false;
  }, []);

  return {
    requestMove,
    get busy() {
      return busyRef.current;
    },
    terminate,
  };
}
