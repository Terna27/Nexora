import { CrawlerPhysics } from './crawlerPhysics';
import { CrawlTargetInfo } from './crawlerTypes';

export class CrawlerRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(
    physics: CrawlerPhysics,
    currentTarget: CrawlTargetInfo | null,
    scanProgress: number,
    isReducedMotion: boolean = false
  ) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Render target scanning HUD lock-on effect if latching/approaching
    if (currentTarget) {
      this.drawTargetHUD(currentTarget, physics.pos, physics.status, scanProgress, isReducedMotion);
    }

    // 2. Render Crawler Legs (8 articulated mechanical legs)
    this.drawLegs(physics);

    // 3. Render Chassis and Cybernetic Body
    this.drawChassis(physics);

    ctx.restore();
  }

  private drawLegs(physics: CrawlerPhysics) {
    const ctx = this.ctx;

    for (let i = 0; i < physics.legs.length; i++) {
      const leg = physics.legs[i];

      // Leg segment styling: thin neon strokes, cybernetic joints
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = leg.isStepping ? 'rgba(0, 240, 255, 0.95)' : 'rgba(0, 240, 255, 0.65)';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Base to Knee (Femur)
      ctx.beginPath();
      ctx.moveTo(leg.base.x, leg.base.y);
      ctx.lineTo(leg.knee.x, leg.knee.y);
      ctx.stroke();

      // Knee to Foot (Tibia)
      ctx.beginPath();
      ctx.moveTo(leg.knee.x, leg.knee.y);
      ctx.lineTo(leg.foot.x, leg.foot.y);
      ctx.stroke();

      // Knee Joint Indicator (neon magenta dot)
      ctx.fillStyle = '#FF2A85';
      ctx.beginPath();
      ctx.arc(leg.knee.x, leg.knee.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Foot Contact Pin (amber or cyan dot)
      ctx.fillStyle = leg.isStepping ? '#FFB800' : 'rgba(0, 240, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(leg.foot.x, leg.foot.y, leg.isStepping ? 2.2 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawChassis(physics: CrawlerPhysics) {
    const ctx = this.ctx;
    const { x, y } = physics.pos;
    const h = physics.heading;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(h);

    // Outer Angular Hexagonal Armor
    ctx.beginPath();
    const sides = 6;
    const r = physics.bodyRadius;
    for (let s = 0; s < sides; s++) {
      const angle = (s * Math.PI * 2) / sides;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Fill void obsidian
    ctx.fillStyle = '#08090D';
    ctx.fill();

    // High contrast neon border
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#00F0FF';
    ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Inner Core Reactor (Magenta / Amber pulse)
    const isScanning = physics.status === 'SCANNING_LOCK';
    ctx.fillStyle = isScanning ? '#FF2A85' : '#00F0FF';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Sensor Array / Front Optics
    ctx.fillStyle = isScanning ? '#FFB800' : '#00F0FF';
    ctx.beginPath();
    ctx.arc(r * 0.7, -3, 1.8, 0, Math.PI * 2);
    ctx.arc(r * 0.7, 3, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Technical cross lines on body
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, 0);
    ctx.lineTo(r * 0.5, 0);
    ctx.moveTo(0, -r * 0.5);
    ctx.lineTo(0, r * 0.5);
    ctx.stroke();

    ctx.restore();
  }

  private drawTargetHUD(
    target: CrawlTargetInfo,
    crawlerPos: { x: number; y: number },
    status: string,
    progress: number,
    isReducedMotion: boolean
  ) {
    const ctx = this.ctx;
    const rect = target.rect;
    const pad = 8;

    const tLeft = rect.left - pad;
    const tTop = rect.top - pad;
    const tWidth = rect.width + pad * 2;
    const tHeight = rect.height + pad * 2;
    const centerX = rect.centerX;
    const centerY = rect.centerY;

    ctx.save();

    // 1. Laser Connecting Vector Trace Line from Crawler to Target
    ctx.beginPath();
    ctx.moveTo(crawlerPos.x, crawlerPos.y);
    ctx.lineTo(centerX, centerY);
    ctx.strokeStyle = status === 'SCANNING_LOCK' ? 'rgba(255, 42, 133, 0.45)' : 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Corner Bracket Reticles
    const cornerLength = Math.min(18, tWidth * 0.2, tHeight * 0.2);
    ctx.strokeStyle = status === 'SCANNING_LOCK' ? '#FF2A85' : '#00F0FF';
    ctx.lineWidth = 1.5;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(tLeft, tTop + cornerLength);
    ctx.lineTo(tLeft, tTop);
    ctx.lineTo(tLeft + cornerLength, tTop);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(tLeft + tWidth - cornerLength, tTop);
    ctx.lineTo(tLeft + tWidth, tTop);
    ctx.lineTo(tLeft + tWidth, tTop + cornerLength);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(tLeft, tTop + tHeight - cornerLength);
    ctx.lineTo(tLeft, tTop + tHeight);
    ctx.lineTo(tLeft + cornerLength, tTop + tHeight);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(tLeft + tWidth - cornerLength, tTop + tHeight);
    ctx.lineTo(tLeft + tWidth, tTop + tHeight);
    ctx.lineTo(tLeft + tWidth, tTop + tHeight - cornerLength);
    ctx.stroke();

    // 3. Central Scanning Beam (Sweeps vertically when locked)
    if (status === 'SCANNING_LOCK' && !isReducedMotion) {
      const beamY = tTop + tHeight * progress;
      const grad = ctx.createLinearGradient(tLeft, beamY, tLeft + tWidth, beamY);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
      grad.addColorStop(0.5, 'rgba(255, 42, 133, 0.6)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(tLeft, beamY - 2, tWidth, 4);

      // Scanning overlay glow
      ctx.fillStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.fillRect(tLeft, tTop, tWidth, tHeight);
    }

    // 4. Technical HUD Metadata Labels
    ctx.font = '10px "IBM Plex Mono", "JetBrains Mono", monospace';
    ctx.fillStyle = '#00F0FF';
    const targetLabel = `[SCAN_NODE: ${target.id.toUpperCase()}]`;
    ctx.fillText(targetLabel, tLeft, Math.max(14, tTop - 6));

    if (status === 'SCANNING_LOCK') {
      ctx.fillStyle = '#FFB800';
      const pct = Math.floor(progress * 100);
      const telemetry = `FREQ: 98.4GHz | LAT: 0.8ms | SYNC: ${pct}%`;
      ctx.fillText(telemetry, tLeft, tTop + tHeight + 14);

      // Coordinate Crosshairs
      ctx.strokeStyle = 'rgba(255, 184, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 8, centerY);
      ctx.lineTo(centerX + 8, centerY);
      ctx.moveTo(centerX, centerY - 8);
      ctx.lineTo(centerX, centerY + 8);
      ctx.stroke();
    }

    ctx.restore();
  }
}
