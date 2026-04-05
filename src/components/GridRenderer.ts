import type { Coord, SparseGrid, MoveRecord } from "@/engine/types";
import { COLORS, CELL_SIZE, ANIMATION } from "@/lib/constants";
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

export interface AnimationState {
  /** Angel lerp: 0 = at prevPos, 1 = at angelPos */
  angelT: number;
  /** Previous angel position (before current move) */
  angelPrevPos: Coord;
  /** Timestamp of last block placement for flash effect */
  lastBlockTime: number;
  /** Coord of last block placed */
  lastBlockCoord: Coord | null;
  /** Global time for pulsing effects */
  time: number;
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
  anim: AnimationState;
}

/** Convert grid coord to screen pixel (top-left of cell). */
export function gridToScreen(coord: Coord, vp: Viewport): { sx: number; sy: number } {
  const cellPx = CELL_SIZE * vp.zoom;
  return {
    sx: coord.x * cellPx + vp.offsetX,
    sy: -coord.y * cellPx + vp.offsetY,
  };
}

/** Convert screen pixel (fractional) to screen pixel for a lerped position. */
function lerpScreen(
  a: Coord,
  b: Coord,
  t: number,
  vp: Viewport
): { sx: number; sy: number } {
  const sa = gridToScreen(a, vp);
  const sb = gridToScreen(b, vp);
  return {
    sx: sa.sx + (sb.sx - sa.sx) * t,
    sy: sa.sy + (sb.sy - sa.sy) * t,
  };
}

/** Ease-out cubic for smooth deceleration. */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Convert screen pixel to grid coord. */
export function screenToGrid(sx: number, sy: number, vp: Viewport): Coord {
  const cellPx = CELL_SIZE * vp.zoom;
  return {
    x: Math.floor((sx - vp.offsetX) / cellPx),
    y: -Math.floor((sy - vp.offsetY) / cellPx) - 1 + 1,
  };
}

export function screenToGridCoord(sx: number, sy: number, vp: Viewport): Coord {
  const cellPx = CELL_SIZE * vp.zoom;
  const gx = (sx - vp.offsetX) / cellPx;
  const gy = -(sy - vp.offsetY) / cellPx;
  return {
    x: Math.floor(gx),
    y: Math.floor(gy),
  };
}

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
    minY: bottomRight.y - 1,
    maxY: topLeft.y + 1,
  };
}

