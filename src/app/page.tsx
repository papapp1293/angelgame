"use client";

import { useState } from "react";
import GameCanvas from "@/components/GameCanvas";
import HUD from "@/components/HUD";
import Sidebar from "@/components/Sidebar";
import HeatmapToggle from "@/components/Heatmap";

export default function Home() {
  const [showHeatmap, setShowHeatmap] = useState(false);

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <h1 className="text-lg font-bold tracking-tight">Angel vs Devil</h1>
        <HeatmapToggle enabled={showHeatmap} onToggle={setShowHeatmap} />
      </header>
      <HUD />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <GameCanvas showHeatmap={showHeatmap} />
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
