import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { eq, and, sql, or, desc, ilike } from 'drizzle-orm';

/** Escape ILIKE wildcard characters so they are treated literally. */
export function escapeLikePattern(term: string): string {
  return term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  metadata: Record<string, unknown>;
  score: number;
  url?: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Universal search across all business entities.
   * Supports natural language queries with fuzzy matching.
   */
  async search(tenantId: string, query: string, limit = 20): Promise<SearchResult[]> {
    const searchTerm = query.trim();
    if (!searchTerm) return [];

    const likePattern = '%' + escapeLikePattern(searchTerm) + '%';

    const results: SearchResult[] = [];

    // Search customers
    const customerResults = await this.drizzle.db.execute(
      sql`SELECT id, name, code, phone, email FROM customers
          WHERE tenant_id = ${tenantId}
          AND (name ILIKE ${likePattern} ESCAPE '\\'
            OR code ILIKE ${likePattern} ESCAPE '\\'
            OR phone ILIKE ${likePattern} ESCAPE '\\'
            OR email ILIKE ${likePattern} ESCAPE '\\')
          LIMIT ${limit}`
    );

    for (const c of customerResults.rows as any[]) {
      results.push({
        id: c.id,
        type: 'customer',
        title: c.name,
        description: `${c.code} • ${c.phone || ''}`,
        metadata: c,
        score: this.calculateScore(searchTerm, c.name, c.code),
        url: `/customers/${c.id}`,
      });
    }

    // Search products
    const productResults = await this.drizzle.db.execute(
      sql`SELECT id, name, sku FROM products
          WHERE tenant_id = ${tenantId}
          AND (name ILIKE ${likePattern} ESCAPE '\\'
            OR sku ILIKE ${likePattern} ESCAPE '\\')
          LIMIT ${limit}`
    );

    for (const p of productResults.rows as any[]) {
      results.push({
        id: p.id,
        type: 'product',
        title: p.name,
        description: `SKU: ${p.sku}${p.barcode ? ' • Barcode: ' + p.barcode : ''}`,
        metadata: p,
        score: this.calculateScore(searchTerm, p.name, p.sku),
        url: `/products/${p.id}`,
      });
    }

    // Search orders
    const orderResults = await this.drizzle.db.execute(
      sql`SELECT id, code, status, total FROM orders
          WHERE tenant_id = ${tenantId}
          AND code ILIKE ${likePattern} ESCAPE '\\'
          LIMIT ${limit}`
    );

    for (const o of orderResults.rows as any[]) {
      results.push({
        id: o.id,
        type: 'order',
        title: o.code,
        description: `Total: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(o.total))} • ${o.status}`,
        metadata: o,
        score: this.calculateScore(searchTerm, o.code, String(o.total)),
        url: `/orders/${o.id}`,
      });
    }

    // Search suppliers
    const supplierResults = await this.drizzle.db.execute(
      sql`SELECT id, name, code FROM suppliers
          WHERE tenant_id = ${tenantId}
          AND (name ILIKE ${likePattern} ESCAPE '\\'
            OR code ILIKE ${likePattern} ESCAPE '\\')
          LIMIT ${limit}`
    );

    for (const s of supplierResults.rows as any[]) {
      results.push({
        id: s.id,
        type: 'supplier',
        title: s.name,
        description: s.code,
        metadata: s,
        score: this.calculateScore(searchTerm, s.name, s.code),
        url: `/suppliers/${s.id}`,
      });
    }

    // Search invoices/payments
    const paymentResults = await this.drizzle.db.execute(
      sql`SELECT id, code, amount FROM payments
          WHERE tenant_id = ${tenantId}
          AND code ILIKE ${likePattern} ESCAPE '\\'
          LIMIT ${limit}`
    );

    for (const p of paymentResults.rows as any[]) {
      results.push({
        id: p.id,
        type: 'payment',
        title: p.code,
        description: `Amount: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(p.amount))}`,
        metadata: p,
        score: this.calculateScore(searchTerm, p.code, String(p.amount)),
        url: `/payments/${p.id}`,
      });
    }

    // Rank by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** Calculate fuzzy match score */
  private calculateScore(query: string, ...fields: string[]): number {
    const q = query.toLowerCase();
    let score = 0;

    for (const field of fields) {
      if (!field) continue;
      const f = field.toLowerCase();

      if (f === q) score += 100;
      else if (f.startsWith(q)) score += 80;
      else if (f.includes(q)) score += 50;
      else {
        // Fuzzy matching: check for character-level matches
        let charMatches = 0;
        for (const char of q) {
          if (f.includes(char)) charMatches++;
        }
        score += Math.round((charMatches / Math.max(q.length, 1)) * 30);
      }
    }

    return score;
  }

  /** Autocomplete suggestions */
  async autocomplete(tenantId: string, query: string, limit = 10): Promise<string[]> {
    if (!query.trim()) return [];

    const results = await this.search(tenantId, query, limit * 3);
    return results.slice(0, limit).map((r) => r.title);
  }
}
