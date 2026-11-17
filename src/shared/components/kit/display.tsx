"use client";

/**
 * UI kit — display (W5): Spinner, Card, Tabs, Separator, ProgressBar, Table, Badge.
 */
import {
  Badge as HBadge, Card as HCard, ProgressBar as HProgressBar, Separator as HSeparator, Spinner as HSpinner, Table as HTable, Tabs as HTabs,
} from "@heroui/react";
import type { Key, ReactNode } from "react";

type Base = { className?: string; children?: ReactNode };

// ---------------------------------------------------------------- Spinner

export type SpinnerProps = { size?: "sm" | "md" | "lg"; tone?: "current" | "accent"; className?: string; "aria-label"?: string };
export function Spinner({ size = "md", tone = "accent", className, ...rest }: SpinnerProps) {
  return <HSpinner size={size} color={tone === "current" ? "current" : "accent"} className={className} aria-label={rest["aria-label"]} />;
}

// ---------------------------------------------------------------- Card

function CardRoot({ className, children }: Base) {
  return <HCard className={className}>{children}</HCard>;
}
const CardHeader = ({ className, children }: Base) => <HCard.Header className={className}>{children}</HCard.Header>;
const CardContent = ({ className, children }: Base) => <HCard.Content className={className}>{children}</HCard.Content>;
const CardFooter = ({ className, children }: Base) => <HCard.Footer className={className}>{children}</HCard.Footer>;
export const Card = Object.assign(CardRoot, { Header: CardHeader, Content: CardContent, Footer: CardFooter });

// ---------------------------------------------------------------- Tabs

export type TabsProps = Base & { selectedKey?: Key; defaultSelectedKey?: Key; onSelectionChange?: (key: Key) => void; emphasis?: "primary" | "secondary" };
function TabsRoot({ emphasis, children, ...props }: TabsProps) {
  return <HTabs {...(props as Record<string, unknown>)} variant={emphasis}>{children}</HTabs>;
}
const TabsList = ({ className, children, ...rest }: Base & { "aria-label"?: string }) => (
  <HTabs.ListContainer>
    <HTabs.List className={className} aria-label={rest["aria-label"]}>{children}</HTabs.List>
  </HTabs.ListContainer>
);
const TabsTab = ({ id, className, children }: Base & { id: string }) => (
  <HTabs.Tab id={id} className={className}>
    {children}
    <HTabs.Indicator />
  </HTabs.Tab>
);
const TabsPanel = ({ id, className, children }: Base & { id: string }) => <HTabs.Panel id={id} className={className}>{children}</HTabs.Panel>;
export const Tabs = Object.assign(TabsRoot, { List: TabsList, Tab: TabsTab, Panel: TabsPanel });

// ---------------------------------------------------------------- Separator

export function Separator({ className, orientation = "horizontal" }: { className?: string; orientation?: "horizontal" | "vertical" }) {
  return <HSeparator className={className} orientation={orientation} />;
}

// ---------------------------------------------------------------- ProgressBar

export type ProgressBarProps = { value: number; "aria-label": string; size?: "sm" | "md" | "lg"; tone?: "accent" | "success" | "warning" | "danger"; className?: string; children?: ReactNode };
export function ProgressBar({ tone = "accent", children, ...props }: ProgressBarProps) {
  return (
    <HProgressBar {...(props as Record<string, unknown>)} color={tone === "accent" ? "accent" : tone}>
      {children}
      <HProgressBar.Track>
        <HProgressBar.Fill />
      </HProgressBar.Track>
    </HProgressBar>
  );
}

// ---------------------------------------------------------------- Table (simple, non-DataTable)

const TableRoot = ({ className, children }: Base) => <HTable className={className}>{children}</HTable>;
const TableScroll = ({ className, children }: Base) => <HTable.ScrollContainer className={className}>{children}</HTable.ScrollContainer>;
const TableContent = ({ className, children, ...rest }: Base & { "aria-label": string }) => <HTable.Content className={className} aria-label={rest["aria-label"]}>{children}</HTable.Content>;
const TableHeader = ({ className, children }: Base) => <HTable.Header className={className}>{children}</HTable.Header>;
const TableColumn = ({ className, children, id, ...rest }: Base & { id?: string; isRowHeader?: boolean; "aria-label"?: string }) => (
  <HTable.Column className={className} id={id} isRowHeader={rest.isRowHeader} aria-label={rest["aria-label"]}>{children}</HTable.Column>
);
const TableBody = ({ className, children, renderEmptyState }: Base & { renderEmptyState?: () => ReactNode }) => (
  <HTable.Body className={className} renderEmptyState={renderEmptyState}>{children}</HTable.Body>
);
const TableRow = ({ className, children, id }: Base & { id?: string }) => <HTable.Row className={className} id={id}>{children}</HTable.Row>;
const TableCell = ({ className, children }: Base) => <HTable.Cell className={className}>{children}</HTable.Cell>;
export const Table = Object.assign(TableRoot, { ScrollContainer: TableScroll, Content: TableContent, Header: TableHeader, Column: TableColumn, Body: TableBody, Row: TableRow, Cell: TableCell });

// ---------------------------------------------------------------- Badge (count/dot anchored to an element)

/** Count/marker anchored to its child; `content` null/undefined hides the badge. */
export function Badge({ children, content, tone = "danger", size = "sm" }: { children: ReactNode; content?: ReactNode; tone?: "accent" | "danger" | "success" | "warning"; size?: "sm" | "md" }) {
  return (
    <HBadge.Anchor>
      {children}
      {content === null || content === undefined ? null : (
        <HBadge color={tone} size={size}>
          <HBadge.Label>{content}</HBadge.Label>
        </HBadge>
      )}
    </HBadge.Anchor>
  );
}
