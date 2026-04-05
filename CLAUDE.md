# Angel vs Devil — Infinite Escape Engine

## Current Status

**Step 1: COMPLETE** — Project scaffold, core types, math utilities, vitest, static export  
**Step 2: COMPLETE** — Sparse grid engine (grid.ts), game logic (game.ts), Zustand store (game-store.ts), 22 new tests  
**Step 3: COMPLETE** — Canvas grid rendering with pan and zoom  
**Step 4: COMPLETE** — Basic game loop with manual angel, HUD  
**Step 5: COMPLETE** — Angel AI strategy engine  
**Step 6: COMPLETE** — Web Worker integration  
**Step 7: COMPLETE** — AI reasoning sidebar and heatmap visualization  
**Step 8: COMPLETE** — Visual polish and animations  
**Step 9: COMPLETE** — Tutorial, onboarding, and game configuration  
**Step 10: COMPLETE** — Performance optimization and edge cases  
**Step 11: NEXT** — Landing page, SEO, and portfolio presentation  
Step 12: Not started

---

## Project Overview

A visual implementation of Conway's Angel Problem: on an infinite 2D grid, the Angel (AI, power k) can jump to any cell within Chebyshev distance k. The Devil (human player) blocks one cell per turn. For k>=2, the Angel has a mathematically proven winning strategy. The player plays as the Devil trying to trap the AI Angel.

**Stack:** Next.js 15 (App Router, static export), TypeScript (strict), HTML5 Canvas, Zustand, Web Worker, Tailwind CSS, Framer Motion (UI panels only), Vitest.

**Deployment target:** Vercel static site with a shareable demo URL.

---

## Project Structure

```
angelgame/
├── public/
│   └── og-image.png                 # Social preview image
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout, fonts, metadata
│   │   ├── page.tsx                 # Landing / game page
│   │   └── globals.css              # Tailwind imports
│   ├── components/
│   │   ├── GameCanvas.tsx           # Canvas wrapper, pan/zoom, click handler
│   │   ├── GridRenderer.ts          # Pure canvas drawing functions (no React)
│   │   ├── HUD.tsx                  # Turn counter, score, status bar
│   │   ├── Sidebar.tsx              # AI reasoning panel, settings
│   │   ├── Heatmap.tsx              # Danger heatmap overlay toggle
│   │   ├── PathOverlay.ts           # Angel path history drawing
│   │   ├── TutorialModal.tsx        # First-visit explainer
│   │   └── SettingsPanel.tsx        # Game configuration
│   ├── engine/
│   │   ├── types.ts                 # Core types: Coord, GameState, Move, etc.
│   │   ├── grid.ts                  # Sparse grid (Map-based), neighbor queries
│   │   ├── game.ts                  # Game loop: validation, turn sequencing
│   │   ├── angel-strategy.ts        # AI: region analysis, escape vectors, lookahead
│   │   ├── danger-map.ts            # Danger/heatmap evaluation per cell
│   │   └── worker.ts               # Web Worker entry: receives state, returns move
│   ├── store/
│   │   └── game-store.ts           # Zustand store: state, actions, derived selectors
│   ├── hooks/
│   │   ├── useGameLoop.ts          # Orchestrates turn flow
│   │   ├── useCanvas.ts            # Canvas ref, resize, DPR handling
│   │   └── useWorker.ts            # Web Worker lifecycle
│   └── lib/
│       ├── constants.ts             # Grid size, colors, angel power, timing
│       ├── math.ts                  # Chebyshev distance, vector ops
│       └── analytics.ts            # Optional: simple event tracking
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
├── package.json
└── README.md
```

---

## Architectural Decisions

### 1. Client-Only (No Backend)
The AI runs entirely in-browser via a Web Worker. No server, no WebSocket, no CORS. Static export to Vercel. This keeps deployment trivial and latency zero.

