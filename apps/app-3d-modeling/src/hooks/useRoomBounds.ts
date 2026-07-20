"use client";

import { useMemo } from "react";
import type { RoomObject } from "@/types/room";
import { ROOM_WALL_BOUNDS, GROUND_PLANE_MARGIN } from "@/lib/config";

export interface RoomBounds {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  centerX: number;
  centerZ: number;
  widthX: number;
  widthZ: number;
}

/**
 * 壁オブジェクトの座標から部屋の範囲を計算し、
 * 床用の範囲を返す（Room 2 と同様に壁範囲＋マージンのみで、極端な配置外オブジェクトには伸ばさない）
 */
export function useRoomBounds(
  objects: RoomObject[],
  roomId: "room1" | "room2"
): RoomBounds {
  return useMemo(() => {
    const fallback = ROOM_WALL_BOUNDS[roomId];
    const walls = objects.filter((o) => o.type === "wall");
    let xMin = fallback.xMin - GROUND_PLANE_MARGIN;
    let xMax = fallback.xMax + GROUND_PLANE_MARGIN;
    let zMin = fallback.zMin - GROUND_PLANE_MARGIN;
    let zMax = fallback.zMax + GROUND_PLANE_MARGIN;

    if (walls.length > 0) {
      const wXMin = Math.min(...walls.map((w) => w.pos.x));
      const wXMax = Math.max(...walls.map((w) => w.pos.x));
      const wZMin = Math.min(...walls.map((w) => w.pos.z));
      const wZMax = Math.max(...walls.map((w) => w.pos.z));
      xMin = wXMin - GROUND_PLANE_MARGIN;
      xMax = wXMax + GROUND_PLANE_MARGIN;
      zMin = wZMin - GROUND_PLANE_MARGIN;
      zMax = wZMax + GROUND_PLANE_MARGIN;
    }

    return {
      xMin,
      xMax,
      zMin,
      zMax,
      centerX: (xMin + xMax) / 2,
      centerZ: (zMin + zMax) / 2,
      widthX: xMax - xMin,
      widthZ: zMax - zMin,
    };
  }, [objects, roomId]);
}
