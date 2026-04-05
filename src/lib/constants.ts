export const DEFAULT_ANGEL_POWER = 2;
export const CELL_SIZE = 40;

export const COLORS = {
  background: "#0a0a0a",
  gridLine: "#1a1a1a",
  blocked: "#8b2020",
  blockedHover: "#a03030",
  angel: "#fbbf24",
  angelGlow: "rgba(251, 191, 36, 0.3)",
  reachable: "rgba(59, 130, 246, 0.15)",
  reachableHover: "rgba(59, 130, 246, 0.3)",
  path: "rgba(251, 191, 36, 0.5)",
  dangerLow: "rgba(34, 197, 94, 0.2)",
  dangerMid: "rgba(234, 179, 8, 0.3)",
  dangerHigh: "rgba(239, 68, 68, 0.4)",
  text: "#ededed",
  textMuted: "#a1a1aa",
} as const;

export const ANIMATION = {
  angelMoveDuration: 300,
  blockPlaceDuration: 200,
  frameRate: 60,
} as const;

export const GAME = {
  defaultTurnLimit: 200,
  maxPathRender: 100,
  dangerRadius: 8,
  lookaheadDepthEasy: 0,
  lookaheadDepthMedium: 1,
  lookaheadDepthHard: 2,
} as const;
