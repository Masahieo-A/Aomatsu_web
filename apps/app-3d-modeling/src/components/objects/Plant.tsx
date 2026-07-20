"use client";

import { useRef } from "react";
import { Group } from "three";
import type { RoomObject } from "@/types/room";

const POT_R = 0.2;
const POT_H = 0.35;
const LEAF_R = 0.25;
const LEAF_Y = 0.5;

export function Plant({ pos, rot, scl }: RoomObject) {
  const ref = useRef<Group>(null);
  const green = "#3A7D44";

  return (
    <group ref={ref} position={[pos.x, pos.y, pos.z]} rotation={[rot.x, rot.y, rot.z]} scale={[scl.x, scl.y, scl.z]}>
      <mesh castShadow position={[0, POT_H / 2, 0]}>
        <cylinderGeometry args={[POT_R, POT_R * 0.9, POT_H, 16]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>
      {[0, 0.15, -0.1, 0.2, -0.15].map((dx, i) => (
        <mesh key={i} castShadow position={[dx, POT_H + LEAF_Y + i * 0.05, (i % 2) * 0.1]}>
          <sphereGeometry args={[LEAF_R - i * 0.02, 8, 8]} />
          <meshStandardMaterial color={green} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
