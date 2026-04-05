import type { Coord, SparseGrid } from "./types";
import { countBlockedInRange } from "./grid";
import {
  coordKey,
  coordsInRange,
  subtractCoords,
  normalizeVector,
  dotProduct,
} from "@/lib/math";

export interface DangerEntry {
  coord: Coord;
  danger: number;
}

/**
 * Compute a danger score for a single cell.
 *
 * Components:
 * 1. Blocked-neighbor density: how many blocked cells surround this cell
 * 2. Confinement: what fraction of the cell's immediate neighborhood is blocked
 * 3. Anti-escape penalty: penalize cells that move toward the blocked centroid
 */
export function cellDanger(
  grid: SparseGrid,
  cell: Coord,
  angelPos: Coord,
  escapeVector: Coord,
  dangerRadius: number
): number {
  // 1. Blocked neighbors within radius 1 (immediate surround, 8 cells)
  const immediateBlocked = countBlockedInRange(grid, cell, 1);

  // 2. Blocked in wider radius (density)
  const wideBlocked = countBlockedInRange(grid, cell, dangerRadius);
  const wideArea = (2 * dangerRadius + 1) ** 2;
  const density = wideBlocked / wideArea;

  // 3. Confinement: fraction of blocked cells in a 5x5 area (radius 2)
  const nearBlocked = countBlockedInRange(grid, cell, 2);
  const nearArea = 25; // 5x5
  const confinement = nearBlocked / nearArea;

  // 4. Anti-escape: penalize cells that move toward the blocked centroid (opposite to escape)
  let antiEscape = 0;
  if (escapeVector.x !== 0 || escapeVector.y !== 0) {
    const toCell = subtractCoords(cell, angelPos);
    const cellDir = normalizeVector(toCell);
    if (cellDir.x !== 0 || cellDir.y !== 0) {
      antiEscape = -dotProduct(cellDir, escapeVector); // negative dot = opposite direction
      antiEscape = Math.max(0, antiEscape); // only penalize, don't reward
    }
  }

  // Weighted sum (tuned for gameplay feel)
  return (
    immediateBlocked * 3.0 +
    density * 10.0 +
    confinement * 8.0 +
    antiEscape * 2.0
  );
}

/**
 * Compute danger scores for all reachable cells from the angel's position.
 */
export function computeDangerMap(
  grid: SparseGrid,
  angelPos: Coord,
  angelPower: number,
  escapeVector: Coord,
  dangerRadius: number
): DangerEntry[] {
  const reachable = coordsInRange(angelPos, angelPower);
  const entries: DangerEntry[] = [];

  for (const coord of reachable) {
    // Skip blocked cells and current position
    if (grid.has(coordKey(coord))) continue;
    if (coord.x === angelPos.x && coord.y === angelPos.y) continue;

    const danger = cellDanger(grid, coord, angelPos, escapeVector, dangerRadius);
    entries.push({ coord, danger });
  }

  return entries;
}

/**
 * Flood-fill freedom: count reachable (non-blocked) cells from a start position
 * within a given radius using BFS. Higher = safer.
 */
export function floodFillFreedom(
  grid: SparseGrid,
  start: Coord,
  maxRadius: number
): number {
  const visited = new Set<string>();
  const queue: Coord[] = [start];
  visited.add(coordKey(start));
  let head = 0;
  let count = 0;

  while (head < queue.length) {
    const current = queue[head++];
    count++;

    // Expand to 8 neighbors
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = current.x + dx;
        const ny = current.y + dy;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        if (Math.max(Math.abs(nx - start.x), Math.abs(ny - start.y)) > maxRadius) continue;
        if (grid.has(key)) continue;
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return count;
}
