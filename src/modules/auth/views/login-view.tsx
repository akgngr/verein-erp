"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";

import { LoginForm } from "../components/login-form";

/**
 * KARAR: HeroUI v2 bileşenleri "use client" banner'ı taşımaz; bu yüzden HeroUI
 * kullanan her bileşen client bileşen olmalıdır. LoginView yalnızca LoginForm'u
 * sardığı için client tarafında güvenle kullanılır.
 */
export function LoginView({ passive }: { passive?: boolean }) {
  return (
    <Card className="w-full max-w-md" shadow="sm">
      <CardHeader className="flex flex-col items-start gap-1 px-8 pt-8">
        <h1 className="text-xl font-semibold text-foreground">Dernek Yönetim Sistemi</h1>
        <p className="text-small text-default-500">Devam etmek için giriş yapın.</p>
      </CardHeader>
      <CardBody className="gap-4 px-8 pb-8">
        {passive ? (
          <div
            role="alert"
            className="rounded-medium border border-warning-200 bg-warning-50 px-4 py-3 text-small text-warning-600 dark:border-warning-100 dark:bg-warning-100/20"
          >
            Oturumunuz sonlandırıldı. Hesabınız pasif duruma alınmış olabilir; lütfen
            yöneticinizle görüşün.
          </div>
        ) : null}
        <LoginForm />
      </CardBody>
    </Card>
  );
}
