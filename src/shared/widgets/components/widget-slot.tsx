"use client";

import { createElement, lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { WidgetErrorBoundary } from "./widget-error-boundary";
import type { WidgetDefinition, WidgetPreference, WidgetSlot as SlotName } from "../contract";
import { resolveWidgets } from "../contract";

export type WidgetComponentLoader = () => Promise<{ default: ComponentType }>;
export interface WidgetRegistration {
  definition: WidgetDefinition;
  /** Trusted build-time loader from module:sync; never supplied by user preferences. */
  load: WidgetComponentLoader;
}

export interface WidgetSlotProps {
  slot: SlotName;
  registry: readonly WidgetRegistration[];
  preferences?: readonly WidgetPreference[];
  /** Must represent already-authorized server-derived module, tenant and permission policy. */
  canView: (definition: WidgetDefinition) => boolean;
  fallback?: ReactNode;
  className?: string;
}

/** A generic renderer; integration with generated registry is owned by WP1/#435. */
export function WidgetSlot({
  slot, registry, preferences = [], canView, fallback = null, className,
}: WidgetSlotProps) {
  const definitions = resolveWidgets(registry.map((entry) => entry.definition), slot, preferences, canView);
  if (!definitions.length) return null;
  const byId = new Map(registry.map((entry) => [entry.definition.id, entry]));
  return (
    <div className={className} data-widget-slot={slot}>
      {definitions.map((definition) => {
        const entry = byId.get(definition.id);
        if (!entry) return null;
        return <WidgetMount key={definition.id} entry={entry} fallback={fallback} />;
      })}
    </div>
  );
}

function WidgetMount({ entry, fallback }: { entry: WidgetRegistration; fallback: ReactNode }) {
  // React.lazy is memoized per loader function to avoid re-importing on re-render.
  return (
    <WidgetErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        {createElement(getLazyWidget(entry.load))}
      </Suspense>
    </WidgetErrorBoundary>
  );
}

const lazyCache = new WeakMap<WidgetComponentLoader, ComponentType>();
function getLazyWidget(load: WidgetComponentLoader): ComponentType {
  const cached = lazyCache.get(load);
  if (cached) return cached;
  // React.lazy returns a component that suspends until its trusted loader resolves.
  const Lazy = requireLazy(load);
  lazyCache.set(load, Lazy);
  return Lazy;
}

function requireLazy(load: WidgetComponentLoader): ComponentType {
  // Named helper to keep lazy imports isolated from the generated registry.
  return lazy(load);
}

