export type SheetPosition = 'expanded' | 'peek' | 'collapsed';

// Fraction of container height for each snap position
const SNAP_FRACTIONS: Record<SheetPosition, number> = {
  expanded:  0.75,
  peek:      0.30,
  collapsed: 0,    // collapsed uses fixed px height defined in CSS
};

const COLLAPSED_PX = 80;
const SNAP_THRESHOLD = 20; // px — within this of a snap point, lock to it
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface SnapPoint {
  position: SheetPosition;
  translateY: number; // px — distance from bottom (0 = fully visible at that height)
}

export class BottomSheet {
  private readonly wrapper: HTMLElement;
  private readonly content: HTMLElement;
  private readonly handle: HTMLElement;
  private currentPosition: SheetPosition = 'expanded';
  private containerHeight = 0;
  private dragStartY = 0;
  private dragStartTranslate = 0;
  private isDragging = false;
  private dragEndCallbacks: Array<(pos: SheetPosition) => void> = [];

  constructor(container: HTMLElement, content: HTMLElement) {
    this.content = content;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'maptour-sheet';

    this.handle = document.createElement('div');
    this.handle.className = 'maptour-sheet__handle';
    this.handle.setAttribute('aria-hidden', 'true');

    this.wrapper.appendChild(this.handle);
    this.wrapper.appendChild(content);
    container.appendChild(this.wrapper);

    this.containerHeight = container.offsetHeight || window.innerHeight;

    this.bindDrag();
    this.bindKeyboard();
    this.bindResize(container);
  }

  private snapPoints(): SnapPoint[] {
    const h = this.containerHeight;
    return [
      { position: 'expanded',  translateY: h - h * SNAP_FRACTIONS.expanded },
      { position: 'peek',      translateY: h - h * SNAP_FRACTIONS.peek },
      { position: 'collapsed', translateY: h - COLLAPSED_PX },
    ];
  }

  private currentTranslateY(): number {
    const pts = this.snapPoints();
    return pts.find((p) => p.position === this.currentPosition)?.translateY
      ?? pts[0].translateY;
  }

  private animate(): boolean {
    if (typeof window?.matchMedia !== 'function') return true;
    return !window.matchMedia(REDUCED_MOTION_QUERY).matches;
  }

  setPosition(pos: SheetPosition, animate = true): void {
    this.currentPosition = pos;
    const pts = this.snapPoints();
    const target = pts.find((p) => p.position === pos) ?? pts[0];
    this.applyTranslate(target.translateY, animate && this.animate());
  }

  private applyTranslate(y: number, animate: boolean): void {
    this.wrapper.style.transition = animate ? 'transform 200ms ease-out' : 'none';
    this.wrapper.style.transform = `translateY(${y}px)`;
  }

  onDragEnd(cb: (pos: SheetPosition) => void): void {
    this.dragEndCallbacks.push(cb);
  }

  getPosition(): SheetPosition {
    return this.currentPosition;
  }

  private bindDrag(): void {
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.maptour-sheet__handle, .maptour-sheet')) return;
      this.isDragging = true;
      this.dragStartY = e.clientY;
      this.dragStartTranslate = this.currentTranslateY();
      this.wrapper.setPointerCapture(e.pointerId);
      this.wrapper.style.transition = 'none';
    };

    const onMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const delta = e.clientY - this.dragStartY;
      const newY = Math.max(0, Math.min(this.containerHeight - COLLAPSED_PX,
        this.dragStartTranslate + delta));
      this.wrapper.style.transform = `translateY(${newY}px)`;
    };

    const onUp = (e: PointerEvent) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const delta = e.clientY - this.dragStartY;
      const currentY = this.dragStartTranslate + delta;
      const snapped = this.snapNearest(currentY);
      this.setPosition(snapped, true);
      this.dragEndCallbacks.forEach((cb) => cb(snapped));
    };

    this.wrapper.addEventListener('pointerdown', onDown);
    this.wrapper.addEventListener('pointermove', onMove);
    this.wrapper.addEventListener('pointerup', onUp);
    this.wrapper.addEventListener('pointercancel', onUp);
  }

  private snapNearest(translateY: number): SheetPosition {
    const pts = this.snapPoints();
    let nearest = pts[0];
    let minDist = Math.abs(translateY - pts[0].translateY);
    for (const pt of pts) {
      const dist = Math.abs(translateY - pt.translateY);
      if (dist < minDist) { minDist = dist; nearest = pt; }
    }
    // Snap threshold: if within SNAP_THRESHOLD of a point, lock to it
    if (minDist <= SNAP_THRESHOLD) return nearest.position;
    // Otherwise use momentum: direction of drag determines snap
    const delta = translateY - this.dragStartTranslate;
    if (delta > 0) {
      // dragging down — go to next lower position
      const ordered: SheetPosition[] = ['expanded', 'peek', 'collapsed'];
      const idx = ordered.indexOf(this.currentPosition);
      return ordered[Math.min(idx + 1, ordered.length - 1)];
    } else {
      const ordered: SheetPosition[] = ['collapsed', 'peek', 'expanded'];
      const idx = ordered.indexOf(this.currentPosition);
      return ordered[Math.min(idx + 1, ordered.length - 1)];
    }
  }

  private bindKeyboard(): void {
    this.wrapper.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const next: SheetPosition = this.currentPosition === 'expanded' ? 'peek' : 'collapsed';
        this.setPosition(next, true);
        this.dragEndCallbacks.forEach((cb) => cb(next));
      }
    });
  }

  private bindResize(container: HTMLElement): void {
    const obs = new ResizeObserver(() => {
      this.containerHeight = container.offsetHeight || window.innerHeight;
      this.setPosition(this.currentPosition, false);
    });
    obs.observe(container);
  }

  destroy(): void {
    this.wrapper.remove();
  }
}
