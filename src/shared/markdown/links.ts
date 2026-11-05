export function toInternalMarkdownHref(href: string): string {
  const origin = "https://internal.invalid";
  const url = new URL(`/${href.replace(/\\\\/g, "/").replace(/^\\/+/, "")}`, origin);

  // URL, yüzde kodlanmış nokta segmentlerini de normalize eder. Örneğin
  // /%2e%2e//evil.example -> //evil.example. Origin kontrolü tek başına
  // yeterli değildir; tarayıcı // ile başlayan path'i harici host olarak yorumlar.
  if (url.origin !== origin || !url.pathname.startsWith("/") || url.pathname.startsWith("//")) {
    return "/";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