### 2. Sparse Grid (Map, not Array)
`Map<string, CellState>` keyed by `"x,y"` strings. Only blocked cells are stored — everything else is implicitly empty. Memory is proportional to devil moves, not grid area. Any coordinate is valid (truly infinite).

### 3. Viewport Windowing (Not Chunks)
The renderer iterates the sparse grid and only draws cells visible in the current pan/zoom viewport. No chunk loading system needed. The viewport is an affine transform from screen pixels to grid coords.

### 4. HTML5 Canvas (Not WebGL/PixiJS)
Simple rectangles and lines don't need a GPU framework. Raw Canvas keeps the bundle tiny (~0KB overhead) and demonstrates low-level skill.

### 5. Hybrid AI Strategy
Three layers:
- **Escape Vector:** Flee away from the densest blocked region (direction)
- **Danger Map:** Score each reachable cell by blocked neighbors, flood-fill freedom, and escape alignment
- **Minimax Lookahead:** Shallow (depth 2-3) worst-case simulation on top 3 candidates

### 6. Core Types (Locked In)
```typescript
type Coord = { x: number; y: number };
type CellState = "blocked";
type SparseGrid = Map<string, CellState>;
type GamePhase = 'idle' | 'devil-turn' | 'angel-thinking' | 'angel-moved' | 'devil-wins';

interface GameState {
  grid: SparseGrid;
  angelPos: Coord;
  angelPower: number;       // k, default 2
  turnNumber: number;
  moveHistory: { angel: Coord; devil: Coord }[];
  phase: GamePhase;
}
```

### 7. Web Worker Protocol
```typescript
// TO worker
type WorkerRequest = { type: 'compute-move'; state: SerializedGameState };
// FROM worker
type WorkerResponse = {
  type: 'move-result';
  move: Coord;
  reasoning: {
    escapeVector: Coord;
    candidates: { coord: Coord; score: number }[];
    dangerMap: { coord: Coord; danger: number }[];
    lookaheadDepth: number;
    computeTimeMs: number;
  };
};
```

---

## Implementation Steps

Each step is a self-contained, commit-worthy unit. Start a new window per step.

