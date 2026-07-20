"use client";

import { useRef } from "react";
import { Mesh } from "three";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { RoomBounds } from "@/hooks/useRoomBounds";

const FLOOR_HEIGHT = 0.01;

interface GroundPlaneProps {
  bounds: RoomBounds;
}

export function GroundPlane({ bounds }: GroundPlaneProps) {
  const ref = useRef<Mesh>(null);
  const woodTex = useTexture("/textures/wood-floor.jpg");
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(8, 8);

  return (
    <mesh
      ref={ref}
      position={[bounds.centerX, -FLOOR_HEIGHT / 2, bounds.centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[bounds.widthX, bounds.widthZ]} />
      <meshStandardMaterial map={woodTex} roughness={0.6} />
    </mesh>
  );
}
