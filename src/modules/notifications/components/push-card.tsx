"use client";

import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader } from "@/shared/components/kit";
import { PushToggle } from "./push-toggle";

export type PushCardProps = {
  initialPublicKey?: string | null;
  className?: string;
  onSubscriptionChange?: (isSubscribed: boolean) => void;
};

export function PushCard({
  initialPublicKey,
  className,
  onSubscriptionChange,
}: PushCardProps) {
  const t = useTranslations("notifications.ui.push");

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-1 pb-2">
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="text-xs text-foreground-muted">{t("description")}</p>
      </CardHeader>
      <CardContent className="pt-2">
        <PushToggle
          initialPublicKey={initialPublicKey}
          onSubscriptionChange={onSubscriptionChange}
        />
      </CardContent>
    </Card>
  );
}
