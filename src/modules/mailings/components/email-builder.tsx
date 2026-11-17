"use client";
import { Button, ButtonGroup } from "@heroui/react";
import { Description, Input, Label, Select, Slider, Tabs, TextArea, TextField, Tooltip } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Columns2,
  Columns3,
  Copy,
  Footprints,
  Heading,
  Image as ImageIcon,
  Minus,
  Monitor,
  MousePointerClick,
  MoveVertical,
  Smartphone,
  Trash2,
  Type,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, type ReactNode } from "react";

import {
  createBlock,
  inlineMarkup,
  newId,
  renderEmailHtml,
  type Block,
  type BlockType,
  type EmailDesign,
  type LeafBlock,
} from "../lib/email-design";

type Palette = { type: BlockType; icon: ReactNode };
const PALETTE: Palette[] = [
  { type: "heading", icon: <Heading className="h-4 w-4" /> },
  { type: "text", icon: <Type className="h-4 w-4" /> },
  { type: "button", icon: <MousePointerClick className="h-4 w-4" /> },
  { type: "image", icon: <ImageIcon className="h-4 w-4" /> },
  { type: "divider", icon: <Minus className="h-4 w-4" /> },
  { type: "spacer", icon: <MoveVertical className="h-4 w-4" /> },
  { type: "columns", icon: <Columns2 className="h-4 w-4" /> },
  { type: "footer", icon: <Footprints className="h-4 w-4" /> },
];

const ALIGNS = [
  { key: "left", Icon: AlignLeft },
  { key: "center", Icon: AlignCenter },
  { key: "right", Icon: AlignRight },
] as const;

/** Where the next palette item goes: top level, or into a column of a columns block. */
type Target = { columnsId: string; column: number } | null;

function mapBlocks(
  blocks: Block[],
  fn: (block: Block) => Block | null,
): Block[] {
  const out: Block[] = [];
  for (const block of blocks) {
    const next = fn(block);
    if (!next) continue;
    out.push(
      next.type === "columns"
        ? {
            ...next,
            columns: next.columns.map(
              (column) => mapBlocks(column, fn) as LeafBlock[],
            ),
          }
        : next,
    );
  }
  return out;
}

function findBlock(blocks: Block[], id: string): Block | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.type === "columns") {
      const found = findBlock(block.columns.flat(), id);
      if (found) return found;
    }
  }
  return null;
}

/** Move/duplicate within the list that contains the block (top level or a column). */
function editSiblings(
  blocks: Block[],
  id: string,
  edit: (list: Block[], index: number) => Block[],
): Block[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index >= 0) return edit(blocks, index);
  return blocks.map((block) =>
    block.type === "columns"
      ? {
          ...block,
          columns: block.columns.map(
            (column) => editSiblings(column, id, edit) as LeafBlock[],
          ),
        }
      : block,
  );
}

const cloneWithIds = (block: Block): Block =>
  block.type === "columns"
    ? {
        ...block,
        id: newId(),
        columns: block.columns.map((column) =>
          column.map((child) => ({ ...child, id: newId() })),
        ),
      }
    : { ...block, id: newId() };

/**
 * Blok tabanlı e-posta şablon editörü: solda bileşenler, ortada tuval (seç, taşı, çoğalt, sil),
 * sağda seçili bloğun özellikleri ve modülün yer tutucuları. Sütun bloklarına içerik eklemek için
 * önce sütunu seçin. Çıktı tablo düzenli, satır içi stilli HTML'dir (e-posta istemcileriyle uyumlu).
 */
