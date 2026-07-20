"use client";

import { useRef } from "react";
import { Group } from "three";
import type { RoomObject } from "@/types/room";

const W = 1.2;
const H = 1.0;
const D = 0.08;
const FRAME_THICK = 0.04;

export function Window({ pos, rot, scl }: RoomObject) {
  const ref = useRef<Group>(null);

  return (
    <group ref={ref} position={[pos.x, pos.y, pos.z]} rotation={[rot.x, rot.y, rot.z]} scale={[scl.x, scl.y, scl.z]}>
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[W + FRAME_THICK * 2, H + FRAME_THICK * 2, D]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh receiveShadow position={[0, 0, D / 2 + 0.001]}>
        <planeGeometry args={[W, H]} />
        <meshPhysicalMaterial
          color="#aaddff"
          transmission={0.9}
          roughness={0.05}
          thickness={0.1}
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  );
}
