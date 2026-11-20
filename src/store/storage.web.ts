// Web preview: localStorage (expo-sqlite on web needs WebAssembly and special server headers).
export const storage = {
  get(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private mode / blocked storage: ignore.
    }
  },
};
