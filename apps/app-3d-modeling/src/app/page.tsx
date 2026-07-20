"use client";

import { useState } from "react";
import { RoomViewer } from "@/components/RoomViewer";
import { RoomSwitcher } from "@/components/RoomSwitcher";
import { HelpOverlay } from "@/components/HelpOverlay";
import { PortalHeader } from "@/components/PortalHeader";
import type { RoomId } from "@/types/room";

export default function Home() {
  const [roomId, setRoomId] = useState<RoomId>("room1");

  return (
    <div className="flex h-screen w-screen flex-col">
      <PortalHeader />
      <main className="relative w-full flex-1">
        <RoomViewer roomId={roomId} />
        <RoomSwitcher roomId={roomId} onRoomChange={setRoomId} />
        <HelpOverlay />
      </main>
    </div>
  );
}
