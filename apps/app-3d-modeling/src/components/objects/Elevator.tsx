"use client";

import { useRef } from "react";
import { Group } from "three";
import type { RoomObject } from "@/types/room";

const W = 1.5;
const H = 2.2;
const D = 1.5;
const DOOR_GAP = 0.02;

export function Elevator({ pos, rot, scl }: RoomObject) {
  const ref = useRef<Group>(null);

  return (
    <group ref={ref} position={[pos.x, pos.y, pos.z]} rotation={[rot.x, rot.y, rot.z]} scale={[scl.x, scl.y, scl.z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color="#a0a0a0" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[-W / 4 - DOOR_GAP / 2, 0, D / 2 + 0.01]}>
        <boxGeometry args={[W / 2 - DOOR_GAP, H - 0.2, 0.05]} />
        <meshStandardMaterial color="#707070" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[W / 4 + DOOR_GAP / 2, 0, D / 2 + 0.01]}>
        <boxGeometry args={[W / 2 - DOOR_GAP, H - 0.2, 0.05]} />
        <meshStandardMaterial color="#707070" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[W / 2 + 0.08, 0.3, D / 2 + 0.03]}>
        <planeGeometry args={[0.15, 0.25]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}
