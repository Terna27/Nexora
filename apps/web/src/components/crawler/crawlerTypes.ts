export interface Vector2 {
  x: number;
  y: number;
}

export interface CrawlTargetInfo {
  id: string;
  label: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
  element: HTMLElement;
  lastScannedAt: number;
}

export interface LegJoints {
  base: Vector2;
  knee: Vector2;
  foot: Vector2;
  idealFoot: Vector2;
  isStepping: boolean;
  stepProgress: number; // 0..1
  stepStart: Vector2;
  stepEnd: Vector2;
  side: 'left' | 'right';
  legIndex: number;
}

export type CrawlerStatus =
  | 'IDLE_PATROL'
  | 'ACQUIRING_TARGET'
  | 'APPROACHING_TARGET'
  | 'SCANNING_LOCK'
  | 'DISENGAGING';

export interface CrawlerEngineConfig {
  bodyRadius: number;
  chassisColor: string;
  strokeColor: string;
  jointColor: string;
  scanColor: string;
  accentAmber: string;
  maxSpeed: number;
  scanDwellMs: number;
}

export interface CrawlerSnapshot {
  x: number;
  y: number;
  heading: number;
  status: CrawlerStatus;
  targetId: string | null;
  scanProgress: number; // 0..1
  fps: number;
  isPaused: boolean;
  isReducedMotion: boolean;
}
