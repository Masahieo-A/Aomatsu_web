"use client";

import { cn } from "@/lib/utils";

interface RoomSwitcherProps {
  roomId: "room1" | "room2";
  onRoomChange: (roomId: "room1" | "room2") => void;
  className?: string;
}

export function RoomSwitcher({ roomId, onRoomChange, className }: RoomSwitcherProps) {
  return (
    <div className={cn("absolute left-4 top-4 z-10", className)}>
      <div className="inline-flex rounded-lg border border-[#e2ddd8] bg-white/95 p-1 shadow-md backdrop-blur">
        <button
          type="button"
          onClick={() => onRoomChange("room1")}
          className={cn(
            "min-h-[40px] rounded-md px-4 py-2 text-sm font-semibold transition",
            roomId === "room1"
              ? "bg-[#2d6a4f] text-white shadow"
              : "text-[#6b645c] hover:bg-[#d8f3dc] hover:text-[#1a1714]"
          )}
        >
          Room 1
        </button>
        <button
          type="button"
          onClick={() => onRoomChange("room2")}
          className={cn(
            "min-h-[40px] rounded-md px-4 py-2 text-sm font-semibold transition",
            roomId === "room2"
              ? "bg-[#2d6a4f] text-white shadow"
              : "text-[#6b645c] hover:bg-[#d8f3dc] hover:text-[#1a1714]"
          )}
        >
          Room 2
        </button>
      </div>
    </div>
  );
}
