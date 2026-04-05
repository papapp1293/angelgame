"use client";

import { useRef, useEffect, useCallback } from "react";
import { useCanvas } from "@/hooks/useCanvas";
import { useGameStore } from "@/store/game-store";
import { useGameLoop } from "@/hooks/useGameLoop";
import {
  render,
  screenToGridCoord,
  type Viewport,
  type RenderState,
} from "./GridRenderer";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_SENSITIVITY = 0.001;

interface GameCanvasProps {
  showHeatmap?: boolean;
}

export default function GameCanvas({ showHeatmap = false }: GameCanvasProps) {
  const { handleCellClick } = useGameLoop("ai");
  const { canvasRef, size } = useCanvas();
  const vpRef = useRef<Viewport>({ offsetX: 0, offsetY: 0, zoom: 1 });
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOX: number; startOY: number } | null>(null);
  const rafRef = useRef<number>(0);
  const showHeatmapRef = useRef(showHeatmap);
  showHeatmapRef.current = showHeatmap;

  // Center viewport on mount and when size changes
  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      const vp = vpRef.current;
      // Only center if viewport hasn't been panned yet (initial load)
      if (vp.offsetX === 0 && vp.offsetY === 0) {
        vp.offsetX = size.width / 2;
        vp.offsetY = size.height / 2;
      }
    }
  }, [size.width, size.height]);

  const requestRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const state = useGameStore.getState();
      const reasoning = state.reasoning;
      const renderState: RenderState = {
        grid: state.grid,
        angelPos: state.angelPos,
        angelPower: state.angelPower,
        phase: state.phase,
        hoverCell: hoverRef.current,
        moveHistory: state.moveHistory,
        showHeatmap: showHeatmapRef.current,
        dangerMap: reasoning?.dangerMap ?? [],
      };

      ctx.save();
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      render(ctx, size.width, size.height, vpRef.current, renderState);
      ctx.restore();
    });
  }, [canvasRef, size]);

  // Re-render when store changes or heatmap toggles
  useEffect(() => {
    const unsub = useGameStore.subscribe(() => requestRender());
    requestRender();
    return unsub;
  }, [requestRender]);

  // Re-render when heatmap toggle changes
  useEffect(() => {
    requestRender();
  }, [showHeatmap, requestRender]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startOX: vpRef.current.offsetX,
          startOY: vpRef.current.offsetY,
        };
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        vpRef.current.offsetX = dragRef.current.startOX + dx;
        vpRef.current.offsetY = dragRef.current.startOY + dy;
        requestRender();
        return;
      }

      // Update hover
      const cell = screenToGridCoord(mx, my, vpRef.current);
      hoverRef.current = cell;
      requestRender();
    },
    [canvasRef, requestRender]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const wasDrag = Math.abs(dx) > 3 || Math.abs(dy) > 3;
      dragRef.current = null;

      if (wasDrag) return;

      // Click: delegate to game loop (handles both devil and angel turns)
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cell = screenToGridCoord(mx, my, vpRef.current);
      handleCellClick(cell);
    },
    [canvasRef]
  );

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
    hoverRef.current = null;
    requestRender();
  }, [requestRender]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const vp = vpRef.current;
      const oldZoom = vp.zoom;
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * (1 + delta)));

      // Zoom toward mouse position
      vp.offsetX = mx - (mx - vp.offsetX) * (newZoom / oldZoom);
      vp.offsetY = my - (my - vp.offsetY) * (newZoom / oldZoom);
      vp.zoom = newZoom;

      requestRender();
    },
    [canvasRef, requestRender]
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs text-zinc-400">
        Scroll to zoom · Drag to pan · Click to block
      </div>
    </div>
  );
}
