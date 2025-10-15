"use client";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
  timestamp: number;
}

type Subscriber = (entry: LogEntry) => void;

class Logger {
  private buffer: LogEntry[] = [];
  private subscribers: Set<Subscriber> = new Set();
  private max = 200;

  subscribe(s: Subscriber) {
    this.subscribers.add(s);
    return () => this.subscribers.delete(s);
  }

  entries() {
    return [...this.buffer];
  }

  private emit(entry: LogEntry) {
    this.buffer.push(entry);
    if (this.buffer.length > this.max) this.buffer.shift();
    this.subscribers.forEach((s) => s(entry));
  }

  private write(level: LogLevel, message: string, ctx?: Record<string, unknown>, error?: unknown) {
    const entry: LogEntry = { level, message, context: ctx, error, timestamp: Date.now() };
    // Console transport
    const prefix = `[${new Date(entry.timestamp).toISOString()}]`;
    const payload = ctx ? { ...ctx, error } : error ?? undefined;
    try {
      const fn = console[level as keyof Console] as (...args: unknown[]) => void;
      fn(prefix, level.toUpperCase(), message, payload ?? "");
    } catch {}
    this.emit(entry);
  }

  debug(message: string, ctx?: Record<string, unknown>) {
    this.write("debug", message, ctx);
  }
  info(message: string, ctx?: Record<string, unknown>) {
    this.write("info", message, ctx);
  }
  warn(message: string, ctx?: Record<string, unknown>) {
    this.write("warn", message, ctx);
  }
  error(message: string, error?: unknown, ctx?: Record<string, unknown>) {
    this.write("error", message, ctx, error);
  }
}

export const logger = new Logger();

// Global browser hooks to capture errors
export function registerGlobalErrorLogging() {
  if (typeof window === "undefined") return;
  // Prevent double registration
  const win = window as Window & { __loggerRegistered?: boolean };
  if (win.__loggerRegistered) return;
  win.__loggerRegistered = true;
  window.addEventListener("error", (ev) => {
    logger.error("Unhandled error", ev.error ?? ev.message);
  });
  window.addEventListener("unhandledrejection", (ev) => {
    logger.error("Unhandled promise rejection", ev.reason);
  });
}
