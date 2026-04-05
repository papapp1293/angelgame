import type { Coord, CellState, SparseGrid } from "./types";
import { coordKey, chebyshevDistance } from "@/lib/math";

export function createGrid(): SparseGrid {
  return new Map();
}

export function blockCell(grid: SparseGrid, coord: Coord): SparseGrid {
  const next = new Map(grid);
  next.set(coordKey(coord), "blocked");
  return next;
}

export function isBlocked(grid: SparseGrid, coord: Coord): boolean {
  return grid.get(coordKey(coord)) === "blocked";
}

export function getBlockedCells(grid: SparseGrid): Coord[] {
  const cells: Coord[] = [];
  for (const [key, state] of grid) {
    if (state === "blocked") {
      const [x, y] = key.split(",").map(Number);
      cells.push({ x, y });
    }
  }
  return cells;
}

export function getBlockedInRange(
  grid: SparseGrid,
  center: Coord,
  radius: number
): Coord[] {
  const cells: Coord[] = [];
  for (const [key, state] of grid) {
    if (state === "blocked") {
      const [x, y] = key.split(",").map(Number);
      const coord = { x, y };
      if (chebyshevDistance(center, coord) <= radius) {
        cells.push(coord);
      }
    }
  }
  return cells;
}

export function countBlockedInRange(
  grid: SparseGrid,
  center: Coord,
  radius: number
): number {
  let count = 0;
  for (const [key, state] of grid) {
    if (state === "blocked") {
      const [x, y] = key.split(",").map(Number);
      if (chebyshevDistance(center, { x, y }) <= radius) {
        count++;
      }
    }
  }
  return count;
}
