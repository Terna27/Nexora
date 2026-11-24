'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CrawlerPhysics } from './crawlerPhysics';
import { CrawlerRenderer } from './crawlerRenderer';
import { CrawlerTargetManager } from './crawlerTargets';
import { CrawlTargetInfo, CrawlerSnapshot } from './crawlerTypes';

export function useCrawlerEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const physicsRef = useRef<CrawlerPhysics | null>(null);
  const rendererRef = useRef<CrawlerRenderer | null>(null);
  const targetManagerRef = useRef<CrawlerTargetManager>(new CrawlerTargetManager());

  const currentTargetRef = useRef<CrawlTargetInfo | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [snapshot, setSnapshot] = useState<CrawlerSnapshot>({
    x: 0,
    y: 0,
    heading: 0,
    status: 'IDLE_PATROL',
    targetId: null,
    scanProgress: 0,
    fps: 60,
    isPaused: false,
    isReducedMotion: false,
  });

  // Check user OS reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const toggleReducedMotion = useCallback(() => {
    setReducedMotion((prev) => !prev);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      targetManagerRef.current.refreshTargets(true);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize physics & renderer
    if (!physicsRef.current) {
      physicsRef.current = new CrawlerPhysics(window.innerWidth * 0.45, window.innerHeight * 0.35);
    }
    rendererRef.current = new CrawlerRenderer(ctx);

    // Event listeners: Pointer / Cursor Awareness
    const handlePointerMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerLeave = () => {
      mousePosRef.current = null;
    };

    const handleScroll = () => {
      targetManagerRef.current.updateScrollPositions();
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial target scan
    targetManagerRef.current.refreshTargets(true);

    let frameCount = 0;
    let fpsTimer = performance.now();
    let currentFps = 60;

    // Animation Loop
    const renderLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaMs = Math.min(timestamp - lastTimeRef.current, 60);
      lastTimeRef.current = timestamp;

      frameCount++;
      if (timestamp - fpsTimer > 1000) {
        currentFps = Math.round((frameCount * 1000) / (timestamp - fpsTimer));
        frameCount = 0;
        fpsTimer = timestamp;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;
      const physics = physicsRef.current!;
      const renderer = rendererRef.current!;
      const targetMgr = targetManagerRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (!isPaused) {
        // Target management
        if (physics.status === 'SCANNING_LOCK' && currentTargetRef.current) {
          const progress = Math.min(1, physics.scanTimer / physics.scanDuration);

          if (progress >= 1) {
            // Scan complete: highlight element with glitch effect and disengage
            targetMgr.applyGlitchHighlight(currentTargetRef.current.element);
            targetMgr.markScanned(currentTargetRef.current.id);
            currentTargetRef.current = null;
            physics.status = 'DISENGAGING';
            physics.scanTimer = 0;
          }
        } else if (!currentTargetRef.current || physics.status === 'DISENGAGING') {
          // Find next target
          targetMgr.refreshTargets();
          const next = targetMgr.selectNextTarget(physics.pos, { width, height });
          if (next) {
            currentTargetRef.current = next;
            physics.status = 'APPROACHING_TARGET';
          }
        }

        // Target coordinates
        const targetCoord = currentTargetRef.current
          ? {
              x: currentTargetRef.current.rect.centerX,
              y: currentTargetRef.current.rect.centerY,
            }
          : null;

        // Step physics
        physics.update(deltaMs, { width, height }, targetCoord, mousePosRef.current);

        // Render
        const scanProgress =
          physics.status === 'SCANNING_LOCK' ? Math.min(1, physics.scanTimer / physics.scanDuration) : 0;

        renderer.render(physics, currentTargetRef.current, scanProgress, reducedMotion);

        // Update snapshot periodically
        if (frameCount % 6 === 0) {
          setSnapshot({
            x: Math.round(physics.pos.x),
            y: Math.round(physics.pos.y),
            heading: parseFloat(physics.heading.toFixed(2)),
            status: physics.status,
            targetId: currentTargetRef.current?.id ?? null,
            scanProgress: parseFloat(scanProgress.toFixed(2)),
            fps: currentFps,
            isPaused,
            isReducedMotion: reducedMotion,
          });
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isPaused, reducedMotion]);

  return {
    canvasRef,
    snapshot,
    isPaused,
    reducedMotion,
    togglePause,
    toggleReducedMotion,
  };
}
