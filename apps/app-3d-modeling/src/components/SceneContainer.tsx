"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { EffectComposer, SSAO, Bloom, ToneMapping } from "@react-three/postprocessing";
import * as THREE from "three";
import { Scene } from "./Scene";
import type { RoomObject } from "@/types/room";
import type { RoomBounds } from "@/hooks/useRoomBounds";

const CREAM = "#f5f0e6";

function CreamBackground() {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(CREAM);
  }, [scene]);
  return null;
}

interface SceneContainerProps {
  roomId: "room1" | "room2";
  objects: RoomObject[];
  bounds: RoomBounds;
}

export function SceneContainer({ roomId, objects, bounds }: SceneContainerProps) {
  return (
    <div className={`absolute inset-0`} style={{ background: CREAM }}>
      <Canvas
        shadows
        camera={{ position: [15, 18, 15], fov: 45, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
      >
        <CreamBackground />
        <Suspense fallback={null}>
          <Scene roomId={roomId} objects={objects} bounds={bounds} />
          <OrbitControls
            makeDefault
            minDistance={5}
            maxDistance={150}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2 - 0.05}
            enablePan
            target={[bounds.centerX, 0, bounds.centerZ]}
          />
          <Environment preset="apartment" />
          <EffectComposer>
            <SSAO
              radius={0.4}
              intensity={50}
              luminanceInfluence={0.4}
              color={new THREE.Color("black")}
              bias={0.02}
              worldDistanceThreshold={100}
              worldDistanceFalloff={5}
              worldProximityThreshold={0.4}
              worldProximityFalloff={0.1}
            />
            <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.9} intensity={0.3} />
            <ToneMapping />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
