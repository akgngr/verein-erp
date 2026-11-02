"use client";

import "@react-email/editor/themes/default.css";

import { EmailEditor, type EmailEditorRef } from "@react-email/editor";
import { useImperativeHandle, useRef, type Ref } from "react";

export type EmailEditorFieldHandle = {
  /** Gönderim için: e-posta uyumlu HTML ve düz metin. */
  getEmail: () => Promise<{ html: string; text: string }>;
  /** İmleç konumuna metin ekler (yer tutucular için). */
  insertText: (text: string) => void;
  isEmpty: () => boolean;
};

/**
 * React Email görsel editörü (Tiptap): başlık, liste, bağlantı, buton, sütunlar, ayırıcı; "/" ile blok
 * menüsü. Görsel yükleme kapalı (KVKK: dosyalar başka sunucuya gitmesin); görseller bağlantıyla eklenir.
 */
export default function EmailEditorField({ initialHtml, placeholder, onChange, handleRef }: { initialHtml: string; placeholder: string; onChange?: () => void; handleRef: Ref<EmailEditorFieldHandle> }) {
  const editorRef = useRef<EmailEditorRef>(null);
  // Son imleç konumu: editör odağı kaybedince seçimi sıfırlayabildiği için ayrıca saklanır.
  const lastSelection = useRef<{ from: number; to: number } | null>(null);
  useImperativeHandle(handleRef, () => ({
    getEmail: async () => (editorRef.current ? editorRef.current.getEmail() : { html: "", text: "" }),
    // Buton tıklaması editörün odağını alır; ekleme son imleç/seçim konumuna yapılır (başa değil).
    insertText: (text) => {
      const editor = editorRef.current?.editor;
      if (!editor) return;
      const { from, to } = lastSelection.current ?? editor.state.selection;
      editor.chain().insertContentAt({ from, to }, text).focus(from + text.length).run();
      lastSelection.current = { from: from + text.length, to: from + text.length };
    },
    isEmpty: () => !editorRef.current?.editor || editorRef.current.editor.getText().trim().length === 0,
  }));
  return (
    <div className="min-h-[320px] rounded-medium border border-default-200 bg-white p-3 text-black dark:bg-white">
      <EmailEditor
        ref={editorRef}
        content={initialHtml}
        placeholder={placeholder}
        onReady={(ready) => {
          ready.editor?.on("selectionUpdate", ({ editor }) => {
            lastSelection.current = { from: editor.state.selection.from, to: editor.state.selection.to };
          });
        }}
        onUpdate={(updated) => {
          const editor = updated.editor;
          if (editor) lastSelection.current = { from: editor.state.selection.from, to: editor.state.selection.to };
          onChange?.();
        }}
      />
    </div>
  );
}
