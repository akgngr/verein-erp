/** Oturumsuz sayfalar (ör. uzaktan form doldurma). Panel kabuğu yok; yönlendirme yapılmaz. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-gradient-to-br from-default-50 via-background to-default-100/60 px-4 py-8">{children}</div>;
}
