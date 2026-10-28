export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-default-50 via-background to-default-100/60 p-4">
      {children}
    </div>
  );
}
