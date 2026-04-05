import type { Coord, MoveRecord } from "@/engine/types";
import type { Viewport } from "./GridRenderer";
import { gridToScreen } from "./GridRenderer";
import { COLORS, CELL_SIZE } from "@/lib/constants";

/**
 * Draw the angel's path history as a connected trail on the canvas.
 */
export function drawPathOverlay(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  moveHistory: MoveRecord[],
  angelPos: Coord,
  maxSegments: number
) {
  if (moveHistory.length === 0) return;

  const cellPx = CELL_SIZE * vp.zoom;
  const half = cellPx / 2;

  // Collect angel positions: initial (0,0) + each move
  const positions: Coord[] = [{ x: 0, y: 0 }];
  for (const record of moveHistory) {
    positions.push(record.angel);
  }

  // Only render last N segments
  const start = Math.max(0, positions.length - maxSegments);
  const visible = positions.slice(start);

  if (visible.length < 2) return;

  // Draw path line
  ctx.save();
  ctx.strokeStyle = COLORS.path;
  ctx.lineWidth = Math.max(2, cellPx * 0.08);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  const first = gridToScreen(visible[0], vp);
  ctx.moveTo(first.sx + half, first.sy + half);

  for (let i = 1; i < visible.length; i++) {
    const pos = gridToScreen(visible[i], vp);
    ctx.lineTo(pos.sx + half, pos.sy + half);
  }
  ctx.stroke();

  // Draw dots at each position (fading from old to new)
  for (let i = 0; i < visible.length; i++) {
    const alpha = 0.2 + 0.8 * (i / (visible.length - 1));
    const pos = gridToScreen(visible[i], vp);
    const dotR = Math.max(2, cellPx * 0.06);

    ctx.beginPath();
    ctx.arc(pos.sx + half, pos.sy + half, dotR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
    ctx.fill();
  }

  ctx.restore();
}
