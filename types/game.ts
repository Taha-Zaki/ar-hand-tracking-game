
export interface Point {
  x: number;
  y: number;
  z?: number;
}

export interface Target {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  size: number;
  color: string;
  rotation: [number, number, number];
}

export interface Particle {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  life: number;
  color: string;
}

export interface HandData {
  indexTip: Point;
  thumbTip: Point;
  isPinching: boolean;
  rawLandmarks: any[];
}
