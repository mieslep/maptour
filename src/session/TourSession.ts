import { Breadcrumb } from '../breadcrumb/Breadcrumb';

export type TourSessionChangeCallback = (session: TourSession) => void;

export class TourSession {
  private readonly stopCount: number;
  private readonly breadcrumb: Breadcrumb;
  private callbacks: TourSessionChangeCallback[] = [];

  private _startIndex = 0;
  private _reversed = false;
  private _currentStopIndex = 0;
  private _overviewSelectedIndex = 0;
  private _tourOrder: number[] = [];
  private _endIndex = 0;

  constructor(tourId: string, stopCount: number) {
    this.stopCount = stopCount;
    this.breadcrumb = new Breadcrumb(tourId);
    this._tourOrder = this.computeOrder(0, false);
    this._endIndex = this.computeEndIndex(0, false);
  }

  // --- Getters ---

  get startIndex(): number { return this._startIndex; }
  get reversed(): boolean { return this._reversed; }
  get currentStopIndex(): number { return this._currentStopIndex; }
  get overviewSelectedIndex(): number { return this._overviewSelectedIndex; }
  get tourOrder(): number[] { return this._tourOrder; }
  get endIndex(): number { return this._endIndex; }

  getVisited(): Set<number> {
    return this.breadcrumb.getVisited();
  }

  getStopCount(): number {
    return this.stopCount;
  }

  // --- Mutators ---

  setStartIndex(index: number): void {
    this._startIndex = index;
    this._tourOrder = this.computeOrder(index, this._reversed);
    this._endIndex = this.computeEndIndex(index, this._reversed);
    this.notify();
  }

  setReversed(reversed: boolean): void {
    this._reversed = reversed;
    this._tourOrder = this.computeOrder(this._overviewSelectedIndex, reversed);
    this._endIndex = this.computeEndIndex(this._overviewSelectedIndex, reversed);
    this.notify();
  }

  setCurrentStop(index: number): void {
    this._currentStopIndex = index;
    this.notify();
  }

  setOverviewSelection(index: number): void {
    this._overviewSelectedIndex = index;
    this._tourOrder = this.computeOrder(index, this._reversed);
    this._endIndex = this.computeEndIndex(index, this._reversed);
    this.notify();
  }

  markVisited(stopId: number): void {
    this.breadcrumb.markVisited(stopId);
    this.notify();
  }

  /** Reset session state for a new tour start (overview entry). */
  reset(): void {
    this._startIndex = 0;
    this._reversed = false;
    this._currentStopIndex = 0;
    this._overviewSelectedIndex = 0;
    this._tourOrder = this.computeOrder(0, false);
    this._endIndex = this.computeEndIndex(0, false);
    this.notify();
  }

  /** Clear visited state (e.g. on "Review tour"). */
  clearVisited(): void {
    this.breadcrumb.clear();
    this.notify();
  }

  // --- Subscription ---

  onChange(cb: TourSessionChangeCallback): void {
    this.callbacks.push(cb);
  }

  offChange(cb: TourSessionChangeCallback): void {
    this.callbacks = this.callbacks.filter((c) => c !== cb);
  }

  // --- Computed state ---

  private computeOrder(startIndex: number, reversed: boolean): number[] {
    const n = this.stopCount;
    const order: number[] = [];
    for (let i = 0; i < n; i++) {
      if (reversed) {
        order.push((startIndex - i + n) % n);
      } else {
        order.push((startIndex + i) % n);
      }
    }
    return order;
  }

  private computeEndIndex(startIndex: number, reversed: boolean): number {
    const n = this.stopCount;
    return reversed ? (startIndex + 1) % n : (startIndex - 1 + n) % n;
  }

  private notify(): void {
    this.callbacks.forEach((cb) => cb(this));
  }
}