export function EmailBuilder({
  design,
  onChange,
  placeholders,
  sampleVars,
}: {
  design: EmailDesign;
  onChange: (design: EmailDesign) => void;
  placeholders: string[];
  sampleVars: Record<string, string>;
}) {
  const t = useTranslations("mailings.builder");
  const [selected, setSelected] = useState<string | null>(
    design.blocks[0]?.id ?? null,
  );
  const [target, setTarget] = useState<Target>(null);
  const [mode, setMode] = useState<"edit" | "desktop" | "mobile">("edit");
  const texts = {
    heading: t("defaults.heading"),
    text: t("defaults.text"),
    button: t("defaults.button"),
    footer: t("defaults.footer"),
  };
  const block = selected ? findBlock(design.blocks, selected) : null;
  const setBlocks = (blocks: Block[]) => onChange({ ...design, blocks });
  const update = (id: string, patch: Partial<Block>) =>
    setBlocks(
      mapBlocks(design.blocks, (item) =>
        item.id === id ? ({ ...item, ...patch } as Block) : item,
      ),
    );

  const add = (type: BlockType) => {
    const created = createBlock(type, texts);
    if (target && type !== "columns") {
      setBlocks(
        design.blocks.map((item) =>
          item.id === target.columnsId && item.type === "columns"
            ? {
                ...item,
                columns: item.columns.map((column, index) =>
                  index === target.column
                    ? [...column, created as LeafBlock]
                    : column,
                ),
              }
            : item,
        ),
      );
    } else {
      // Seçili üst düzey bloğun altına, yoksa sona.
      const index = selected
        ? design.blocks.findIndex((item) => item.id === selected)
        : -1;
      const blocks = [...design.blocks];
      blocks.splice(index >= 0 ? index + 1 : blocks.length, 0, created);
      setBlocks(blocks);
    }
    setSelected(created.id);
  };

  const move = (id: string, delta: -1 | 1) =>
    setBlocks(
      editSiblings(design.blocks, id, (list, index) => {
        const next = [...list];
        const to = index + delta;
        if (to < 0 || to >= next.length) return list;
        [next[index], next[to]] = [next[to], next[index]];
        return next;
      }),
    );
  const duplicate = (id: string) =>
    setBlocks(
      editSiblings(design.blocks, id, (list, index) => [
        ...list.slice(0, index + 1),
        cloneWithIds(list[index]),
        ...list.slice(index + 1),
      ]),
    );
  const remove = (id: string) => {
    setBlocks(
      mapBlocks(design.blocks, (item) => (item.id === id ? null : item)),
    );
    setSelected(null);
  };

  const previewHtml = useMemo(() => {
    if (mode === "edit") return "";
    const html = renderEmailHtml(design);
    return html.replace(/\{(\w+)\}/g, (match, key: string) =>
      key in sampleVars ? sampleVars[key].replace(/[&<>"']/g, "") : match,
    );
  }, [design, mode, sampleVars]);

  return (
    <div className="grid min-h-[560px] gap-4 lg:grid-cols-[200px_minmax(0,1fr)_300px]">
      {/* Bileşenler */}
      <aside className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase text-ink-500">
          {t("components")}
        </span>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {PALETTE.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => add(item.type)}
              className="flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3 py-2 text-start text-sm transition hover:border-accent hover:bg-brand-50"
            >
              {item.icon}
              {t(`types.${item.type}`)}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-400">
          {target
            ? t("addingToColumn", { column: target.column + 1 })
            : t("addHint")}
        </p>
      </aside>

      {/* Tuval */}
      <section className="flex min-w-0 flex-col gap-2">
        <Tabs
          selectedKey={mode}
          onSelectionChange={(key) => setMode(key as typeof mode)}
          emphasis="secondary"
        >
            <Tabs.List aria-label={t("mode")}>
              <Tabs.Tab id={"edit"} key={"edit"}>
                {t("edit")}
              </Tabs.Tab>
              <Tabs.Tab id={"desktop"} key={"desktop"}>
                {
                  <span className="flex items-center gap-1">
                    <Monitor className="h-3.5 w-3.5" />
                    {t("desktop")}
                  </span>
                }
              </Tabs.Tab>
              <Tabs.Tab id={"mobile"} key={"mobile"}>
                {
                  <span className="flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5" />
                    {t("mobile")}
                  </span>
                }
              </Tabs.Tab>
            </Tabs.List>
        </Tabs>
        {mode === "edit" ? (
          <div
            className="rounded-xl p-4"
            style={{ background: design.settings.background }}
            onClick={() => {
              setSelected(null);
              setTarget(null);
            }}
          >
            <div
              className="mx-auto flex flex-col gap-1 rounded-lg p-6 shadow-sm"
              style={{
                maxWidth: design.settings.width,
                background: design.settings.contentBackground,
                color: design.settings.textColor,
              }}
            >
              {design.blocks.length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-400">
                  {t("empty")}
                </p>
              ) : null}
              {design.blocks.map((item, index) => (
                <CanvasBlock
                  key={item.id}
                  block={item}
                  design={design}
                  selected={selected}
                  target={target}
                  first={index === 0}
                  last={index === design.blocks.length - 1}
                  onSelect={(id) => {
                    setSelected(id);
                    setTarget(null);
                  }}
                  onTarget={(next) => {
                    setTarget(next);
                    setSelected(next.columnsId);
                  }}
                  onMove={move}
                  onDuplicate={duplicate}
                  onRemove={remove}
                  t={t}
                />
              ))}
            </div>
          </div>
        ) : (
          <iframe
            title={t("preview")}
            srcDoc={previewHtml}
            sandbox=""
            className="mx-auto rounded-xl border border-ink-200 bg-white"
            style={{ width: mode === "mobile" ? 375 : "100%", height: 640 }}
          />
        )}
      </section>

      {/* Özellikler */}
      <aside className="flex flex-col gap-3 rounded-xl border border-ink-200 p-3">
        {block ? (
          <Inspector
            block={block}
            onChange={(patch) => update(block.id, patch)}
            placeholders={placeholders}
            t={t}
          />
        ) : (
          <DesignSettings design={design} onChange={onChange} t={t} />
        )}
      </aside>
    </div>
  );
}

type T = ReturnType<typeof useTranslations>;

function CanvasBlock({
  block,
  design,
  selected,
  target,
  first,
  last,
  onSelect,
  onTarget,
  onMove,
  onDuplicate,
  onRemove,
  t,
}: {
  block: Block;
  design: EmailDesign;
  selected: string | null;
  target: Target;
  first: boolean;
  last: boolean;
  onSelect: (id: string) => void;
  onTarget: (target: NonNullable<Target>) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  t: T;
}) {
  const active = selected === block.id;
  return (
    <div
      className={`group relative rounded-md outline-offset-2 ${active ? "outline outline-2 outline-accent" : "outline-none hover:outline hover:outline-1 hover:outline-dashed hover:outline-ink-400"}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(block.id);
      }}
    >
      {active ? (
        <div className="absolute -top-3 right-1 z-10 flex gap-0.5 rounded-md bg-accent p-0.5 text-accent-foreground shadow-sm">
          <IconButton
            label={t("moveUp")}
            disabled={first}
            onPress={() => onMove(block.id, -1)}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={t("moveDown")}
            disabled={last}
            onPress={() => onMove(block.id, 1)}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={t("duplicate")}
            onPress={() => onDuplicate(block.id)}
          >
            <Copy className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label={t("remove")} onPress={() => onRemove(block.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ) : null}
      {block.type === "columns" ? (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${block.columns.length}, minmax(0, 1fr))`,
            columnGap: block.gap,
          }}
        >
          {block.columns.map((column, index) => {
            const isTarget =
              target?.columnsId === block.id && target.column === index;
            return (
              <div
                key={index}
                className={`flex min-h-16 flex-col gap-1 rounded-md border border-dashed p-1 ${isTarget ? "border-accent bg-brand-50/40" : "border-ink-300"}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onTarget({ columnsId: block.id, column: index });
                }}
              >
                {column.length === 0 ? (
                  <span className="m-auto text-xs text-ink-400">
                    {t("columnEmpty")}
                  </span>
                ) : null}
                {column.map((child, childIndex) => (
                  <CanvasBlock
                    key={child.id}
                    block={child}
                    design={design}
                    selected={selected}
                    target={target}
                    first={childIndex === 0}
                    last={childIndex === column.length - 1}
                    onSelect={onSelect}
                    onTarget={onTarget}
                    onMove={onMove}
                    onDuplicate={onDuplicate}
                    onRemove={onRemove}
                    t={t}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <LeafPreview block={block} design={design} t={t} />
      )}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label={label}
        isDisabled={disabled}
        className="h-6 min-w-6 rounded-md p-1 hover:bg-white/20 disabled:opacity-40"
        onPress={onPress}
      >
        {children}
      </Button>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

/** Tuvalde bloğun görünümü (gönderimdeki HTML'e yakın). */
function LeafPreview({
  block,
  design,
  t,
}: {
  block: LeafBlock;
  design: EmailDesign;
  t: T;
}) {
  const markup = (text: string, linkColor = design.settings.linkColor) => ({
    __html: inlineMarkup(text, linkColor),
  });
  switch (block.type) {
    case "heading": {
      const size = { 1: "text-2xl", 2: "text-xl", 3: "text-lg" }[block.level];
      return (
        <div
          className={`${size} font-bold leading-tight`}
          style={{ color: block.color, textAlign: block.align }}
          dangerouslySetInnerHTML={markup(block.text || t("placeholderText"))}
        />
      );
    }
    case "text":
      return (
        <div
          className="leading-relaxed"
          style={{
            color: block.color,
            textAlign: block.align,
            fontSize: block.fontSize,
          }}
          dangerouslySetInnerHTML={markup(block.text || t("placeholderText"))}
        />
      );
    case "button":
      return (
        <div style={{ textAlign: block.align }} className="py-2">
          <span
            className="inline-block px-6 py-3 text-sm font-bold"
            style={{
              background: block.background,
              color: block.color,
              borderRadius: block.radius,
            }}
          >
            {block.label || t("types.button")}
          </span>
        </div>
      );
    case "image":
      return block.src ? (
        // Önizleme: harici görsel yalnız tasarımcının tarayıcısında yüklenir.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.src}
          alt={block.alt}
          style={{
            width: `${block.width}%`,
            margin:
              block.align === "center"
                ? "0 auto"
                : block.align === "right"
                  ? "0 0 0 auto"
                  : 0,
          }}
          className="block h-auto max-w-full"
        />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-md bg-ink-100 text-sm text-ink-500">
          <ImageIcon className="me-2 h-4 w-4" />
          {t("imageEmpty")}
        </div>
      );
    case "divider":
      return (
        <hr
          style={{ borderTop: `${block.thickness}px solid ${block.color}` }}
          className="my-3 border-0"
        />
      );
    case "spacer":
      return (
        <div
          style={{ height: block.height }}
          className="bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(0,0,0,0.04)_6px,rgba(0,0,0,0.04)_12px)]"
        />
      );
    case "footer":
      return (
        <div
          className="pt-3 text-center text-xs"
          style={{ color: block.color }}
          dangerouslySetInnerHTML={markup(block.text, block.color)}
        />
      );
  }
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-12 cursor-pointer rounded-md border border-ink-200"
      />
    </label>
  );
}

function AlignField({
  value,
  onChange,
  t,
}: {
  value: "left" | "center" | "right";
  onChange: (value: "left" | "center" | "right") => void;
  t: T;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>{t("align")}</span>
      <ButtonGroup size="sm" variant={actionVariant("default", "flat")}>
        {ALIGNS.map(({ key, Icon }) => (
          <Button
            key={key}
            isIconOnly
            aria-label={t(`aligns.${key}`)}
            onPress={() => onChange(key)}
            variant={actionVariant(
              value === key ? "primary" : "default",
              "solid",
            )}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
}

/** Metin alanı + yer tutucu çipleri (imlecin olduğu yere ekler). */
function TextWithPlaceholders({
  label,
  value,
  onChange,
  placeholders,
  multiline,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholders: string[];
  multiline?: boolean;
  description?: string;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const insert = (key: string) => {
    const element = ref.current;
    const token = `{${key}}`;
    if (!element) return onChange(value + token);
    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + token.length, start + token.length);
    });
  };
  return (
    <div className="flex flex-col gap-1">
      {multiline ? (
        <TextField
          value={value}
          onChange={onChange}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{label}</Label>
          <TextArea
            ref={ref}
            rows={4}
            className={["text-sm", "[field-sizing:content]"]
              .filter(Boolean)
              .join(" ")}
          />
          <Description>{description}</Description>
        </TextField>
      ) : (
        <TextField
          value={value}
          onChange={onChange}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{label}</Label>
          <Input
            ref={ref}
            className={["h-9 text-sm"].filter(Boolean).join(" ")}
          />
          <Description>{description}</Description>
        </TextField>
      )}
      {placeholders.length ? (
        <div className="flex flex-wrap gap-1">
          {placeholders.map((key) => (
            <button
              key={key}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert(key)}
              className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-xs hover:bg-brand-100"
            >{`{${key}}`}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Inspector({
  block,
  onChange,
  placeholders,
  t,
}: {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
  placeholders: string[];
  t: T;
}) {
  const set = onChange as (patch: Record<string, unknown>) => void;
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold">{t(`types.${block.type}`)}</span>
      {block.type === "heading" ? (
        <>
          <TextWithPlaceholders
            label={t("fields.text")}
            value={block.text}
            onChange={(text) => set({ text })}
            placeholders={placeholders}
          />
          <Select
            value={String(block.level)}
            onChange={(selectedValue) => {
              const keys =
                selectedValue === null ? undefined : String(selectedValue);
              return set({ level: Number(keys ?? 1) });
            }} size="sm">
            <Label>{t("fields.level")}</Label>
                {["1", "2", "3"].map((level) => (
                  <Select.Item
                    key={level}
                    id={level}
                    textValue={String(`H${level}`)}
                  >
                    <Label>{`H${level}`}</Label>
                  </Select.Item>
                ))}
          </Select>
          <AlignField
            value={block.align}
            onChange={(align) => set({ align })}
            t={t}
          />
          <ColorField
            label={t("fields.color")}
            value={block.color}
            onChange={(color) => set({ color })}
          />
        </>
      ) : null}
      {block.type === "text" ? (
        <>
          <TextWithPlaceholders
            multiline
            label={t("fields.text")}
            value={block.text}
            onChange={(text) => set({ text })}
            placeholders={placeholders}
            description={t("markupHelp")}
          />
          <AlignField
            value={block.align}
            onChange={(align) => set({ align })}
            t={t}
          />
          <Slider
            minValue={10}
            maxValue={28}
            value={block.fontSize}
            onChange={(value) => set({ fontSize: Number(value) })}
          >
            <Label>{t("fields.fontSize")}</Label>
          </Slider>
          <ColorField
            label={t("fields.color")}
            value={block.color}
            onChange={(color) => set({ color })}
          />
        </>
      ) : null}
      {block.type === "button" ? (
        <>
          <TextWithPlaceholders
            label={t("fields.label")}
            value={block.label}
            onChange={(label) => set({ label })}
            placeholders={placeholders}
          />
          <TextField
            value={block.url}
            onChange={(url) => set({ url })}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("fields.url")}</Label>
            <Input className={["h-9 text-sm"].filter(Boolean).join(" ")} />
            <Description>{t("urlHelp")}</Description>
          </TextField>
          <AlignField
            value={block.align}
            onChange={(align) => set({ align })}
            t={t}
          />
          <ColorField
            label={t("fields.background")}
            value={block.background}
            onChange={(background) => set({ background })}
          />
          <ColorField
            label={t("fields.textColor")}
            value={block.color}
            onChange={(color) => set({ color })}
          />
          <Slider
            minValue={0}
            maxValue={30}
            value={block.radius}
            onChange={(value) => set({ radius: Number(value) })}
          >
            <Label>{t("fields.radius")}</Label>
          </Slider>
        </>
      ) : null}
      {block.type === "image" ? (
        <>
          <TextField
            value={block.src}
            onChange={(src) => set({ src })}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("fields.src")}</Label>
            <Input className={["h-9 text-sm"].filter(Boolean).join(" ")} />
            <Description>{t("imageHelp")}</Description>
          </TextField>
          <TextField
            value={block.alt}
            onChange={(alt) => set({ alt })}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("fields.alt")}</Label>
            <Input className={["h-9 text-sm"].filter(Boolean).join(" ")} />
          </TextField>
          <TextField
            value={block.href}
            onChange={(href) => set({ href })}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("fields.href")}</Label>
            <Input className={["h-9 text-sm"].filter(Boolean).join(" ")} />
          </TextField>
          <Slider
            minValue={10}
            maxValue={100}
            step={5}
            value={block.width}
            onChange={(value) => set({ width: Number(value) })}
          >
            <Label>{t("fields.width")}</Label>
          </Slider>
          <AlignField
            value={block.align}
            onChange={(align) => set({ align })}
            t={t}
          />
        </>
      ) : null}
      {block.type === "divider" ? (
        <>
          <ColorField
            label={t("fields.color")}
            value={block.color}
            onChange={(color) => set({ color })}
          />
          <Slider
            minValue={1}
            maxValue={8}
            value={block.thickness}
            onChange={(value) => set({ thickness: Number(value) })}
          >
            <Label>{t("fields.thickness")}</Label>
          </Slider>
        </>
      ) : null}
      {block.type === "spacer" ? (
        <Slider
          minValue={4}
          maxValue={120}
          step={4}
          value={block.height}
          onChange={(value) => set({ height: Number(value) })}
        >
          <Label>{t("fields.height")}</Label>
        </Slider>
      ) : null}
      {block.type === "footer" ? (
        <>
          <TextWithPlaceholders
            multiline
            label={t("fields.text")}
            value={block.text}
            onChange={(text) => set({ text })}
            placeholders={placeholders}
            description={t("footerHelp")}
          />
          <ColorField
            label={t("fields.color")}
            value={block.color}
            onChange={(color) => set({ color })}
          />
        </>
      ) : null}
      {block.type === "columns" ? (
        <>
          <ButtonGroup size="sm" variant={actionVariant("default", "flat")}>
            <Button
              onPress={() =>
                set({
                  columns: [
                    block.columns[0],
                    [...block.columns[1], ...(block.columns[2] ?? [])],
                  ],
                })
              }
              variant={actionVariant(
                block.columns.length === 2 ? "primary" : "default",
                "solid",
              )}
            >
              {<Columns2 className="h-4 w-4" />}
              {t("twoColumns")}
            </Button>
            <Button
              onPress={() =>
                set({
                  columns:
                    block.columns.length === 3
                      ? block.columns
                      : [...block.columns, []],
                })
              }
              variant={actionVariant(
                block.columns.length === 3 ? "primary" : "default",
                "solid",
              )}
            >
              {<Columns3 className="h-4 w-4" />}
              {t("threeColumns")}
            </Button>
          </ButtonGroup>
          <Slider
            minValue={0}
            maxValue={40}
            step={4}
            value={block.gap}
            onChange={(value) => set({ gap: Number(value) })}
          >
            <Label>{t("fields.gap")}</Label>
          </Slider>
          <p className="text-xs text-ink-500">{t("columnsHelp")}</p>
        </>
      ) : null}
    </div>
  );
}

function DesignSettings({
  design,
  onChange,
  t,
}: {
  design: EmailDesign;
  onChange: (design: EmailDesign) => void;
  t: T;
}) {
  const set = (patch: Partial<EmailDesign["settings"]>) =>
    onChange({ ...design, settings: { ...design.settings, ...patch } });
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold">{t("designSettings")}</span>
      <p className="text-xs text-ink-500">{t("selectHint")}</p>
      <ColorField
        label={t("fields.pageBackground")}
        value={design.settings.background}
        onChange={(background) => set({ background })}
      />
      <ColorField
        label={t("fields.contentBackground")}
        value={design.settings.contentBackground}
        onChange={(contentBackground) => set({ contentBackground })}
      />
      <ColorField
        label={t("fields.textColor")}
        value={design.settings.textColor}
        onChange={(textColor) => set({ textColor })}
      />
      <ColorField
        label={t("fields.linkColor")}
        value={design.settings.linkColor}
        onChange={(linkColor) => set({ linkColor })}
      />
      <Select
        value={design.settings.fontFamily}
        onChange={(selectedValue) => {
          const keys =
            selectedValue === null ? undefined : String(selectedValue);
          return set({
            fontFamily: (keys ??
              "sans") as EmailDesign["settings"]["fontFamily"],
          });
        }} size="sm">
        <Label>{t("fields.font")}</Label>
            {(["sans", "serif", "mono"] as const).map((font) => (
              <Select.Item
                key={font}
                id={font}
                textValue={String(t(`fonts.${font}`))}
              >
                <Label>{t(`fonts.${font}`)}</Label>
              </Select.Item>
            ))}
      </Select>
      <Slider
        minValue={480}
        maxValue={800}
        step={20}
        value={design.settings.width}
        onChange={(value) => set({ width: Number(value) })}
      >
        <Label>{t("fields.contentWidth")}</Label>
      </Slider>
    </div>
  );
}
