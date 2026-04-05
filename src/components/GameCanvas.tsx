"use client";

import { useRef, useEffect, useCallback } from "react";
import { useCanvas } from "@/hooks/useCanvas";
import { useGameStore } from "@/store/game-store";
import { useGameLoop } from "@/hooks/useGameLoop";
import { ANIMATION } from "@/lib/constants";
import {
  render,
  screenToGridCoord,
  type Viewport,
  type RenderState,
  type AnimationState,
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
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOX: number;
    startOY: number;
  } | null>(null);
  const rafRef = useRef<number>(0);
  const showHeatmapRef = useRef(showHeatmap);
  showHeatmapRef.current = showHeatmap;

  // Animation state persisted across frames
  const animRef = useRef<AnimationState>({
    angelT: 1,
    angelPrevPos: { x: 0, y: 0 },
    lastBlockTime: -Infinity,
    lastBlockCoord: null,
    time: 0,
  });

  // Track previous angel position and block count for triggering animations
  const prevAngelPosRef = useRef({ x: 0, y: 0 });
  const prevBlockCountRef = useRef(0);

  // Center viewport on mount and when size changes
  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      const vp = vpRef.current;
      if (vp.offsetX === 0 && vp.offsetY === 0) {
        vp.offsetX = size.width / 2;
        vp.offsetY = size.height / 2;
      }
    }
  }, [size.width, size.height]);

  const doRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = useGameStore.getState();
    const reasoning = state.reasoning;
    const anim = animRef.current;

    // Detect angel movement → start lerp animation
    const curPos = state.angelPos;
    const prevPos = prevAngelPosRef.current;
    if (curPos.x !== prevPos.x || curPos.y !== prevPos.y) {
      anim.angelPrevPos = { ...prevPos };
      anim.angelT = 0;
      prevAngelPosRef.current = { ...curPos };
    }

    // Detect new block placement → start flash
    const curBlockCount = state.grid.size;
    if (curBlockCount > prevBlockCountRef.current) {
      // Find the newest block (last entry in the Map)
      let lastKey = "";
      for (const key of state.grid.keys()) {
        lastKey = key;
      }
      if (lastKey) {
        const [bx, by] = lastKey.split(",").map(Number);
        anim.lastBlockCoord = { x: bx, y: by };
        anim.lastBlockTime = anim.time;
      }
    }
    prevBlockCountRef.current = curBlockCount;

    const renderState: RenderState = {
      grid: state.grid,
      angelPos: state.angelPos,
      angelPower: state.angelPower,
      phase: state.phase,
      hoverCell: hoverRef.current,
      moveHistory: state.moveHistory,
      showHeatmap: showHeatmapRef.current,
      dangerMap: reasoning?.dangerMap ?? [],
      anim,
    };

    ctx.save();
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    render(ctx, size.width, size.height, vpRef.current, renderState);
    ctx.restore();
  }, [canvasRef, size]);

  // Animation loop: runs continuously for pulse glow, and drives move/flash animations
  useEffect(() => {
    let running = true;
    let lastTime = performance.now();

    const tick = (now: number) => {
      if (!running) return;
      const dt = now - lastTime;
      lastTime = now;

      const anim = animRef.current;
      anim.time = now;

      // Advance angel lerp
      if (anim.angelT < 1) {
        anim.angelT = Math.min(1, anim.angelT + dt / ANIMATION.angelMoveDuration);
      }

      doRender();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [doRender]);

  // Re-render on store changes (ensures immediate response to state changes)
  useEffect(() => {
    const unsub = useGameStore.subscribe(() => {
      // The animation loop handles rendering, but we want to ensure
      // state changes are picked up on the next frame
    });
    return unsub;
  }, []);

  // Re-render when heatmap toggle changes
  useEffect(() => {
    doRender();
  }, [showHeatmap, doRender]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startOX: vpRef.current.offsetX,
        startOY: vpRef.current.offsetY,
      };
    }
  }, []);

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
        return;
      }

      hoverRef.current = screenToGridCoord(mx, my, vpRef.current);
    },
    [canvasRef]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const wasDrag = Math.abs(dx) > 3 || Math.abs(dy) > 3;
      dragRef.current = null;

      if (wasDrag) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cell = screenToGridCoord(mx, my, vpRef.current);
      handleCellClick(cell);
    },
    [canvasRef, handleCellClick]
  );

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
    hoverRef.current = null;
  }, []);

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

      vp.offsetX = mx - (mx - vp.offsetX) * (newZoom / oldZoom);
      vp.offsetY = my - (my - vp.offsetY) * (newZoom / oldZoom);
      vp.zoom = newZoom;
    },
    [canvasRef]
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
        Scroll to zoom &middot; Drag to pan &middot; Click to block
      </div>
    </div>
  );
}
