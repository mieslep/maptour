const STORAGE_KEY_PREFIX = 'maptour_visited_';

export class Breadcrumb {
  private tourId: string;
  private visited: Set<number>;

  constructor(tourId: string) {
    this.tourId = tourId;
    this.visited = this.load();
  }

  private storageKey(): string {
    return `${STORAGE_KEY_PREFIX}${this.tourId}`;
  }

  private load(): Set<number> {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return new Set<number>();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set<number>();
      return new Set(parsed.filter((v): v is number => typeof v === 'number'));
    } catch {
      // localStorage unavailable or parse error — degrade silently
      return new Set<number>();
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify([...this.visited]));
    } catch {
      // localStorage unavailable — in-memory only
    }
  }

  markVisited(stopId: number): void {
    this.visited.add(stopId);
    this.save();
  }

  isVisited(stopId: number): boolean {
    return this.visited.has(stopId);
  }

  getVisited(): Set<number> {
    return new Set(this.visited);
  }

  clear(): void {
    this.visited.clear();
    try {
      localStorage.removeItem(this.storageKey());
    } catch {
      // ignore
    }
  }
}
