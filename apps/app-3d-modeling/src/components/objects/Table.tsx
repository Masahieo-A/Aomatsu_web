"use client";

import { useRef } from "react";
import { Group } from "three";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { RoomObject } from "@/types/room";

const TOP_W = 1.2;
const TOP_H = 0.05;
const TOP_D = 0.6;
const LEG_R = 0.03;
const LEG_H = 0.4;

export function Table({ pos, rot, scl }: RoomObject) {
  const ref = useRef<Group>(null);
  const woodTex = useTexture("/textures/wood-table.jpg");
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(2, 2);

  return (
    <group ref={ref} position={[pos.x, pos.y, pos.z]} rotation={[rot.x, rot.y, rot.z]} scale={[scl.x, scl.y, scl.z]}>
      <mesh castShadow receiveShadow position={[0, LEG_H + TOP_H / 2, 0]}>
        <boxGeometry args={[TOP_W, TOP_H, TOP_D]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>
      {[
        [-TOP_W / 2 + LEG_R, LEG_H / 2, -TOP_D / 2 + LEG_R],
        [TOP_W / 2 - LEG_R, LEG_H / 2, -TOP_D / 2 + LEG_R],
        [-TOP_W / 2 + LEG_R, LEG_H / 2, TOP_D / 2 - LEG_R],
        [TOP_W / 2 - LEG_R, LEG_H / 2, TOP_D / 2 - LEG_R],
      ].map((p, i) => (
        <mesh key={i} castShadow position={p}>
          <cylinderGeometry args={[LEG_R, LEG_R, LEG_H, 8]} />
          <meshStandardMaterial map={woodTex} roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
