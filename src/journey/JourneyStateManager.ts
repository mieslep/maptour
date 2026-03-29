export type JourneyState = 'tour_start' | 'at_stop' | 'in_transit' | 'tour_complete';

type StateChangeCallback = (state: JourneyState, stopIndex: number) => void;

const SAFE_RESTORE: Record<JourneyState, JourneyState> = {
  tour_start:    'tour_start',
  at_stop:       'at_stop',
  in_transit:    'at_stop',    // never resume mid-transit
  tour_complete: 'tour_complete',
};

function storageKey(tourId: string): string {
  return `maptour-journey-${tourId}`;
}

export class JourneyStateManager {
  private state: JourneyState;
  private activeStopIndex: number;
  private readonly stopCount: number;
  private readonly tourId: string;
  private readonly storage: Storage | null;
  private callbacks: StateChangeCallback[] = [];

  constructor(tourId: string, stopCount: number, storage: Storage | null = null) {
    this.tourId = tourId;
    this.stopCount = stopCount;
    this.storage = storage;
    this.state = 'tour_start';
    this.activeStopIndex = 0;
  }

  getState(): JourneyState {
    return this.state;
  }

  getActiveStopIndex(): number {
    return this.activeStopIndex;
  }

  transition(to: JourneyState, stopIndex?: number): void {
    const nextIndex = stopIndex !== undefined
      ? Math.max(0, Math.min(stopIndex, this.stopCount - 1))
      : this.activeStopIndex;

    this.state = to;
    this.activeStopIndex = nextIndex;
    this.persist();
    this.callbacks.forEach((cb) => cb(this.state, this.activeStopIndex));
  }

  onStateChange(cb: StateChangeCallback): void {
    this.callbacks.push(cb);
  }

  offStateChange(cb: StateChangeCallback): void {
    this.callbacks = this.callbacks.filter((c) => c !== cb);
  }

  persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(
        storageKey(this.tourId),
        JSON.stringify({ state: this.state, stopIndex: this.activeStopIndex })
      );
    } catch {
      // localStorage full or unavailable — in-memory state is still current
    }
  }

  /** Returns true if saved state was found and applied. */
  restore(): boolean {
    if (!this.storage) return false;
    try {
      const raw = this.storage.getItem(storageKey(this.tourId));
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { state: JourneyState; stopIndex: number };
      if (typeof parsed.state !== 'string' || typeof parsed.stopIndex !== 'number') return false;

      const safeState = SAFE_RESTORE[parsed.state] ?? 'at_stop';
      const safeIndex = Math.max(0, Math.min(parsed.stopIndex, this.stopCount - 1));

      this.state = safeState;
      this.activeStopIndex = safeIndex;
      return true;
    } catch {
      return false;
    }
  }

  clearSaved(): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(storageKey(this.tourId));
    } catch {
      // ignore
    }
  }
}
