'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity, TrendingUp } from 'lucide-react';

interface Datapoint {
  time: string;
  p95: number;
  p99: number;
  avg: number;
  endpoint: string;
}

export default function PerformancePage() {
  const [data, setData] = useState<Datapoint[]>([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/admin/benchmarks/sync/timeseries?hours=${hours}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hours]);

  const pushData = data.filter(d => d.endpoint === 'push');
  const pullData = data.filter(d => d.endpoint === 'pull');

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Sync Performance Dashboard</h1>
              <p className="text-sm text-gray-500">Latency over time (p95, p99, average)</p>
            </div>
          </div>
          <select
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value={24}>Last 24 hours</option>
            <option value={168}>Last 7 days</option>
            <option value={720}>Last 30 days</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
              <h2 className="text-lg font-semibold mb-4">Push Sync Latency</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pushData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="p95" stroke="#8884d8" name="p95" />
                  <Line type="monotone" dataKey="p99" stroke="#82ca9d" name="p99" />
                  <Line type="monotone" dataKey="avg" stroke="#ffc658" name="avg" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
              <h2 className="text-lg font-semibold mb-4">Pull Sync Latency</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pullData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="p95" stroke="#8884d8" name="p95" />
                  <Line type="monotone" dataKey="p99" stroke="#82ca9d" name="p99" />
                  <Line type="monotone" dataKey="avg" stroke="#ffc658" name="avg" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Raw Data</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Time</th>
                      <th className="px-4 py-2 text-left">Endpoint</th>
                      <th className="px-4 py-2 text-right">p95 (ms)</th>
                      <th className="px-4 py-2 text-right">p99 (ms)</th>
                      <th className="px-4 py-2 text-right">Avg (ms)</th>
                    </td>
                  </thead>
                  <tbody className="divide-y">
                    {data.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">{new Date(row.time).toLocaleString()}</td>
                        <td className="px-4 py-2 capitalize">{row.endpoint}</td>
                        <td className="px-4 py-2 text-right font-mono">{Math.round(row.p95)}</td>
                        <td className="px-4 py-2 text-right font-mono">{Math.round(row.p99)}</td>
                        <td className="px-4 py-2 text-right font-mono">{Math.round(row.avg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </td>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
