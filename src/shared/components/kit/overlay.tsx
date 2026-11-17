"use client";

/**
 * UI kit — overlays (W4): Dialog (modal), Sheet (side/bottom drawer), Tooltip, Dropdown menu.
 * Backdrop/container/positioning parts of the framework are rendered here.
 */
import { Drawer as HDrawer, Dropdown as HDropdown, Header as HHeader, Modal as HModal, Tooltip as HTooltip } from "@heroui/react";
import type { Key, ReactNode } from "react";

type Base = { className?: string; children?: ReactNode };
/** Overlay content may be a render function receiving `close`. */
type OverlayChildren = ReactNode | ((api: { close: () => void }) => ReactNode);

// ---------------------------------------------------------------- Dialog

export type DialogProps = Omit<Base, "children"> & {
  children?: OverlayChildren;
  isOpen?: boolean; onOpenChange?: (open: boolean) => void;
  size?: "sm" | "md" | "lg" | "full";
  /** Close when clicking outside (default true). */
  isDismissable?: boolean;
  scroll?: "inside" | "outside";
  "aria-label"?: string;
};
function DialogRoot({ isOpen, onOpenChange, size = "md", isDismissable, scroll, className, children, ...rest }: DialogProps) {
  return (
    <HModal isOpen={isOpen} onOpenChange={onOpenChange}>
      <HModal.Backdrop isDismissable={isDismissable}>
        <HModal.Container size={size} scroll={scroll}>
          <HModal.Dialog className={className} aria-label={rest["aria-label"]}>{children as never}</HModal.Dialog>
        </HModal.Container>
      </HModal.Backdrop>
    </HModal>
  );
}
const DialogHeader = ({ className, children }: Base) => <HModal.Header className={className}>{children}</HModal.Header>;
const DialogHeading = ({ className, children }: Base) => <HModal.Heading className={className}>{children}</HModal.Heading>;
const DialogBody = ({ className, children }: Base) => <HModal.Body className={className}>{children}</HModal.Body>;
const DialogFooter = ({ className, children }: Base) => <HModal.Footer className={className}>{children}</HModal.Footer>;
export const Dialog = Object.assign(DialogRoot, { Header: DialogHeader, Heading: DialogHeading, Body: DialogBody, Footer: DialogFooter });

// ---------------------------------------------------------------- Sheet (drawer)

export type SheetProps = Omit<Base, "children"> & {
  children?: OverlayChildren;
  isOpen?: boolean; onOpenChange?: (open: boolean) => void;
  placement?: "right" | "left" | "bottom" | "top";
  isDismissable?: boolean;
  "aria-label"?: string;
};
function SheetRoot({ isOpen, onOpenChange, placement = "right", isDismissable, className, children, ...rest }: SheetProps) {
  return (
    <HDrawer isOpen={isOpen} onOpenChange={onOpenChange}>
      <HDrawer.Backdrop isDismissable={isDismissable}>
        <HDrawer.Content placement={placement}>
          <HDrawer.Dialog className={className} aria-label={rest["aria-label"]}>{children as never}</HDrawer.Dialog>
        </HDrawer.Content>
      </HDrawer.Backdrop>
    </HDrawer>
  );
}
const SheetHeader = ({ className, children }: Base) => <HDrawer.Header className={className}>{children}</HDrawer.Header>;
const SheetHeading = ({ className, children }: Base) => <HDrawer.Heading className={className}>{children}</HDrawer.Heading>;
const SheetBody = ({ className, children }: Base) => <HDrawer.Body className={className}>{children}</HDrawer.Body>;
const SheetFooter = ({ className, children }: Base) => <HDrawer.Footer className={className}>{children}</HDrawer.Footer>;
export const Sheet = Object.assign(SheetRoot, { Header: SheetHeader, Heading: SheetHeading, Body: SheetBody, Footer: SheetFooter });

// ---------------------------------------------------------------- Tooltip

export type TooltipProps = { children: ReactNode; delay?: number; closeDelay?: number; isDisabled?: boolean };
/** Children: the trigger element followed by <Tooltip.Content>. */
function TooltipRoot({ children, ...props }: TooltipProps) {
  return <HTooltip {...(props as Record<string, unknown>)}>{children}</HTooltip>;
}
const TooltipContent = ({ className, children }: Base) => <HTooltip.Content className={className}>{children}</HTooltip.Content>;
export const Tooltip = Object.assign(TooltipRoot, { Content: TooltipContent });

// ---------------------------------------------------------------- Dropdown

export type DropdownProps = { children: ReactNode; isOpen?: boolean; onOpenChange?: (open: boolean) => void };
function DropdownRoot({ children, ...props }: DropdownProps) {
  return <HDropdown {...(props as Record<string, unknown>)}>{children}</HDropdown>;
}
type Placement = "bottom" | "bottom start" | "bottom end" | "top" | "top start" | "top end" | "left" | "right";
const DropdownPopover = ({ className, children, placement }: Base & { placement?: Placement }) => (
  <HDropdown.Popover className={className} placement={placement}>{children}</HDropdown.Popover>
);
export type DropdownMenuProps = Base & { "aria-label": string; onAction?: (key: Key) => void; disabledKeys?: Iterable<Key> };
const DropdownMenu = (props: DropdownMenuProps) => <HDropdown.Menu {...(props as Record<string, unknown>)} />;
export type DropdownItemProps = Base & { id: string; textValue: string; onAction?: () => void; isDisabled?: boolean; tone?: "default" | "danger" };
const DropdownItem = ({ tone, ...props }: DropdownItemProps) => (
  <HDropdown.Item {...(props as Record<string, unknown>)} variant={tone === "danger" ? "danger" : undefined} />
);
const DropdownSection = (props: Base & { id?: string; "aria-label"?: string }) => <HDropdown.Section {...(props as Record<string, unknown>)} />;
const DropdownSectionHeader = ({ className, children }: Base) => <HHeader className={className}>{children}</HHeader>;
export const Dropdown = Object.assign(DropdownRoot, { Popover: DropdownPopover, Menu: DropdownMenu, Item: DropdownItem, Section: DropdownSection, SectionHeader: DropdownSectionHeader });
