"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * 木目風のプロシージャルテクスチャ（カンバスで生成）
 */
export function useWoodTexture(
  colorBase: string = "#c4a574",
  colorGrain: string = "#8b7355"
): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = colorBase;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = colorGrain;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 80; i++) {
      const y = (i / 80) * size + Math.random() * 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.02) * 3 + (Math.random() - 0.5) * 2);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }, [colorBase, colorGrain]);
}

/**
 * 壁用のノーマル風プロシージャル（微細な凹凸感）
 */
export function useWallNormalTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const x = (i % size) / size;
      const y = Math.floor(i / size) / size;
      const n = (Math.sin(x * 50) * Math.sin(y * 50) + 1) * 0.5 * 255;
      imageData.data[i * 4] = 128 + n * 0.2;
      imageData.data[i * 4 + 1] = 128 + n * 0.2;
      imageData.data[i * 4 + 2] = 255;
      imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }, []);
}

/**
 * ファブリック風のプロシージャル
 */
export function useFabricTexture(color: string = "#6b6b6b"): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    for (let i = 0; i < size; i += 4) {
      for (let j = 0; j < size; j += 4) {
        if ((i + j) % 8 === 0) ctx.fillRect(i, j, 2, 2);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }, [color]);
}
