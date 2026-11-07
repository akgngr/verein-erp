"use client";

import { Button, Divider, Tooltip } from "@heroui/react";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Columns3, Heading1, Heading2, Heading3, Highlighter, Italic, Link2, List, ListOrdered,
  Minus, Pilcrow, Quote, Redo2, Rows3, Strikethrough, Table2, Trash2, Underline as UnderlineIcon, Undo2, Unlink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/**
 * Word benzeri zengin metin editörü (Tiptap): şerit araç çubuğu + A4 sayfa görünümü. Çıktı HTML'dir; sunucu
 * kaydederken izin listesiyle temizler (lib/sanitize.ts). Görsel ve gömülü içerik bilerek desteklenmez.
 */
export function RichTextEditor({ value, onChange, ariaLabel }: { value: string; onChange: (html: string) => void; ariaLabel: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Tiptap 3: StarterKit altı çizili ve bağlantıyı da içerir.
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true, protocols: ["mailto", "tel"] } }),
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    editorProps: { attributes: { class: "word-page focus:outline-none", "aria-label": ariaLabel } },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-medium border border-default-200">
      {editor ? <Toolbar editor={editor} /> : <div className="h-12 border-b border-default-200 bg-default-50" />}
      <div className="min-h-0 flex-1 overflow-y-auto bg-default-100 px-4 py-6 dark:bg-default-50">
        <div className="mx-auto min-h-[1000px] w-full max-w-[816px] rounded-sm bg-white px-[72px] py-[64px] text-[15px] leading-relaxed text-neutral-900 shadow-md">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const t = useTranslations("online-forms.documents.editor");
  const button = (label: string, icon: ReactNode, action: () => void, active = false, disabled = false) => (
    <Tooltip content={label} delay={400} closeDelay={0}>
      <Button isIconOnly size="sm" variant={active ? "flat" : "light"} color={active ? "primary" : "default"} aria-label={label} isDisabled={disabled} onPress={action} onMouseDown={(event) => event.preventDefault()}>{icon}</Button>
    </Tooltip>
  );
  const chain = () => editor.chain().focus();
  const inTable = editor.isActive("table");
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-default-200 bg-default-50 px-2 py-1" role="toolbar" aria-label={t("toolbar")}>
      {button(t("undo"), <Undo2 className="size-4" />, () => chain().undo().run(), false, !editor.can().undo())}
      {button(t("redo"), <Redo2 className="size-4" />, () => chain().redo().run(), false, !editor.can().redo())}
      <Divider orientation="vertical" className="mx-1 h-6" />
      {button(t("paragraph"), <Pilcrow className="size-4" />, () => chain().setParagraph().run(), editor.isActive("paragraph"))}
      {button(t("heading1"), <Heading1 className="size-4" />, () => chain().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 }))}
      {button(t("heading2"), <Heading2 className="size-4" />, () => chain().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
      {button(t("heading3"), <Heading3 className="size-4" />, () => chain().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
      <Divider orientation="vertical" className="mx-1 h-6" />
      {button(t("bold"), <Bold className="size-4" />, () => chain().toggleBold().run(), editor.isActive("bold"))}
      {button(t("italic"), <Italic className="size-4" />, () => chain().toggleItalic().run(), editor.isActive("italic"))}
      {button(t("underline"), <UnderlineIcon className="size-4" />, () => chain().toggleUnderline().run(), editor.isActive("underline"))}
      {button(t("strike"), <Strikethrough className="size-4" />, () => chain().toggleStrike().run(), editor.isActive("strike"))}
      {button(t("highlight"), <Highlighter className="size-4" />, () => chain().toggleHighlight().run(), editor.isActive("highlight"))}
      <Divider orientation="vertical" className="mx-1 h-6" />
      {button(t("alignLeft"), <AlignLeft className="size-4" />, () => chain().setTextAlign("left").run(), editor.isActive({ textAlign: "left" }))}
      {button(t("alignCenter"), <AlignCenter className="size-4" />, () => chain().setTextAlign("center").run(), editor.isActive({ textAlign: "center" }))}
      {button(t("alignRight"), <AlignRight className="size-4" />, () => chain().setTextAlign("right").run(), editor.isActive({ textAlign: "right" }))}
      {button(t("alignJustify"), <AlignJustify className="size-4" />, () => chain().setTextAlign("justify").run(), editor.isActive({ textAlign: "justify" }))}
      <Divider orientation="vertical" className="mx-1 h-6" />
      {button(t("bulletList"), <List className="size-4" />, () => chain().toggleBulletList().run(), editor.isActive("bulletList"))}
      {button(t("orderedList"), <ListOrdered className="size-4" />, () => chain().toggleOrderedList().run(), editor.isActive("orderedList"))}
      {button(t("quote"), <Quote className="size-4" />, () => chain().toggleBlockquote().run(), editor.isActive("blockquote"))}
      {button(t("rule"), <Minus className="size-4" />, () => chain().setHorizontalRule().run())}
      <Divider orientation="vertical" className="mx-1 h-6" />
      {button(t("link"), <Link2 className="size-4" />, () => {
        const previous = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt(t("linkPrompt"), previous ?? "https://");
        if (url === null) return;
        if (!url) return void chain().unsetLink().run();
        if (/^(https?:|mailto:|tel:)/i.test(url)) chain().extendMarkRange("link").setLink({ href: url }).run();
      }, editor.isActive("link"))}
      {button(t("unlink"), <Unlink className="size-4" />, () => chain().unsetLink().run(), false, !editor.isActive("link"))}
      <Divider orientation="vertical" className="mx-1 h-6" />
      {button(t("table"), <Table2 className="size-4" />, () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
      {button(t("addRow"), <Rows3 className="size-4" />, () => chain().addRowAfter().run(), false, !inTable)}
      {button(t("addColumn"), <Columns3 className="size-4" />, () => chain().addColumnAfter().run(), false, !inTable)}
      {button(t("deleteTable"), <Trash2 className="size-4" />, () => chain().deleteTable().run(), false, !inTable)}
    </div>
  );
}
