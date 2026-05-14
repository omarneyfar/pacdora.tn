import type { V2Point } from "../contracts/types";

export function sampleArc(center: V2Point, radius: number, startAngle: number, endAngle: number, segments = 8): V2Point[] {
  if (radius <= 0) {
    return [center];
  }

  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = startAngle + ((endAngle - startAngle) * index) / segments;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });
}
