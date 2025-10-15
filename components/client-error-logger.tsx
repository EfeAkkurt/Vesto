"use client";
import { useEffect } from "react";
import { registerGlobalErrorLogging, logger, LogEntry } from "@/lib/logging/logger";
import { useToast } from "@/components/ui/toast";

export function ClientErrorLogger() {
  const { push } = useToast();
  useEffect(() => {
    registerGlobalErrorLogging();
    const unsub = logger.subscribe((e: LogEntry) => {
      if (e.level === "error") {
        push({
          variant: "error",
          title: "Error captured",
          description: e.message,
          duration: 6000,
        });
      }
    });
    return () => {
      unsub();
    };
  }, [push]);
  return null;
}
