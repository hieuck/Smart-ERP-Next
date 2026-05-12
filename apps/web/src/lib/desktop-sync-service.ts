import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function initOfflineDb() {
  if (!(window as any).__TAURI__) return;
  db = await Database.load('sqlite:smart_erp.db');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cached_orders (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_products (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
}

export async function saveOfflineOrder(order: any) {
  if (!db) return;
  await db.execute(
    'INSERT OR REPLACE INTO cached_orders (id, data, synced, created_at) VALUES ($1, $2, 0, $3)',
    [order.id, JSON.stringify(order), Date.now()]
  );
}

export async function syncOfflineOrders() {
  if (!db) return;
  const pending = await db.select<{ id: string; data: string }[]>(
    'SELECT id, data FROM cached_orders WHERE synced = 0'
  );
  const apiClient = (await import('./api-client')).apiClient;
  for (const row of pending) {
    try {
      const order = JSON.parse(row.data);
      await apiClient.post('/orders', order);
      await db.execute('UPDATE cached_orders SET synced = 1 WHERE id = $1', [row.id]);
    } catch (err) {
      console.error('Sync failed for order', row.id, err);
    }
  }
}