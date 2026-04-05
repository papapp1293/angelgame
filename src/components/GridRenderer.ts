import type { Coord, SparseGrid, MoveRecord } from "@/engine/types";
import { COLORS, CELL_SIZE } from "@/lib/constants";
import { chebyshevDistance } from "@/lib/math";
import { drawPathOverlay } from "./PathOverlay";

export interface Viewport {
  /** Pan offset in pixels (screen-space) */
  offsetX: number;
  offsetY: number;
  /** Zoom level: 1 = default */
  zoom: number;
}

export interface DangerEntry {
  coord: Coord;
  danger: number;
}

export interface RenderState {
  grid: SparseGrid;
  angelPos: Coord;
  angelPower: number;
  phase: string;
  hoverCell: Coord | null;
  moveHistory: MoveRecord[];
  showHeatmap: boolean;
  dangerMap: DangerEntry[];
}

/** Convert grid coord to screen pixel (top-left of cell). */
export function gridToScreen(coord: Coord, vp: Viewport): { sx: number; sy: number } {
  const cellPx = CELL_SIZE * vp.zoom;
  return {
    sx: coord.x * cellPx + vp.offsetX,
    sy: -coord.y * cellPx + vp.offsetY, // flip Y: grid Y-up, screen Y-down
  };
}

/** Convert screen pixel to grid coord. */
export function screenToGrid(sx: number, sy: number, vp: Viewport): Coord {
  const cellPx = CELL_SIZE * vp.zoom;
  return {
    x: Math.floor((sx - vp.offsetX) / cellPx),
    y: -Math.floor((sy - vp.offsetY) / cellPx) - 1 + 1,
    // Simpler: invert the Y transform
  };
}

// More precise screen-to-grid: invert gridToScreen exactly
export function screenToGridCoord(sx: number, sy: number, vp: Viewport): Coord {
  const cellPx = CELL_SIZE * vp.zoom;
  const gx = (sx - vp.offsetX) / cellPx;
  const gy = -(sy - vp.offsetY) / cellPx;
  return {
    x: Math.floor(gx),
    y: Math.floor(gy),
  };
}

/** Get the visible grid range for a given canvas size and viewport. */
function getVisibleRange(
  canvasW: number,
  canvasH: number,
  vp: Viewport
): { minX: number; maxX: number; minY: number; maxY: number } {
  const topLeft = screenToGridCoord(0, 0, vp);
  const bottomRight = screenToGridCoord(canvasW, canvasH, vp);
  return {
    minX: topLeft.x - 1,
    maxX: bottomRight.x + 1,
    minY: bottomRight.y - 1, // bottomRight has smaller grid-Y
    maxY: topLeft.y + 1,
  };
}

export function render(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  vp: Viewport,
  state: RenderState
) {
  const cellPx = CELL_SIZE * vp.zoom;

  // Clear
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const range = getVisibleRange(canvasW, canvasH, vp);

  // Grid lines
  drawGridLines(ctx, canvasW, canvasH, vp, range, cellPx);

  // Reachable cells (angel move targets)
  if (state.phase === "devil-turn" || state.phase === "angel-thinking") {
    drawReachableCells(ctx, vp, state, cellPx);
  }

  // Blocked cells
  drawBlockedCells(ctx, vp, state.grid, canvasW, canvasH, cellPx);

  // Danger heatmap overlay
  if (state.showHeatmap && state.dangerMap.length > 0) {
    drawDangerHeatmap(ctx, vp, state.dangerMap, cellPx);
  }

  // Path overlay
  if (state.moveHistory.length > 0) {
    drawPathOverlay(ctx, vp, state.moveHistory, state.angelPos, 100);
  }

  // Hover cell
  if (state.hoverCell) {
    drawHoverCell(ctx, vp, state, cellPx);
  }

  // Angel
  drawAngel(ctx, vp, state.angelPos, cellPx);
}

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  vp: Viewport,
  range: { minX: number; maxX: number; minY: number; maxY: number },
  cellPx: number
) {
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 1;

  // Vertical lines
  for (let gx = range.minX; gx <= range.maxX; gx++) {
    const sx = gx * cellPx + vp.offsetX;
    if (sx < -1 || sx > canvasW + 1) continue;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, canvasH);
    ctx.stroke();
  }

  // Horizontal lines
  for (let gy = range.minY; gy <= range.maxY; gy++) {
    const sy = -gy * cellPx + vp.offsetY;
    if (sy < -1 || sy > canvasH + 1) continue;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(canvasW, sy);
    ctx.stroke();
  }
}

