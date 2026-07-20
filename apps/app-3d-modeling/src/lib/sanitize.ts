import type { Vec3 } from "@/types/room";
import { SCALE_CLAMP } from "./config";

export function sanitizeScale(scl: Vec3): Vec3 {
  const clamp = (v: number) =>
    Math.max(SCALE_CLAMP.min, Math.min(SCALE_CLAMP.max, v));

  const sanitized: Vec3 = {
    x: clamp(scl.x),
    y: clamp(scl.y),
    z: clamp(scl.z),
  };

  if (
    sanitized.x !== scl.x ||
    sanitized.y !== scl.y ||
    sanitized.z !== scl.z
  ) {
    console.warn("スケール値がクランプされました:", {
      original: scl,
      sanitized,
    });
  }

  return sanitized;
}
