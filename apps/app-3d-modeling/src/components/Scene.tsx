"use client";

import { useRef } from "react";
import { DirectionalLight } from "three";
import {
  Wall,
  Floor,
  Table,
  Chair,
  Door,
  Window,
  Plant,
  Sofa,
  Stairs,
  Elevator,
  GroundPlane,
} from "./objects";
import type { RoomObject } from "@/types/room";
import type { RoomBounds } from "@/hooks/useRoomBounds";

interface SceneProps {
  roomId: "room1" | "room2";
  objects: RoomObject[];
  bounds: RoomBounds;
}

const COMPONENT_MAP = {
  wall: Wall,
  floor: Floor,
  table: Table,
  chair: Chair,
  door: Door,
  window: Window,
  plant: Plant,
  sofa: Sofa,
  stairs: Stairs,
  elevator: Elevator,
} as const;

export function Scene({ roomId, objects, bounds }: SceneProps) {
  const lightRef = useRef<DirectionalLight>(null);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        ref={lightRef}
        position={[20, 30, 20]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0001}
        shadow-radius={4}
      />
      <directionalLight position={[-15, 20, -15]} intensity={0.3} />
      <GroundPlane bounds={bounds} />
      {objects.map((obj) => {
        const Comp = COMPONENT_MAP[obj.type];
        if (!Comp) return null;
        return <Comp key={obj.id} {...obj} />;
      })}
    </>
  );
}
