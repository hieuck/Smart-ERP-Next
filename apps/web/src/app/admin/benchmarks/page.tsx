'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import { BarChart3, Activity } from 'lucide-react';

interface Stat {
  endpoint: string;
  status: string;
  p95: number;
  p99: number;
  avg: number;
  count: number;
}

interface Event {
  id: string;
  endpoint: string;
  status: string;
  durationMs: number;
  changesCount: number;
  createdAt: string;
}

export default function BenchmarksPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/admin/benchmarks/sync?hours=${hours}`);
      setStats(res.data.stats);
      setEvents(res.data.recentEvents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hours]);

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Sync Performance Benchmarks</h1>
              <p className="text-sm text-gray-500">Latency percentiles and recent events</p>
            </div>
          </div>
          <select
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value={1}>Last hour</option>
            <option value={24}>Last 24 hours</option>
            <option value={168}>Last 7 days</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {['push', 'pull'].map((endpoint) => {
                const successStats = stats.find(s => s.endpoint === endpoint && s.status === 'success');
                if (!successStats) return null;
                return (
                  <div key={endpoint} className="bg-white dark:bg-gray-800 rounded-xl border p-4">
                    <h2 className="font-semibold text-lg mb-3 capitalize">{endpoint} sync</h2>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">p95</div>
                        <div className="text-lg font-bold">{Math.round(successStats.p95)} ms</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">p99</div>
                        <div className="text-lg font-bold">{Math.round(successStats.p99)} ms</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">Avg</div>
                        <div className="text-lg font-bold">{Math.round(successStats.avg)} ms</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">{successStats.count} successful operations</div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Recent sync events</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Endpoint</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-right">Duration</th>
                      <th className="px-4 py-2 text-right">Changes</th>
                      <th className="px-4 py-2 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {events.map((ev) => (
                      <tr key={ev.id}>
                        <td className="px-4 py-2 capitalize">{ev.endpoint}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                            ev.status === 'success' ? 'bg-green-100 text-green-700' :
                            ev.status === 'conflict' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono">{ev.durationMs} ms</td>
                        <td className="px-4 py-2 text-right">{ev.changesCount}</td>
                        <td className="px-4 py-2 text-gray-500">{new Date(ev.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
