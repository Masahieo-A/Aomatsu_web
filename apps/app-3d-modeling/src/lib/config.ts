/**
 * スケール値のクランプ閾値（configで変更可能）
 */
export const SCALE_CLAMP = {
  min: -100,
  max: 100,
} as const;

/**
 * 各ルームの壁の座標範囲（GroundPlane計算用の初期値）
 * 実際はuseRoomBoundsで壁オブジェクトから動的計算
 */
export const ROOM_WALL_BOUNDS: Record<
  "room1" | "room2",
  { xMin: number; xMax: number; zMin: number; zMax: number }
> = {
  room1: { xMin: -9.25, xMax: 9, zMin: -8.75, zMax: 18 },
  room2: { xMin: -8.25, xMax: 8.75, zMin: -6.5, zMax: 8.25 },
};

/**
 * 全オブジェクトをカバーするための拡張マージン（ユニット）
 */
export const GROUND_PLANE_MARGIN = 2;

/**
 * Room1/2 の全オブジェクト範囲（床拡張用）
 */
export const ROOM_FULL_BOUNDS: Record<
  "room1" | "room2",
  { xMin: number; xMax: number; zMin: number; zMax: number }
> = {
  room1: { xMin: -15, xMax: 18.25, zMin: -278, zMax: 19.5 },
  room2: { xMin: -8.75, xMax: 9.5, zMin: -10.25, zMax: 12.75 },
};
