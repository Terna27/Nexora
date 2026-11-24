import { Vector2, LegJoints, CrawlerStatus } from './crawlerTypes';

export class CrawlerPhysics {
  // Body state
  pos: Vector2 = { x: 300, y: 300 };
  vel: Vector2 = { x: 0, y: 0 };
  heading: number = 0; // in radians
  targetHeading: number = 0;
  angularVelocity: number = 0;

  // Legs state (4 left, 4 right)
  legs: LegJoints[] = [];

  // Behavior
  status: CrawlerStatus = 'IDLE_PATROL';
  scanTimer: number = 0;
  scanDuration: number = 2400; // ms
  idleWanderTimer: number = 0;
  patrolWaypoint: Vector2 = { x: 400, y: 400 };

  // Gait phase timer
  gaitClock: number = 0;

  // Physics constants
  readonly bodyRadius = 14;
  readonly coxaLength = 16;
  readonly femurLength = 26;
  readonly tibiaLength = 32;
  readonly maxSpeed = 3.6;
  readonly strideDistance = 28;

  constructor(initialX: number = 300, initialY: number = 300) {
    this.pos = { x: initialX, y: initialY };
    this.initLegs();
  }

  private initLegs() {
    this.legs = [];
    // 8 legs: 4 left (0, 1, 2, 3), 4 right (4, 5, 6, 7)
    // Angles around chassis relative to heading
    const leftAngles = [-1.8, -1.1, -0.6, -0.15];
    const rightAngles = [1.8, 1.1, 0.6, 0.15];

    for (let i = 0; i < 4; i++) {
      const angle = leftAngles[i];
      const base: Vector2 = {
        x: this.pos.x + Math.cos(angle) * this.bodyRadius,
        y: this.pos.y + Math.sin(angle) * this.bodyRadius,
      };
      const idealFoot: Vector2 = {
        x: base.x + Math.cos(angle) * (this.femurLength + this.tibiaLength * 0.7),
        y: base.y + Math.sin(angle) * (this.femurLength + this.tibiaLength * 0.7),
      };
      this.legs.push({
        base,
        knee: { ...idealFoot },
        foot: { ...idealFoot },
        idealFoot: { ...idealFoot },
        isStepping: false,
        stepProgress: 0,
        stepStart: { ...idealFoot },
        stepEnd: { ...idealFoot },
        side: 'left',
        legIndex: i,
      });
    }

    for (let i = 0; i < 4; i++) {
      const angle = rightAngles[i];
      const base: Vector2 = {
        x: this.pos.x + Math.cos(angle) * this.bodyRadius,
        y: this.pos.y + Math.sin(angle) * this.bodyRadius,
      };
      const idealFoot: Vector2 = {
        x: base.x + Math.cos(angle) * (this.femurLength + this.tibiaLength * 0.7),
        y: base.y + Math.sin(angle) * (this.femurLength + this.tibiaLength * 0.7),
      };
      this.legs.push({
        base,
        knee: { ...idealFoot },
        foot: { ...idealFoot },
        idealFoot: { ...idealFoot },
        isStepping: false,
        stepProgress: 0,
        stepStart: { ...idealFoot },
        stepEnd: { ...idealFoot },
        side: 'right',
        legIndex: i + 4,
      });
    }
  }

