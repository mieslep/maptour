const STORAGE_KEY = 'maptour_nav_app';

export class NavAppPreference {
  private memory: string | null = null;

  get(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return this.memory;
    }
  }

  set(app: string): void {
    this.memory = app;
    try {
      localStorage.setItem(STORAGE_KEY, app);
    } catch {
      // localStorage unavailable - use in-memory only
    }
  }

  clear(): void {
    this.memory = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
