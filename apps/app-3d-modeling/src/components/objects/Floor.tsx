"use client";

import { useRef } from "react";
import { Mesh } from "three";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { RoomObject } from "@/types/room";

const WIDTH = 2;
const HEIGHT = 0.05;
const DEPTH = 2;

export function Floor({ pos, rot, scl }: RoomObject) {
  const ref = useRef<Mesh>(null);
  const woodTex = useTexture("/textures/wood-floor.jpg");
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(4, 4);

  return (
    <group position={[pos.x, pos.y, pos.z]} rotation={[rot.x, rot.y, rot.z]} scale={[scl.x, scl.y, scl.z]}>
      <mesh ref={ref} castShadow receiveShadow>
        <boxGeometry args={[WIDTH, HEIGHT, DEPTH]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>
    </group>
  );
}
