"use client";

import { useRef } from "react";
import { Group } from "three";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { RoomObject } from "@/types/room";

const W = 2;
const H = 0.8;
const D = 0.9;
const BACK_H = 0.5;
const ARM_H = 0.4;

export function Sofa({ pos, rot, scl }: RoomObject) {
  const ref = useRef<Group>(null);
  const fabricTex = useTexture("/textures/fabric.jpg");
  fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping;
  fabricTex.repeat.set(2, 2);

  return (
    <group ref={ref} position={[pos.x, pos.y, pos.z]} rotation={[rot.x, rot.y, rot.z]} scale={[scl.x, scl.y, scl.z]}>
      <mesh castShadow receiveShadow position={[0, ARM_H / 2 + 0.02, 0]}>
        <boxGeometry args={[W, ARM_H, D]} />
        <meshStandardMaterial map={fabricTex} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, ARM_H + BACK_H / 2, -D / 2 - 0.02]}>
        <boxGeometry args={[W, BACK_H, 0.15]} />
        <meshStandardMaterial map={fabricTex} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[-W / 2 - 0.05, ARM_H / 2, 0]}>
        <boxGeometry args={[0.1, ARM_H + 0.2, D + 0.1]} />
        <meshStandardMaterial map={fabricTex} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[W / 2 + 0.05, ARM_H / 2, 0]}>
        <boxGeometry args={[0.1, ARM_H + 0.2, D + 0.1]} />
        <meshStandardMaterial map={fabricTex} roughness={0.85} />
      </mesh>
    </group>
  );
}
