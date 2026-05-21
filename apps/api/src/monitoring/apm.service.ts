import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import os from 'os';

export interface PerformanceMetrics {
  timestamp: string;
  requests: {
    total: number;
    perSecond: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    errorRate: number;
  };
  database: {
    activeConnections: number;
    slowQueries: number;
    avgQueryTimeMs: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    freeMemory: number;
    uptime: number;
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: string;
}

export interface TraceSpan {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  children?: TraceSpan[];
}

@Injectable()
export class ApmService {
  private readonly logger = new Logger(ApmService.name);
  private requestLatencies: number[] = [];
  private errorCount = 0;
  private requestCount = 0;
  private slowQueryCount = 0;
  private activeTraces = new Map<string, TraceSpan>();
  private readonly startTime = Date.now();

  constructor(private readonly drizzle: DrizzleService) {}

  /** Record a request latency */
  recordRequest(latencyMs: number, isError: boolean) {
    this.requestCount++;
    this.requestLatencies.push(latencyMs);
    if (isError) this.errorCount++;

    // Keep only last 1000 measurements
    if (this.requestLatencies.length > 1000) {
      this.requestLatencies = this.requestLatencies.slice(-1000);
    }
  }

  /** Record a slow query */
  recordSlowQuery(queryTimeMs: number) {
    this.slowQueryCount++;
    if (queryTimeMs > 5000) {
      this.logger.warn(`Very slow query detected: ${queryTimeMs}ms`);
    }
  }

  /** Start a trace span */
  startTrace(name: string, metadata?: Record<string, unknown>): string {
    const id = crypto.randomUUID();
    this.activeTraces.set(id, {
      id,
      name,
      startTime: Date.now(),
      metadata,
    });
    return id;
  }

  /** End a trace span */
  endTrace(id: string): TraceSpan | undefined {
    const span = this.activeTraces.get(id);
    if (span) {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      this.activeTraces.delete(id);

      if (span.duration > 1000) {
        this.logger.warn(`Slow operation: ${span.name} took ${span.duration}ms`);
      }

      return span;
    }
    return undefined;
  }

  /** Get current performance metrics */
  getMetrics(): PerformanceMetrics {
    const now = Date.now();
    const latencies = [...this.requestLatencies].sort((a, b) => a - b);
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    const partialMetrics = {
      timestamp: new Date().toISOString(),
      requests: {
        total: this.requestCount,
        perSecond: this.requestCount / (((now - this.startTime) || 1) / 1000),
        avgLatencyMs: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
        p95LatencyMs: latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] || 0 : 0,
        p99LatencyMs: latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] || 0 : 0,
        errorRate: this.requestCount > 0 ? Math.round((this.errorCount / this.requestCount) * 10000) / 100 : 0,
      },
      database: {
        activeConnections: 0, // Would query pg_stat_activity
        slowQueries: this.slowQueryCount,
        avgQueryTimeMs: 0, // Would calculate from query logs
      },
      system: {
        cpuUsage: (os.loadavg()[0] / (os.cpus().length || 1)) * 100,
        memoryUsage: Math.round(((totalMem - freeMem) / (totalMem || 1)) * 100),
        freeMemory: Math.round(freeMem / 1024 / 1024),
        uptime: Math.round((now - this.startTime) / 1000),
      },
    };

    return {
      ...partialMetrics,
      alerts: this.checkAlerts(partialMetrics),
    };
  }

  /** Check for alert conditions */
  private checkAlerts(metrics: Omit<PerformanceMetrics, 'alerts'>): Alert[] {
    const alerts: Alert[] = [];

    // High error rate
    if (metrics.requests.errorRate > 5) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'critical',
        metric: 'errorRate',
        threshold: 5,
        currentValue: metrics.requests.errorRate,
        message: `High error rate: ${metrics.requests.errorRate}%`,
        timestamp: new Date().toISOString(),
      });
    }

    // High latency
    if (metrics.requests.p95LatencyMs > 2000) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'warning',
        metric: 'p95Latency',
        threshold: 2000,
        currentValue: metrics.requests.p95LatencyMs,
        message: `High P95 latency: ${metrics.requests.p95LatencyMs}ms`,
        timestamp: new Date().toISOString(),
      });
    }

    // High memory usage
    if (metrics.system.memoryUsage > 90) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'critical',
        metric: 'memoryUsage',
        threshold: 90,
        currentValue: metrics.system.memoryUsage,
        message: `High memory usage: ${metrics.system.memoryUsage}%`,
        timestamp: new Date().toISOString(),
      });
    }

    // High CPU usage
    if (metrics.system.cpuUsage > 80) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'warning',
        metric: 'cpuUsage',
        threshold: 80,
        currentValue: metrics.system.cpuUsage,
        message: `High CPU usage: ${metrics.system.cpuUsage.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  }

  /** Reset metrics (for testing) */
  reset() {
    this.requestLatencies = [];
    this.errorCount = 0;
    this.requestCount = 0;
    this.slowQueryCount = 0;
  }
}

