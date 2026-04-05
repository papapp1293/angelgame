import { describe, it, expect } from "vitest";
import {
  createGrid,
  blockCell,
  isBlocked,
  getBlockedCells,
  getBlockedInRange,
  countBlockedInRange,
} from "../grid";

describe("createGrid", () => {
  it("creates an empty grid", () => {
    const grid = createGrid();
    expect(grid.size).toBe(0);
  });
});

describe("blockCell / isBlocked", () => {
  it("blocks a cell and detects it", () => {
    let grid = createGrid();
    grid = blockCell(grid, { x: 3, y: 4 });
    expect(isBlocked(grid, { x: 3, y: 4 })).toBe(true);
    expect(isBlocked(grid, { x: 0, y: 0 })).toBe(false);
  });

  it("returns a new Map (immutable)", () => {
    const grid = createGrid();
    const next = blockCell(grid, { x: 1, y: 1 });
    expect(grid.size).toBe(0);
    expect(next.size).toBe(1);
  });

  it("handles negative coordinates", () => {
    let grid = createGrid();
    grid = blockCell(grid, { x: -5, y: -10 });
    expect(isBlocked(grid, { x: -5, y: -10 })).toBe(true);
  });
});

describe("getBlockedCells", () => {
  it("returns all blocked coords", () => {
    let grid = createGrid();
    grid = blockCell(grid, { x: 1, y: 2 });
    grid = blockCell(grid, { x: 3, y: 4 });
    const cells = getBlockedCells(grid);
    expect(cells).toHaveLength(2);
    expect(cells).toContainEqual({ x: 1, y: 2 });
    expect(cells).toContainEqual({ x: 3, y: 4 });
  });
});

describe("getBlockedInRange", () => {
  it("returns only blocked cells within radius", () => {
    let grid = createGrid();
    grid = blockCell(grid, { x: 1, y: 0 }); // distance 1 from origin
    grid = blockCell(grid, { x: 5, y: 5 }); // distance 5 from origin
    const inRange = getBlockedInRange(grid, { x: 0, y: 0 }, 3);
    expect(inRange).toHaveLength(1);
    expect(inRange[0]).toEqual({ x: 1, y: 0 });
  });
});

describe("countBlockedInRange", () => {
  it("counts blocked cells within radius", () => {
    let grid = createGrid();
    grid = blockCell(grid, { x: 1, y: 0 });
    grid = blockCell(grid, { x: -1, y: 1 });
    grid = blockCell(grid, { x: 10, y: 10 });
    expect(countBlockedInRange(grid, { x: 0, y: 0 }, 2)).toBe(2);
  });
});
