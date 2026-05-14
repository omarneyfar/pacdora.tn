import type { V2Point } from "../contracts/types";

export function point(x: number, y: number): V2Point {
  return { x, y };
}

export function add(a: V2Point, b: V2Point): V2Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: V2Point, b: V2Point): V2Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(vector: V2Point, amount: number): V2Point {
  return { x: vector.x * amount, y: vector.y * amount };
}

export function offset(pointValue: V2Point, vector: V2Point, amount: number): V2Point {
  return add(pointValue, scale(vector, amount));
}

export function distance(a: V2Point, b: V2Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: V2Point, b: V2Point): V2Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function normalize(vector: V2Point): V2Point {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 0.000001) {
    throw new Error("Cannot normalize a zero-length vector.");
  }
  return { x: vector.x / length, y: vector.y / length };
}

export function isFinitePoint(pointValue: V2Point): boolean {
  return Number.isFinite(pointValue.x) && Number.isFinite(pointValue.y);
}

export function formatPoint(pointValue: V2Point): string {
  return `${round(pointValue.x)},${round(pointValue.y)}`;
}

export function round(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
