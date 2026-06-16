import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { SearchResult } from '@/types/search';
import {
  Search,
  X,
  Package,
  ShoppingBag,
  User,
  FileText,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

interface UnifiedSearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  url?: string;
}

export default function GlobalSearch() {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const typeIcons: Record<string, React.ReactNode> = {
    customer: <User className="w-4 h-4 text-blue-500" />,
    product: <Package className="w-4 h-4 text-green-500" />,
    order: <ShoppingBag className="w-4 h-4 text-purple-500" />,
    payment: <DollarSign className="w-4 h-4 text-yellow-500" />,
    supplier: <User className="w-4 h-4 text-orange-500" />,
  };

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowResults(true);
      try {
        const res = await apiClient.get<UnifiedSearchResult[]>('/search', {
          params: { q: query, limit: 10 },
        });
        setResults(res.data ?? res);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = () => {
    setShowResults(false);
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={t('search.placeholder')}
          className="w-full px-4 py-3 pl-12 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg shadow-sm"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border p-4 text-center text-sm text-gray-500">
          {t('search.searching')}
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 2 && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border p-6 text-center">
          <p className="text-gray-400 text-lg mb-2">
            {t('search.noResults')}
          </p>
          <p className="text-sm text-gray-500">
            {t('search.placeholder')}
          </p>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border overflow-hidden z-50">
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b">
            {t('search.results')} ({results.length})
          </div>
          {results.map((result) => (
            <a
              key={result.id}
              href={result.url }
              onClick={handleSelect}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition group"
            >
              <span className="flex-shrink-0">
                {typeIcons[result.type] || <FileText className="w-4 h-4 text-gray-400" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                {result.description && (
                  <p className="text-xs text-gray-500 truncate">{result.description}</p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
            </a>
          ))}
          {results.length >= 10 && (
            <div className="px-4 py-2 border-t text-center">
              <a href="#" className="text-sm text-blue-600 hover:underline">
                {t('search.viewAll')} →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
