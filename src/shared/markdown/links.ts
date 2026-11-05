export function toInternalMarkdownHref(href: string): string {
  const origin = "https://internal.invalid";
  const url = new URL(`/${href.replace(/\\/g, "/").replace(/^\/+/, "")}`, origin);
  return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : "/";
}
