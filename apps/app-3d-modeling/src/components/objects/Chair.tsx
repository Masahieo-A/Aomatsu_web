"use client";

import { useRef } from "react";
import { Group } from "three";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { RoomObject } from "@/types/room";

const SEAT_W = 0.5;
const SEAT_D = 0.5;
const SEAT_H = 0.05;
const BACK_W = 0.5;
const BACK_H = 0.45;
const BACK_D = 0.03;
const LEG_R = 0.02;
const LEG_H = 0.4;

export function Chair({ pos, rot, scl }: RoomObject) {
  const ref = useRef<Group>(null);
  const fabricTex = useTexture("/textures/fabric.jpg");
  fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping;
  fabricTex.repeat.set(2, 2);

  return (
    <group ref={ref} position={[pos.x, pos.y, pos.z]} rotation={[rot.x, rot.y, rot.z]} scale={[scl.x, scl.y, scl.z]}>
      <mesh castShadow receiveShadow position={[0, LEG_H + SEAT_H / 2, 0]}>
        <boxGeometry args={[SEAT_W, SEAT_H, SEAT_D]} />
        <meshStandardMaterial map={fabricTex} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, LEG_H + SEAT_H + BACK_H / 2, -SEAT_D / 2 - BACK_D / 2]}>
        <boxGeometry args={[BACK_W, BACK_H, BACK_D]} />
        <meshStandardMaterial map={fabricTex} roughness={0.8} />
      </mesh>
      {[
        [-SEAT_W / 2 + LEG_R, LEG_H / 2, -SEAT_D / 2 + LEG_R],
        [SEAT_W / 2 - LEG_R, LEG_H / 2, -SEAT_D / 2 + LEG_R],
        [-SEAT_W / 2 + LEG_R, LEG_H / 2, SEAT_D / 2 - LEG_R],
        [SEAT_W / 2 - LEG_R, LEG_H / 2, SEAT_D / 2 - LEG_R],
      ].map((p, i) => (
        <mesh key={i} castShadow position={p}>
          <cylinderGeometry args={[LEG_R, LEG_R, LEG_H, 8]} />
          <meshStandardMaterial color="#404040" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
