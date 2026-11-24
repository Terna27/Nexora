export interface Vector2D {
  x: number;
  y: number;
}

export interface CrawlTarget {
  id: string;
  label?: string;
  category?: 'metric' | 'navigation' | 'cta' | 'output' | 'header';
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
  element?: HTMLElement;
}

export type LegIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface LegPosition {
  base: Vector2D; // where leg connects to body
  knee: Vector2D; // intermediate joint
  foot: Vector2D; // current foot position on canvas
  targetFoot: Vector2D; // ideal landing point
  isStepping: boolean;
  stepProgress: number; // 0 to 1
  phase: number;
}

export type CrawlerMode = 'IDLE_PATROL' | 'NAVIGATING_TO_TARGET' | 'SCANNING_TARGET' | 'DISENGAGING';

export interface CrawlerState {
  position: Vector2D;
  velocity: Vector2D;
  heading: number; // radians
  targetHeading: number;
  legs: LegPosition[];
  currentTarget: CrawlTarget | null;
  mode: CrawlerMode;
  scanProgress: number; // 0 to 1
  dwellTimeRemaining: number; // ms
  isPaused: boolean;
  reducedMotion: boolean;
}
