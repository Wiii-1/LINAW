"use client";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  TriangleAlert,
  X,
} from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ToastKind = "success" | "error" | "warning" | "info" | "loading";

type ToastOptions = {
  kind?: ToastKind;
  duration?: number;
  id?: string;
};

type ToastRecord = {
  id: string;
  message: string;
  kind: ToastKind;
  duration?: number;
};

type ToastApi = {
  toast: (message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  success: (message: string, options?: Omit<ToastOptions, "kind">) => string;
  error: (message: string, options?: Omit<ToastOptions, "kind">) => string;
  warning: (message: string, options?: Omit<ToastOptions, "kind">) => string;
  info: (message: string, options?: Omit<ToastOptions, "kind">) => string;
  loading: (message: string, options?: Omit<ToastOptions, "kind">) => string;
};

const ToastContext = createContext<ToastApi | null>(null);
const durations: Record<Exclude<ToastKind, "loading">, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
};
const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
  loading: Loader2,
};
const styles: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100",
  error: "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/80 dark:text-red-100",
  warning: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/80 dark:text-amber-100",
  info: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/80 dark:text-blue-100",
  loading: "border-border bg-popover text-popover-foreground",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const kind = options.kind ?? "info";
      const id = options.id ?? `${kind}:${message}`;
      setToasts((current) => {
        if (current.some((item) => item.id === id)) return current;
        return [
          ...current.slice(-3),
          { id, message, kind, duration: options.duration },
        ];
      });
      return id;
    },
    [],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      dismissToast,
      success: (message, options) => toast(message, { ...options, kind: "success" }),
      error: (message, options) => toast(message, { ...options, kind: "error" }),
      warning: (message, options) => toast(message, { ...options, kind: "warning" }),
      info: (message, options) => toast(message, { ...options, kind: "info" }),
      loading: (message, options) => toast(message, { ...options, kind: "loading" }),
    }),
    [dismissToast, toast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2 sm:right-5 sm:top-5" aria-live="polite" aria-label="Notifications">
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: string) => void }) {
  const Icon = icons[toast.kind];
  const duration = toast.duration ?? (toast.kind === "loading" ? undefined : durations[toast.kind]);

  useEffect(() => {
    if (duration === undefined) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, onDismiss, toast.id]);

  return (
    <div className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-3 py-3 text-sm shadow-lg ${styles[toast.kind]}`} role={toast.kind === "error" ? "alert" : "status"}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${toast.kind === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
      <button type="button" className="rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
