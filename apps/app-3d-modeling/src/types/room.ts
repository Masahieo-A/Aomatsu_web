export type ObjectType =
  | "wall"
  | "floor"
  | "table"
  | "chair"
  | "door"
  | "window"
  | "plant"
  | "sofa"
  | "stairs"
  | "elevator";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface RoomObject {
  id: string;
  type: ObjectType;
  pos: Vec3;
  rot: Vec3;
  scl: Vec3;
}

export interface RoomData {
  objects: Record<
    string,
    {
      type: string;
      pos: Vec3;
      rot: Vec3;
      scl: Vec3;
    }
  >;
}

export type RoomId = "room1" | "room2";
