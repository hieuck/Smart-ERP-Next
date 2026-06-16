export interface UnifiedSearchResult {
  id: string;
  type: 'product' | 'customer' | 'order' | 'supplier';
  title: string;
  subtitle?: string;
  url: string;
}

export type SearchResult = UnifiedSearchResult;

