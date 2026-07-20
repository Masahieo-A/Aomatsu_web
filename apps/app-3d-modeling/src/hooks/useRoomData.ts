"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { getDatabaseSafe } from "@/lib/firebase";
import type { RoomData, RoomObject, ObjectType } from "@/types/room";
import { sanitizeScale } from "@/lib/sanitize";

const VALID_TYPES: ObjectType[] = [
  "wall",
  "floor",
  "table",
  "chair",
  "door",
  "window",
  "plant",
  "sofa",
  "stairs",
  "elevator",
];

function parseRoomData(data: unknown): RoomObject[] {
  if (!data || typeof data !== "object") return [];
  const raw = data as Record<string, { type: string; pos?: unknown; rot?: unknown; scl?: unknown }>;
  return Object.entries(raw).map(([id, obj]) => {
    const pos = obj.pos && typeof obj.pos === "object" && "x" in obj.pos
      ? { x: Number((obj.pos as { x: number }).x), y: Number((obj.pos as unknown as { y: number }).y), z: Number((obj.pos as unknown as { z: number }).z) }
      : { x: 0, y: 0, z: 0 };
    const rot = obj.rot && typeof obj.rot === "object" && "x" in obj.rot
      ? { x: Number((obj.rot as { x: number }).x), y: Number((obj.rot as unknown as { y: number }).y), z: Number((obj.rot as unknown as { z: number }).z) }
      : { x: 0, y: 0, z: 0 };
    const sclRaw = obj.scl && typeof obj.scl === "object" && "x" in obj.scl
      ? { x: Number((obj.scl as { x: number }).x), y: Number((obj.scl as unknown as { y: number }).y), z: Number((obj.scl as unknown as { z: number }).z) }
      : { x: 1, y: 1, z: 1 };
    const scl = sanitizeScale(sclRaw);
    const type = VALID_TYPES.includes(obj.type as ObjectType) ? (obj.type as ObjectType) : "wall";
    return { id, type, pos, rot, scl };
  });
}

export function useRoomData(roomId: "room1" | "room2") {
  const [objects, setObjects] = useState<RoomObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getDatabaseSafe();
    if (!db) {
      setLoading(false);
      setError("Firebaseが設定されていません。.env.local にNEXT_PUBLIC_FIREBASE_*を設定してください。");
      return;
    }
    const path = `/rooms/${roomId}/objects`;
    const dbRef = ref(db, path);
    const unsub = onValue(
      dbRef,
      (snapshot) => {
        const val = snapshot.val();
        setObjects(parseRoomData(val));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [roomId]);

  return { objects, loading, error };
}

export function useAllRoomsData() {
  const [rooms, setRooms] = useState<{ room1: RoomObject[]; room2: RoomObject[] }>({
    room1: [],
    room2: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getDatabaseSafe();
    if (!db) {
      setLoading(false);
      setError("Firebaseが設定されていません。");
      return;
    }
    const r1 = ref(db, "/rooms/room1/objects");
    const r2 = ref(db, "/rooms/room2/objects");
    let count = 0;
    const done = () => {
      count++;
      if (count >= 2) setLoading(false);
    };
    const un1 = onValue(r1, (s) => {
      setRooms((prev) => ({ ...prev, room1: parseRoomData(s.val()) }));
      done();
    }, (e) => { setError(e.message); done(); });
    const un2 = onValue(r2, (s) => {
      setRooms((prev) => ({ ...prev, room2: parseRoomData(s.val()) }));
      done();
    }, (e) => { setError(e.message); done(); });
    return () => {
      un1();
      un2();
    };
  }, []);

  return { rooms, loading, error };
}