function drawBlockedCells(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  grid: SparseGrid,
  canvasW: number,
  canvasH: number,
  cellPx: number
) {
  ctx.fillStyle = COLORS.blocked;
  for (const [key] of grid) {
    const [x, y] = key.split(",").map(Number);
    const { sx, sy } = gridToScreen({ x, y }, vp);
    // Cull off-screen cells
    if (sx + cellPx < 0 || sx > canvasW || sy + cellPx < 0 || sy > canvasH) continue;
    ctx.fillRect(sx + 1, sy + 1, cellPx - 2, cellPx - 2);
  }
}

function drawReachableCells(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  state: RenderState,
  cellPx: number
) {
  const { angelPos, angelPower, grid } = state;
  ctx.fillStyle = COLORS.reachable;

  for (let dx = -angelPower; dx <= angelPower; dx++) {
    for (let dy = -angelPower; dy <= angelPower; dy++) {
      if (dx === 0 && dy === 0) continue;
      const c = { x: angelPos.x + dx, y: angelPos.y + dy };
      const key = `${c.x},${c.y}`;
      if (grid.has(key)) continue;
      const { sx, sy } = gridToScreen(c, vp);
      ctx.fillRect(sx + 1, sy + 1, cellPx - 2, cellPx - 2);
    }
  }
}

function drawHoverCell(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  state: RenderState,
  cellPx: number
) {
  const cell = state.hoverCell!;
  const { angelPos, angelPower, grid } = state;
  const key = `${cell.x},${cell.y}`;
  const isAngel = cell.x === angelPos.x && cell.y === angelPos.y;
  const isBlocked = grid.has(key);

  if (state.phase === "devil-turn" && !isAngel && !isBlocked) {
    // Valid devil target: show preview
    ctx.fillStyle = COLORS.blockedHover;
    const { sx, sy } = gridToScreen(cell, vp);
    ctx.fillRect(sx + 1, sy + 1, cellPx - 2, cellPx - 2);
  } else if (
    (state.phase === "angel-thinking" || state.phase === "angel-moved") &&
    !isBlocked &&
    !isAngel &&
    chebyshevDistance(angelPos, cell) <= angelPower
  ) {
    // Valid angel target: brighter reachable
    ctx.fillStyle = COLORS.reachableHover;
    const { sx, sy } = gridToScreen(cell, vp);
    ctx.fillRect(sx + 1, sy + 1, cellPx - 2, cellPx - 2);
  }
}

function drawDangerHeatmap(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  dangerMap: DangerEntry[],
  cellPx: number
) {
  if (dangerMap.length === 0) return;

  const maxDanger = Math.max(...dangerMap.map((d) => d.danger));
  if (maxDanger === 0) return;

  for (const { coord, danger } of dangerMap) {
    const t = danger / maxDanger; // 0 = safe, 1 = max danger
    const { sx, sy } = gridToScreen(coord, vp);

    // Interpolate green → yellow → red
    let color: string;
    if (t < 0.33) {
      color = COLORS.dangerLow;
    } else if (t < 0.66) {
      color = COLORS.dangerMid;
    } else {
      color = COLORS.dangerHigh;
    }

    ctx.fillStyle = color;
    ctx.fillRect(sx + 1, sy + 1, cellPx - 2, cellPx - 2);
  }
}

function drawAngel(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  angelPos: Coord,
  cellPx: number
) {
  const { sx, sy } = gridToScreen(angelPos, vp);
  const cx = sx + cellPx / 2;
  const cy = sy + cellPx / 2;
  const r = cellPx * 0.35;

  // Glow
  ctx.beginPath();
  ctx.arc(cx, cy, r + cellPx * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.angelGlow;
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.angel;
  ctx.fill();

  // Wing-like symbol
  ctx.fillStyle = COLORS.background;
  ctx.font = `${Math.round(cellPx * 0.45)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✦", cx, cy);
}
