// Small synchronous key-value storage (native: SQLite-backed kv-store, works offline, in Expo Go).
// The web build uses storage.web.ts instead.
import Storage from 'expo-sqlite/kv-store';

export const storage = {
  get(key: string): string | null {
    try {
      return Storage.getItemSync(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      Storage.setItemSync(key, value);
    } catch {
      // Ignore: losing a preference must never break reading.
    }
  },
};