/** Draw a rounded rectangle. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
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

  // Origin marker
  drawOriginMarker(ctx, vp, cellPx);

  // Reachable cells
  if (state.phase === "devil-turn" || state.phase === "angel-thinking") {
    drawReachableCells(ctx, vp, state, cellPx);
  }

  // Blocked cells
  drawBlockedCells(ctx, vp, state, canvasW, canvasH, cellPx);

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

  // Angel (with animation)
  drawAngel(ctx, vp, state, cellPx);

  // Game-over overlay
  if (state.phase === "devil-wins") {
    drawWinOverlay(ctx, canvasW, canvasH, "devil");
  } else if (state.phase === "angel-wins") {
    drawWinOverlay(ctx, canvasW, canvasH, "angel");
  }
}

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  vp: Viewport,
  range: { minX: number; maxX: number; minY: number; maxY: number },
  cellPx: number
) {
  ctx.lineWidth = 1;

  // Batch normal grid lines into a single path, draw axis lines separately
  ctx.beginPath();
  ctx.strokeStyle = COLORS.gridLine;
  for (let gx = range.minX; gx <= range.maxX; gx++) {
    if (gx === 0) continue;
    const sx = gx * cellPx + vp.offsetX;
    if (sx < -1 || sx > canvasW + 1) continue;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, canvasH);
  }
  for (let gy = range.minY; gy <= range.maxY; gy++) {
    if (gy === 0) continue;
    const sy = -gy * cellPx + vp.offsetY;
    if (sy < -1 || sy > canvasH + 1) continue;
    ctx.moveTo(0, sy);
    ctx.lineTo(canvasW, sy);
  }
  ctx.stroke();

  // Axis lines (brighter)
  ctx.beginPath();
  ctx.strokeStyle = COLORS.gridLineAxis;
  const axisX = vp.offsetX;
  if (axisX >= -1 && axisX <= canvasW + 1) {
    ctx.moveTo(axisX, 0);
    ctx.lineTo(axisX, canvasH);
  }
  const axisY = vp.offsetY;
  if (axisY >= -1 && axisY <= canvasH + 1) {
    ctx.moveTo(0, axisY);
    ctx.lineTo(canvasW, axisY);
  }
  ctx.stroke();
}

function drawOriginMarker(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  cellPx: number
) {
  const { sx, sy } = gridToScreen({ x: 0, y: 0 }, vp);
  ctx.fillStyle = COLORS.origin;
  ctx.fillRect(sx + 1, sy + 1, cellPx - 2, cellPx - 2);
}

function drawBlockedCells(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  state: RenderState,
  canvasW: number,
  canvasH: number,
  cellPx: number
) {
  const { anim } = state;
  const cornerR = Math.max(2, cellPx * 0.12);
  const inset = 1;
  const flashAge = anim.time - anim.lastBlockTime;
  const flashActive = flashAge < ANIMATION.blockPlaceDuration && anim.lastBlockCoord !== null;

  for (const [key] of state.grid) {
    const [x, y] = key.split(",").map(Number);
    const { sx, sy } = gridToScreen({ x, y }, vp);

    // Cull off-screen
    if (sx + cellPx < 0 || sx > canvasW || sy + cellPx < 0 || sy > canvasH) continue;

    // Check if this is the freshly placed block
    const isFlashing =
      flashActive &&
      anim.lastBlockCoord!.x === x &&
      anim.lastBlockCoord!.y === y;

    if (isFlashing) {
      const flashT = flashAge / ANIMATION.blockPlaceDuration;
      const scale = 1 + 0.15 * (1 - flashT); // start bigger, shrink to normal
      const offset = cellPx * 0.5 * (1 - scale);

      ctx.save();
      ctx.globalAlpha = 1;

      // Flash glow
      roundRect(ctx, sx + offset, sy + offset, cellPx * scale, cellPx * scale, cornerR);
      ctx.fillStyle = COLORS.blockedFlash;
      ctx.globalAlpha = 1 - flashT;
      ctx.fill();

      // Normal block on top
      ctx.globalAlpha = 1;
      roundRect(ctx, sx + inset, sy + inset, cellPx - inset * 2, cellPx - inset * 2, cornerR);
      ctx.fillStyle = COLORS.blocked;
      ctx.fill();
      ctx.restore();
    } else {
      // Normal blocked cell with rounded corners
      roundRect(ctx, sx + inset, sy + inset, cellPx - inset * 2, cellPx - inset * 2, cornerR);
      ctx.fillStyle = COLORS.blocked;
      ctx.fill();

      // Inner shadow (subtle depth)
      roundRect(ctx, sx + inset + 2, sy + inset + 2, cellPx - inset * 2 - 4, cellPx - inset * 2 - 4, Math.max(1, cornerR - 2));
      ctx.fillStyle = COLORS.blockedInner;
      ctx.fill();
    }
  }
}

function drawReachableCells(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  state: RenderState,
  cellPx: number
) {
  const { angelPos, angelPower, grid } = state;
  const cornerR = Math.max(2, cellPx * 0.08);
  const size = cellPx - 2;
  ctx.fillStyle = COLORS.reachable;

  for (let dx = -angelPower; dx <= angelPower; dx++) {
    for (let dy = -angelPower; dy <= angelPower; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (grid.has(`${angelPos.x + dx},${angelPos.y + dy}`)) continue;
      const sx = (angelPos.x + dx) * cellPx + vp.offsetX + 1;
      const sy = -(angelPos.y + dy) * cellPx + vp.offsetY + 1;
      roundRect(ctx, sx, sy, size, size, cornerR);
      ctx.fill();
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
  const cornerR = Math.max(2, cellPx * 0.08);

  if (state.phase === "devil-turn" && !isAngel && !isBlocked) {
    ctx.fillStyle = COLORS.blockedHover;
    const { sx, sy } = gridToScreen(cell, vp);
    roundRect(ctx, sx + 1, sy + 1, cellPx - 2, cellPx - 2, cornerR);
    ctx.fill();
  } else if (
    (state.phase === "angel-thinking" || state.phase === "angel-moved") &&
    !isBlocked &&
    !isAngel &&
    chebyshevDistance(angelPos, cell) <= angelPower
  ) {
    ctx.fillStyle = COLORS.reachableHover;
    const { sx, sy } = gridToScreen(cell, vp);
    roundRect(ctx, sx + 1, sy + 1, cellPx - 2, cellPx - 2, cornerR);
    ctx.fill();
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

  const cornerR = Math.max(2, cellPx * 0.08);

  for (const { coord, danger } of dangerMap) {
    const t = danger / maxDanger;
    const { sx, sy } = gridToScreen(coord, vp);

    let color: string;
    if (t < 0.33) {
      color = COLORS.dangerLow;
    } else if (t < 0.66) {
      color = COLORS.dangerMid;
    } else {
      color = COLORS.dangerHigh;
    }

    ctx.fillStyle = color;
    roundRect(ctx, sx + 1, sy + 1, cellPx - 2, cellPx - 2, cornerR);
    ctx.fill();
  }
}

function drawAngel(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  state: RenderState,
  cellPx: number
) {
  const { anim } = state;
  const easedT = easeOutCubic(Math.min(1, anim.angelT));

  // Interpolate position for smooth movement
  const { sx, sy } = lerpScreen(anim.angelPrevPos, state.angelPos, easedT, vp);
  const cx = sx + cellPx / 2;
  const cy = sy + cellPx / 2;
  const r = cellPx * 0.35;

  // Pulsing glow
  const pulse = Math.sin(anim.time * ANIMATION.glowPulseSpeed) * 0.5 + 0.5;
  const glowR = r + cellPx * (0.18 + 0.08 * pulse);

  // Outer glow (pulsing)
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  const glowAlpha = 0.2 + 0.15 * pulse;
  ctx.fillStyle = `rgba(251, 191, 36, ${glowAlpha})`;
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.angel;
  ctx.fill();

  // Inner highlight (top-left)
  ctx.beginPath();
  ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.fill();

  // Symbol
  ctx.fillStyle = COLORS.background;
  ctx.font = `${Math.round(cellPx * 0.45)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u2726", cx, cy);
}

function drawWinOverlay(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  winner: "devil" | "angel"
) {
  // Semi-transparent dark overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Banner
  const bannerH = 80;
  const bannerY = canvasH / 2 - bannerH / 2;
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, bannerY, canvasW, bannerH);

  const accentColor = winner === "devil" ? "#22c55e" : "#fbbf24";
  const title = winner === "devil" ? "DEVIL WINS" : "ANGEL ESCAPES";
  const subtitle = winner === "devil"
    ? "The angel is trapped. Click Reset to play again."
    : "The angel survived! Click Reset to try again.";

  // Top border accent
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, bannerY, canvasW, 2);

  // Text
  ctx.fillStyle = accentColor;
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, canvasW / 2, canvasH / 2 - 8);

  ctx.fillStyle = "#a1a1aa";
  ctx.font = "14px sans-serif";
  ctx.fillText(subtitle, canvasW / 2, canvasH / 2 + 20);
}
