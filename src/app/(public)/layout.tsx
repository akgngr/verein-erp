/** Oturumsuz sayfalar (ör. uzaktan form doldurma). Panel kabuğu yok; yönlendirme yapılmaz. */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-ink-50 via-background to-ink-100/60 px-4 py-8">
      {children}
    </div>
  );
}
