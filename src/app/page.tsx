import GameCanvas from "@/components/GameCanvas";

export default function Home() {
  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <h1 className="text-lg font-bold tracking-tight">Angel vs Devil</h1>
        <p className="text-sm text-zinc-400">Click to block cells · Trap the angel</p>
      </header>
      <div className="flex-1">
        <GameCanvas />
      </div>
    </div>
  );
}
