// @ts-nocheck
// @ts-ignore - Tauri plugin, only available in desktop build
import Database from '@tauri-apps/plugin-sql';

let db: any = null;

export async function initOfflineDb(): Promise<void> {
  if (typeof window === 'undefined' || !(window as any).__TAURI__) return;
  try {
    db = await Database.load('sqlite:smart_erp.db');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS cached_orders (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  } catch {
    // Tauri not available
  }
}

export async function cacheOrder(id: string, data: string): Promise<void> {
  if (!db) return;
  await db.execute(
    'INSERT OR REPLACE INTO cached_orders (id, data, updated_at) VALUES (?, ?, ?)',
    [id, data, Date.now()]
  );
}

export async function getCachedOrder(id: string): Promise<string | null> {
  if (!db) return null;
  const rows = await db.select('SELECT data FROM cached_orders WHERE id = ?', [id]);
  return rows?.[0]?.data ?? null;
}
