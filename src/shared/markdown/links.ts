export function toInternalMarkdownHref(href: string): string {
  return `/${href.replace(/\\/g, "/").replace(/^\/+/, "")}`;
}
