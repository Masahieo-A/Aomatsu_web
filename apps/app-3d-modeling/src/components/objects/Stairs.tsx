"use client";

import { useRef } from "react";
import { Group } from "three";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { RoomObject } from "@/types/room";

const STEP_W = 1.5;
const STEP_D = 0.25;
const STEP_H = 0.2;
const STEPS = 7;
const RAIL_R = 0.02;
const RAIL_H = 0.9;

export function Stairs({ pos, rot, scl }: RoomObject) {
  const ref = useRef<Group>(null);
  const woodTex = useTexture("/textures/wood-floor.jpg");
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(2, 2);

  return (
    <group ref={ref} position={[pos.x, pos.y, pos.z]} rotation={[rot.x, rot.y, rot.z]} scale={[scl.x, scl.y, scl.z]}>
      {Array.from({ length: STEPS }, (_, i) => (
        <mesh key={i} castShadow receiveShadow position={[0, (i + 0.5) * STEP_H, i * STEP_D]}>
          <boxGeometry args={[STEP_W, STEP_H, STEP_D]} />
          <meshStandardMaterial map={woodTex} roughness={0.6} />
        </mesh>
      ))}
      <mesh castShadow position={[-STEP_W / 2 - 0.05, STEPS * STEP_H / 2, (STEPS - 1) * STEP_D / 2]}>
        <cylinderGeometry args={[RAIL_R, RAIL_R, RAIL_H, 8]} />
        <meshStandardMaterial color="#505050" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[STEP_W / 2 + 0.05, STEPS * STEP_H / 2, (STEPS - 1) * STEP_D / 2]}>
        <cylinderGeometry args={[RAIL_R, RAIL_R, RAIL_H, 8]} />
        <meshStandardMaterial color="#505050" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}
