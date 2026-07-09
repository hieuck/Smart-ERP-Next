import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'net';
import { DrizzleService } from '../drizzle/drizzle.service';
import { sql } from 'drizzle-orm';

export interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number; // seconds
  timestamp: string;
  services: {
    api: ServiceHealth;
    database: ServiceHealth;
    cache: ServiceHealth;
  };
  metrics: {
    requestsPerMinute: number;
    errorRate: number;
    avgLatencyMs: number;
    activeConnections: number;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

@Injectable()
export class HealthMonitorService {
  private startTime: number;
  private requestCounts: { time: number; count: number }[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly drizzle: DrizzleService,
  ) {
    this.startTime = Date.now();
  }

  /** Get overall health status */
  async getHealth(): Promise<HealthMetrics> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const [dbHealth, cacheHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
    ]);

    const overallStatus = this.calculateOverallStatus(dbHealth, cacheHealth);

    return {
      status: overallStatus,
      uptime: uptimeSeconds,
      timestamp: new Date().toISOString(),
      services: {
        api: { status: 'up' },
        database: dbHealth,
        cache: cacheHealth,
      },
      metrics: this.calculateMetrics(),
    };
  }

  /** Record a request for metrics */
  recordRequest(latencyMs: number, isError: boolean) {
    const now = Date.now();
    this.requestCounts.push({ time: now, count: 1, ...{ latencyMs, isError } as any });

    // Keep only last 5 minutes
    const cutoff = now - 5 * 60 * 1000;
    this.requestCounts = this.requestCounts.filter((r) => r.time > cutoff);
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    try {
      const start = Date.now();
      await this.drizzle.db.execute(sql`SELECT 1`);
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (e: any) {
      return { status: 'down', error: e.message };
    }
  }

  private async checkCache(): Promise<ServiceHealth> {
    const cacheUrl = process.env.CACHE_URL ?? process.env.REDIS_URL;
    if (!cacheUrl) {
      // No external cache configured — considered healthy by default.
      return { status: 'up', latencyMs: 0 };
    }

    const parsed = this.parseCacheUrl(cacheUrl);
    if (!parsed) {
      return { status: 'down', error: 'Invalid CACHE_URL/REDIS_URL format' };
    }

    return this.pingCacheTcp(parsed.host, parsed.port);
  }

  private parseCacheUrl(url: string): { host: string; port: number } | null {
    try {
      // redis://host:port or rediss://host:port
      const match = url.match(/^rediss?:\/\/([^:@]+)(?::(\d+))?(?:\/\d+)?$/);
      if (!match) return null;
      const host = match[1];
      const port = match[2] ? parseInt(match[2], 10) : 6379;
      if (!host || !Number.isFinite(port)) return null;
      return { host, port };
    } catch {
      return null;
    }
  }

  private pingCacheTcp(host: string, port: number): Promise<ServiceHealth> {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = new Socket();
      const timeoutMs = 2000;

      const timer = setTimeout(() => {
        socket.destroy();
        resolve({ status: 'down', error: 'Cache connection timed out' });
      }, timeoutMs);

      socket.on('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve({ status: 'up', latencyMs: Date.now() - start });
      });

      socket.on('ready', () => {
        clearTimeout(timer);
        socket.destroy();
      });

      socket.on('error', (err) => {
        clearTimeout(timer);
        socket.destroy();
        resolve({ status: 'down', error: err.message });
      });

      socket.connect(port, host);
    });
  }

  private calculateOverallStatus(db: ServiceHealth, cache: ServiceHealth): 'healthy' | 'degraded' | 'down' {
    if (db.status === 'down') return 'down';
    if (db.latencyMs && db.latencyMs > 1000) return 'degraded';
    return 'healthy';
  }

  private calculateMetrics() {
    const now = Date.now();
    const last5min = this.requestCounts.filter((r) => r.time > now - 5 * 60 * 1000);
    const rpm = last5min.reduce((sum, r) => sum + (r.count || 0), 0);
    const errors = last5min.filter((r) => (r as any).isError).length;
    const latencies = last5min.map((r) => (r as any).latencyMs).filter(Boolean);
    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    return {
      requestsPerMinute: rpm,
      errorRate: last5min.length ? Math.round((errors / last5min.length) * 100) : 0,
      avgLatencyMs: avgLatency,
      activeConnections: 0,
    };
  }
}