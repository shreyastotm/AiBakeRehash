import { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// In-process metrics collector (Prometheus text format output)
// ---------------------------------------------------------------------------

interface HistogramBucket {
  le: number;
  count: number;
}

interface MetricSummary {
  count: number;
  sum: number;
  buckets: HistogramBucket[];
}

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const httpRequestsTotal: Record<string, number> = {};
const httpRequestDuration: Record<string, MetricSummary> = {};
const httpRequestsInFlight = { value: 0 };
let startTime = Date.now();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function labelKey(method: string, route: string, status: number): string {
  return `${method}|${route}|${status}`;
}

function normalisePath(req: Request): string {
  // Use the matched route pattern if available, otherwise the path
  if (req.route?.path) {
    return req.baseUrl + req.route.path;
  }
  // Collapse UUIDs and numeric IDs to :id for cardinality control
  return req.path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id');
}

function getOrCreateSummary(key: string): MetricSummary {
  if (!httpRequestDuration[key]) {
    httpRequestDuration[key] = {
      count: 0,
      sum: 0,
      buckets: DEFAULT_BUCKETS.map((le) => ({ le, count: 0 })),
    };
  }
  return httpRequestDuration[key];
}

function recordDuration(key: string, durationSec: number): void {
  const summary = getOrCreateSummary(key);
  summary.count++;
  summary.sum += durationSec;
  for (const bucket of summary.buckets) {
    if (durationSec <= bucket.le) {
      bucket.count++;
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware — collect per-request metrics
// ---------------------------------------------------------------------------

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  httpRequestsInFlight.value++;
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    httpRequestsInFlight.value--;
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;

    const route = normalisePath(req);
    const key = labelKey(req.method, route, res.statusCode);

    httpRequestsTotal[key] = (httpRequestsTotal[key] || 0) + 1;
    recordDuration(key, durationSec);
  });

  next();
}

// ---------------------------------------------------------------------------
// Prometheus text format serialiser
// ---------------------------------------------------------------------------

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export function renderMetrics(): string {
  const lines: string[] = [];

  // -- process uptime
  const uptimeSec = (Date.now() - startTime) / 1000;
  lines.push('# HELP process_uptime_seconds Time since the process started.');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${uptimeSec.toFixed(3)}`);
  lines.push('');

  // -- http_requests_total (counter)
  lines.push('# HELP http_requests_total Total number of HTTP requests.');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, count] of Object.entries(httpRequestsTotal)) {
    const [method, route, status] = key.split('|');
    lines.push(
      `http_requests_total{method="${escape(method)}",route="${escape(route)}",status="${status}"} ${count}`,
    );
  }
  lines.push('');

  // -- http_requests_in_flight (gauge)
  lines.push('# HELP http_requests_in_flight Current number of in-flight HTTP requests.');
  lines.push('# TYPE http_requests_in_flight gauge');
  lines.push(`http_requests_in_flight ${httpRequestsInFlight.value}`);
  lines.push('');

  // -- http_request_duration_seconds (histogram)
  lines.push('# HELP http_request_duration_seconds HTTP request latency in seconds.');
  lines.push('# TYPE http_request_duration_seconds histogram');
  for (const [key, summary] of Object.entries(httpRequestDuration)) {
    const [method, route, status] = key.split('|');
    const labels = `method="${escape(method)}",route="${escape(route)}",status="${status}"`;
    for (const bucket of summary.buckets) {
      lines.push(
        `http_request_duration_seconds_bucket{${labels},le="${bucket.le}"} ${bucket.count}`,
      );
    }
    lines.push(
      `http_request_duration_seconds_bucket{${labels},le="+Inf"} ${summary.count}`,
    );
    lines.push(`http_request_duration_seconds_sum{${labels}} ${summary.sum.toFixed(6)}`);
    lines.push(`http_request_duration_seconds_count{${labels}} ${summary.count}`);
  }
  lines.push('');

  // -- nodejs memory usage
  const mem = process.memoryUsage();
  lines.push('# HELP nodejs_heap_used_bytes Node.js heap used in bytes.');
  lines.push('# TYPE nodejs_heap_used_bytes gauge');
  lines.push(`nodejs_heap_used_bytes ${mem.heapUsed}`);
  lines.push('# HELP nodejs_heap_total_bytes Node.js heap total in bytes.');
  lines.push('# TYPE nodejs_heap_total_bytes gauge');
  lines.push(`nodejs_heap_total_bytes ${mem.heapTotal}`);
  lines.push('# HELP nodejs_rss_bytes Node.js resident set size in bytes.');
  lines.push('# TYPE nodejs_rss_bytes gauge');
  lines.push(`nodejs_rss_bytes ${mem.rss}`);
  lines.push('');

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Reset (useful for tests)
// ---------------------------------------------------------------------------

export function resetMetrics(): void {
  for (const key of Object.keys(httpRequestsTotal)) delete httpRequestsTotal[key];
  for (const key of Object.keys(httpRequestDuration)) delete httpRequestDuration[key];
  httpRequestsInFlight.value = 0;
  startTime = Date.now();
}
