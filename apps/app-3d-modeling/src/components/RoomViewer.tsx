"use client";

import { useRoomData } from "@/hooks/useRoomData";
import { useRoomBounds } from "@/hooks/useRoomBounds";
import { SceneContainer } from "./SceneContainer";

interface RoomViewerProps {
  roomId: "room1" | "room2";
}

export function RoomViewer({ roomId }: RoomViewerProps) {
  const { objects, loading, error } = useRoomData(roomId);
  const bounds = useRoomBounds(objects, roomId);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-[#1a1714]" style={{ background: "#f8f7f4" }}>
        <div className="rounded-[10px] border border-[#e2ddd8] bg-white p-6 text-center shadow-md">
          <p className="font-semibold text-red-600">{error}</p>
          <p className="mt-2 text-sm text-[#6b645c]">
            .env.local に Firebase の NEXT_PUBLIC_FIREBASE_* を設定するか、データベースのルールを確認してください。
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-[#1a1714]" style={{ background: "#f8f7f4" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#d8f3dc] border-t-[#2d6a4f]" />
          <p className="text-[#6b645c]">部屋を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return <SceneContainer roomId={roomId} objects={objects} bounds={bounds} />;
}