  /**
   * 2-bone Inverse Kinematics for a leg:
   * Given base (hip) and foot (target on ground), computes knee position with natural outward flexion.
   */
  private solveIK(base: Vector2, foot: Vector2, isLeft: boolean): Vector2 {
    const dx = foot.x - base.x;
    const dy = foot.y - base.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const l1 = this.femurLength;
    const l2 = this.tibiaLength;

    // Clamped distance to avoid singularity
    const d = Math.max(10, Math.min(dist, l1 + l2 - 2));

    // Law of cosines for angle at base
    const cosAngle1 = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle1));
    const angle1 = Math.acos(clampedCos);

    const baseAngle = Math.atan2(dy, dx);
    const bendSign = isLeft ? -1 : 1;
    const kneeAngle = baseAngle + bendSign * angle1;

    return {
      x: base.x + Math.cos(kneeAngle) * l1,
      y: base.y + Math.sin(kneeAngle) * l1,
    };
  }

  update(
    deltaMs: number,
    viewport: { width: number; height: number },
    targetPos: Vector2 | null,
    mousePos: Vector2 | null
  ) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.gaitClock += dt * 4;

    // Determine target location to move towards
    let destination: Vector2 = this.patrolWaypoint;

    if (this.status === 'SCANNING_LOCK') {
      // Stationary scanning
      this.scanTimer += deltaMs;
      // Slight stabilization hover
      this.vel.x *= 0.8;
      this.vel.y *= 0.8;
    } else if (targetPos) {
      destination = targetPos;
      const distToTarget = Math.hypot(destination.x - this.pos.x, destination.y - this.pos.y);
      if (distToTarget < 55) {
        this.status = 'SCANNING_LOCK';
        this.scanTimer = 0;
      } else {
        this.status = 'APPROACHING_TARGET';
      }
    } else {
      // Idle patrol behavior
      this.idleWanderTimer -= deltaMs;
      if (this.idleWanderTimer <= 0) {
        this.idleWanderTimer = 4000 + Math.random() * 3000;
        this.patrolWaypoint = {
          x: 100 + Math.random() * (viewport.width - 200),
          y: 100 + Math.random() * (viewport.height - 200),
        };
      }
      destination = this.patrolWaypoint;
      this.status = 'IDLE_PATROL';
    }

    // Reaction to nearby cursor (subtle avoidance or interest)
    if (mousePos && this.status !== 'SCANNING_LOCK') {
      const mouseDist = Math.hypot(mousePos.x - this.pos.x, mousePos.y - this.pos.y);
      if (mouseDist < 120 && mouseDist > 5) {
        // Sidestep cursor gently
        const repelX = (this.pos.x - mousePos.x) / mouseDist;
        const repelY = (this.pos.y - mousePos.y) / mouseDist;
        this.vel.x += repelX * 1.5;
        this.vel.y += repelY * 1.5;
      }
    }

    // Move toward destination if not scanning
    if (this.status !== 'SCANNING_LOCK') {
      const dx = destination.x - this.pos.x;
      const dy = destination.y - this.pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 15) {
        this.targetHeading = Math.atan2(dy, dx);
        const speed = Math.min(this.maxSpeed, dist * 0.08);
        this.vel.x += (Math.cos(this.targetHeading) * speed - this.vel.x) * 0.12;
        this.vel.y += (Math.sin(this.targetHeading) * speed - this.vel.y) * 0.12;
      } else {
        this.vel.x *= 0.85;
        this.vel.y *= 0.85;
      }

      // Smooth heading rotation
      let angleDiff = this.targetHeading - this.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.heading += angleDiff * 0.1;

      // Update position
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;

      // Clamp within viewport
      this.pos.x = Math.max(40, Math.min(viewport.width - 40, this.pos.x));
      this.pos.y = Math.max(40, Math.min(viewport.height - 40, this.pos.y));
    }

    // Update 8 legs with ripple / alternating tetrapod gait
    const leftAngles = [-1.8, -1.1, -0.6, -0.15];
    const rightAngles = [1.8, 1.1, 0.6, 0.15];

    // Alternating leg groups: Group A (0, 2, 5, 7) and Group B (1, 3, 4, 6)
    const legPhaseOffsets = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5, Math.PI, 0, Math.PI * 1.5, Math.PI * 0.5];

    for (let i = 0; i < 8; i++) {
      const leg = this.legs[i];
      const isLeft = i < 4;
      const relAngle = isLeft ? leftAngles[i] : rightAngles[i - 4];
      const worldAngle = this.heading + relAngle;

      // Base joint on body
      leg.base = {
        x: this.pos.x + Math.cos(worldAngle) * this.bodyRadius,
        y: this.pos.y + Math.sin(worldAngle) * this.bodyRadius,
      };

      // Ideal foot placement ahead in travel direction
      const reach = this.femurLength + this.tibiaLength * 0.65;
      const leadX = this.vel.x * 6;
      const leadY = this.vel.y * 6;

      leg.idealFoot = {
        x: leg.base.x + Math.cos(worldAngle) * reach + leadX,
        y: leg.base.y + Math.sin(worldAngle) * reach + leadY,
      };

      const footDistToIdeal = Math.hypot(leg.idealFoot.x - leg.foot.x, leg.idealFoot.y - leg.foot.y);

      // Check if leg should step
      if (!leg.isStepping) {
        const canStepInGaitCycle = Math.sin(this.gaitClock + legPhaseOffsets[i]) > 0.1;
        if (footDistToIdeal > this.strideDistance && canStepInGaitCycle) {
          leg.isStepping = true;
          leg.stepProgress = 0;
          leg.stepStart = { ...leg.foot };
          leg.stepEnd = { ...leg.idealFoot };
        }
      }

      if (leg.isStepping) {
        leg.stepProgress += dt * 6.5; // step speed
        if (leg.stepProgress >= 1) {
          leg.stepProgress = 1;
          leg.isStepping = false;
          leg.foot = { ...leg.stepEnd };
        } else {
          // Smooth parabolic step with height elevation
          const t = leg.stepProgress;
          // Smoothstep interpolation
          const smoothT = t * t * (3 - 2 * t);
          leg.foot.x = leg.stepStart.x + (leg.stepEnd.x - leg.stepStart.x) * smoothT;
          leg.foot.y = leg.stepStart.y + (leg.stepEnd.y - leg.stepStart.y) * smoothT;
        }
      }

      // Solve inverse kinematics for knee
      leg.knee = this.solveIK(leg.base, leg.foot, isLeft);
    }
  }
}
