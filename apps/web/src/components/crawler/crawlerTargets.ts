import { CrawlTargetInfo } from './crawlerTypes';

export class CrawlerTargetManager {
  private targets: Map<string, CrawlTargetInfo> = new Map();
  private lastQueried: number = 0;
  private queryCooldownMs: number = 1000; // Throttle DOM queries
  private scrollYOffset: number = 0;

  /**
   * Scans DOM for [data-crawl-target] elements.
   * Caches bounding rectangles and coordinates.
   */
  refreshTargets(force: boolean = false): CrawlTargetInfo[] {
    const now = Date.now();
    if (!force && now - this.lastQueried < this.queryCooldownMs && this.targets.size > 0) {
      return Array.from(this.targets.values());
    }

    this.lastQueried = now;
    if (typeof document === 'undefined') return [];

    const elements = document.querySelectorAll<HTMLElement>('[data-crawl-target]');
    const updated = new Map<string, CrawlTargetInfo>();

    elements.forEach((el, index) => {
      const targetId = el.getAttribute('data-crawl-target') || `target-${index}`;
      const rect = el.getBoundingClientRect();

      // Check if element is currently visible in viewport or near viewport
      if (rect.width > 0 && rect.height > 0) {
        const existing = this.targets.get(targetId);
        updated.set(targetId, {
          id: targetId,
          label: el.innerText ? el.innerText.slice(0, 24).trim() : targetId,
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
          },
          element: el,
          lastScannedAt: existing?.lastScannedAt ?? 0,
        });
      }
    });

    this.targets = updated;
    return Array.from(this.targets.values());
  }

  /**
   * Updates coordinates upon scrolling without re-querying the whole DOM
   */
  updateScrollPositions() {
    this.targets.forEach((target) => {
      if (target.element && target.element.isConnected) {
        const rect = target.element.getBoundingClientRect();
        target.rect = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
        };
      }
    });
  }

  /**
   * Intelligently selects the next target:
   * Prioritizes targets currently inside the viewport that haven't been scanned recently.
   */
  selectNextTarget(crawlerPos: { x: number; y: number }, viewport: { width: number; height: number }): CrawlTargetInfo | null {
    const list = Array.from(this.targets.values());
    if (list.length === 0) return null;

    const now = Date.now();

    // Filter to targets inside visible viewport with padding
    const visibleTargets = list.filter((t) => {
      return (
        t.rect.centerX >= 20 &&
        t.rect.centerX <= viewport.width - 20 &&
        t.rect.centerY >= 20 &&
        t.rect.centerY <= viewport.height - 20
      );
    });

    const candidates = visibleTargets.length > 0 ? visibleTargets : list;

    // Sort by:
    // 1. Unscanned or least recently scanned (cool down of at least 8 seconds)
    // 2. Proximity to current crawler position
    candidates.sort((a, b) => {
      const ageA = now - a.lastScannedAt;
      const ageB = now - b.lastScannedAt;

      // If one was scanned very recently (< 8s), deprioritize it
      if (ageA < 8000 && ageB >= 8000) return 1;
      if (ageB < 8000 && ageA >= 8000) return -1;

      const distA = Math.hypot(a.rect.centerX - crawlerPos.x, a.rect.centerY - crawlerPos.y);
      const distB = Math.hypot(b.rect.centerX - crawlerPos.x, b.rect.centerY - crawlerPos.y);
      return distA - distB;
    });

    return candidates[0] || null;
  }

  markScanned(targetId: string) {
    const target = this.targets.get(targetId);
    if (target) {
      target.lastScannedAt = Date.now();
    }
  }

  applyGlitchHighlight(element: HTMLElement) {
    element.classList.add('cryptiq-crawler-scanned');
    setTimeout(() => {
      element.classList.remove('cryptiq-crawler-scanned');
    }, 1200);
  }
}
