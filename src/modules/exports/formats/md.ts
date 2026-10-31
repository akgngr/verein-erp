import { defineFormat } from "./types";

export const markdownFormat = defineFormat({
  id: "md",
  mimeType: "text/markdown; charset=utf-8",
  extension: "md",
  render: async ({ title, markdown }) => Buffer.from(`# ${title}\n\n${markdown.trim()}\n`, "utf8"),
});