### Step 1: Project Scaffold and Core Types ✅
**Created:** `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `src/app/*`, `src/engine/types.ts`, `src/lib/constants.ts`, `src/lib/math.ts`, `src/lib/__tests__/math.test.ts`

### Step 2: Sparse Grid Engine and Game State ✅
**Created:** `src/engine/grid.ts`, `src/engine/game.ts`, `src/store/game-store.ts`, `src/engine/__tests__/grid.test.ts`, `src/engine/__tests__/game.test.ts`

- `grid.ts`: `createGrid()`, `blockCell(grid, coord)`, `isBlocked(grid, coord)`, `getBlockedCells(grid)`, `getBlockedInRange(grid, center, radius)` — all pure functions returning new Maps
- `game.ts`: `initGame(angelPower)`, `applyDevilMove(state, coord)` (validates, returns new state with phase → `angel-thinking`), `applyAngelMove(state, coord)` (validates within Chebyshev k, not blocked), `checkWinCondition(state)` (angel has zero valid moves → devil wins)
- `game-store.ts`: Zustand store wrapping GameState. Actions: `devilMove(coord)`, `angelMove(coord)`, `resetGame()`, `setAngelPower(k)`. Derived selectors: `validAngelMoves`, `validDevilMoves`, `isGameOver`

**Tests:** Devil can't block angel's cell; after devil move phase is `angel-thinking`; blocking all cells around k=1 angel → `devil-wins`; store can step through 3-turn game.

### Step 3: Canvas Grid Rendering with Pan and Zoom
**Create:** `src/components/GameCanvas.tsx`, `src/components/GridRenderer.ts`, `src/hooks/useCanvas.ts`

### Step 4: Basic Game Loop (Manual Angel for Testing)
**Create:** `src/hooks/useGameLoop.ts`, `src/components/HUD.tsx`

### Step 5: Angel AI Strategy Engine ✅
**Created:** `src/engine/angel-strategy.ts`, `src/engine/danger-map.ts`, `src/engine/__tests__/angel-strategy.test.ts`, `src/engine/__tests__/danger-map.test.ts`

- `danger-map.ts`: `cellDanger()` (weighted: blocked neighbors, density, confinement, anti-escape), `computeDangerMap()` (all reachable cells), `floodFillFreedom()` (BFS open-cell count)
- `angel-strategy.ts`: `computeEscapeVector()` (away from blocked centroid), `scoreCandidate()` (alignment + freedom + local danger + centroid distance), `computeAngelMove()` (static scoring + optional minimax lookahead depth 0-2)

**Tests:** 23 new tests — escape vector direction, candidate scoring preferences, full move computation, lookahead, edge cases

### Step 6: Web Worker Integration ✅
**Created:** `src/engine/worker.ts`, `src/hooks/useWorker.ts`

- `worker.ts`: Receives serialized game state, reconstructs grid, runs `computeAngelMove()`, posts back move + reasoning. Auto-scales lookahead depth based on block count.
- `useWorker.ts`: React hook managing Worker lifecycle (create on mount, terminate on unmount), serializes grid Map for transfer, tracks busy state.
- `useGameLoop.ts`: Updated to dispatch to worker when `mode === "ai"` and `phase === "angel-thinking"`, applies result via store.
- `GameCanvas.tsx`: Switched from `"manual"` to `"ai"` mode — angel now moves automatically after each devil click.

### Step 7: AI Reasoning Sidebar and Heatmap Visualization ✅
**Created:** `src/components/Sidebar.tsx`, `src/components/Heatmap.tsx`, `src/components/PathOverlay.ts`

- `Sidebar.tsx`: Displays AI reasoning — compute time, lookahead depth, escape vector, top 6 scored candidates, danger map summary (cell count, min/max danger)
- `Heatmap.tsx`: Toggle button for danger heatmap overlay on canvas. Disabled when no danger data available.
- `PathOverlay.ts`: Draws angel path history as a connected trail with fading dots on canvas
- `GridRenderer.ts`: Extended `RenderState` with `moveHistory`, `showHeatmap`, `dangerMap`. Added `drawDangerHeatmap()` with 3-tier color interpolation (green/yellow/red)
- `GameCanvas.tsx`: Accepts `showHeatmap` prop, passes full render state including path and heatmap data
- `page.tsx`: New layout with sidebar on right, heatmap toggle in header, canvas fills remaining space
- `HUD.tsx`: Updated angel-thinking label for AI mode
- `tsconfig.json`: Excluded `out/` from type checking (worker output has unresolvable imports)

### Step 8: Visual Polish and Animations ✅
**Modified:** `GridRenderer.ts`, `GameCanvas.tsx`, `globals.css`, `constants.ts`

- Continuous animation loop (requestAnimationFrame) replaces on-demand rendering
- Angel move animation: smooth ease-out-cubic lerp from previous to new position
- Block placement flash: brief scale + red glow on newly placed blocks
- Pulsing angel glow: breathing sine-wave effect on the outer glow ring
- Angel inner highlight: subtle white specular for depth
- Rounded corners on all cells (blocked, reachable, hover, heatmap)
- Blocked cells: two-tone (outer + inner shadow) for depth
- Origin marker: subtle highlight at (0,0) grid cell
- Axis-highlighted grid lines: brighter lines for x=0 and y=0
- Devil-wins overlay: dark scrim + green banner with reset prompt
- CSS: custom scrollbar, selection color, smooth panel transitions
- New constants: `gridLineAxis`, `blockedInner`, `blockedFlash`, `angelGlowStrong`, `origin`, `glowPulseSpeed`

### Step 9: Tutorial, Onboarding, and Game Configuration ✅
**Created:** `src/components/TutorialModal.tsx`, `src/components/SettingsPanel.tsx`
**Modified:** `src/engine/types.ts`, `src/store/game-store.ts`, `src/engine/worker.ts`, `src/hooks/useWorker.ts`, `src/hooks/useGameLoop.ts`, `src/app/page.tsx`

- `TutorialModal.tsx`: 4-step onboarding walkthrough (Angel Problem concept, Devil role, Angel mechanics, win condition). Shown on first visit via localStorage. Step progress indicator, back/next/skip navigation. Can be reopened from settings.
- `SettingsPanel.tsx`: Modal with angel power selector (1-4), AI difficulty picker (easy/medium/hard), "View Tutorial" link, "New Game" button. Backdrop click to dismiss.
- `types.ts`: Added `Difficulty` type ("easy" | "medium" | "hard"), added `difficulty` field to `WorkerRequest`
- `game-store.ts`: Added `difficulty` state and `setDifficulty` action
- `worker.ts`: Uses difficulty from request to set base lookahead depth, with late-game scaling
- `useWorker.ts` / `useGameLoop.ts`: Pass difficulty through worker protocol
- `page.tsx`: Added Settings button to header, wired TutorialModal and SettingsPanel

### Step 10: Performance Optimization and Edge Cases ✅
**Modified:** `angel-strategy.ts`, `GridRenderer.ts`, `game.ts`, `grid.ts`, `danger-map.ts`, `types.ts`, `game-store.ts`, `HUD.tsx`

- `angel-strategy.ts`: Precompute blocked centroid once in `computeAngelMove` and pass via `ScoringContext` to all `scoreCandidate` calls (was recomputing per call). Smarter minimax devil candidate sampling: rank by threat score (proximity + adjacent blocks) instead of arbitrary slice.
- `grid.ts`: `countBlockedInRange` now checks specific cells for small radii (O(r²)) instead of scanning entire grid (O(n)).
- `danger-map.ts`: `floodFillFreedom` uses index-based BFS (O(1) dequeue) instead of `queue.shift()` (O(n)). Inlined grid key computation to avoid function call overhead.
- `game.ts`: Added turn limit — angel wins after 200 turns. Capped `moveHistory` to `maxPathRender` entries to prevent unbounded memory growth.
- `types.ts`: Added `"angel-wins"` to `GamePhase` union.
- `GridRenderer.ts`: Batched grid lines into two draw calls (normal + axis) instead of one per line. Generalized `drawWinOverlay` for both devil-wins and angel-wins.
- `HUD.tsx`, `game-store.ts`: Handle `angel-wins` phase display and `isGameOver` check.

### Step 11: Landing Page, SEO, and Portfolio Presentation
**Modify:** `page.tsx`, `layout.tsx`. **Create:** `public/og-image.png`, `README.md`

### Step 12: Deployment, Final Testing, and Polish

---

## Dependency Graph

```
Step 1 (scaffold) → Step 2 (engine) → Step 3 (canvas) → Step 4 (game loop)
                                                                │
                         Step 5 (AI strategy) ─────────────────→┤
                                   │                            │
                         Step 6 (web worker) ──────────────────→┤
                                   │                            │
                         Step 7 (visualization) ────────────────┘
                                   │
                         Step 8 (polish) → Step 9 (tutorial)
                                                   │
                         Step 10 (perf) ──────────→┤
                                                   │
                         Step 11 (landing) → Step 12 (deploy)
```

## Known Risks
- **Web Worker + Next.js static export:** Webpack worker bundling can be finicky. Fallback: inline worker as Blob URL.
- **AI on mobile:** Minimax may be slow on older phones. Mitigation: reduce depth based on `navigator.hardwareConcurrency`, or use time budget (100ms cap).
- **iOS Safari touch:** Pinch-to-zoom conflicts with native zoom. Use `touch-action: none` on canvas.
