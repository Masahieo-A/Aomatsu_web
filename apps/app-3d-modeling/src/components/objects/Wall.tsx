"use client";

import { useRef } from "react";
import * as THREE from "three";
import { Mesh } from "three";
import { useTexture } from "@react-three/drei";
import type { RoomObject } from "@/types/room";

const WIDTH = 2;
const HEIGHT = 1.5;
const DEPTH = 0.1;

export function Wall({ pos, rot, scl }: RoomObject) {
  const ref = useRef<Mesh>(null);
  const wallNormal = useTexture("/textures/wall-normal.jpg");
  wallNormal.wrapS = wallNormal.wrapT = THREE.RepeatWrapping;
  wallNormal.repeat.set(4, 4);

  return (
    <group position={[pos.x, pos.y, pos.z]} rotation={[rot.x, rot.y, rot.z]} scale={[scl.x, scl.y, scl.z]}>
      <mesh ref={ref} castShadow receiveShadow>
        <boxGeometry args={[WIDTH, HEIGHT, DEPTH]} />
        <meshStandardMaterial
          color="#F5F5F0"
          roughness={0.9}
          normalMap={wallNormal}
          normalMapType={THREE.TangentSpaceNormalMap}
        />
      </mesh>
    </group>
  );
}
