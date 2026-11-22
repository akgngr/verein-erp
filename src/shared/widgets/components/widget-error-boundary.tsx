"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/** Keeps a faulty extension from taking down the shared application shell. */
export class WidgetErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; onError?: (error: Error, info: ErrorInfo) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Deliberately do not log potentially sensitive widget data.
    this.props.onError?.(error, info);
  }

  render(): ReactNode {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
