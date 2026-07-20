"use client";

import { useRef } from "react";
import { Group } from "three";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { RoomObject } from "@/types/room";

const PANEL_W = 1;
const PANEL_H = 2;
const PANEL_D = 0.08;
const FRAME_THICK = 0.04;
const KNOB_R = 0.03;

export function Door({ pos, rot, scl }: RoomObject) {
  const ref = useRef<Group>(null);
  const woodTex = useTexture("/textures/wood-door.jpg");
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(2, 4);

  return (
    <group ref={ref} position={[pos.x, pos.y, pos.z]} rotation={[rot.x, rot.y, rot.z]} scale={[scl.x, scl.y, scl.z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[PANEL_W, PANEL_H, PANEL_D]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[PANEL_W / 2 - FRAME_THICK / 2, 0, PANEL_D / 2 + 0.01]}>
        <boxGeometry args={[FRAME_THICK, PANEL_H + 0.1, FRAME_THICK]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[-PANEL_W / 2 + KNOB_R * 2, 0, PANEL_D / 2 + 0.02]}>
        <sphereGeometry args={[KNOB_R, 12, 12]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}
