"use client";

import Link from "next/link";

import { buttonClassName, Card, CardContent, CardHeader } from "@/shared/components/kit";

/** The documents module owns OCR and the final form review; no source file enters Secretary. */
export function SecretaryDocumentReviewLink({ labels }: { labels: { title: string; description: string; open: string } }) {
  return <Card className="border border-ink-200/80 bg-surface shadow-sm">
    <CardHeader><h2 className="text-base font-semibold">{labels.title}</h2></CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-ink-500">{labels.description}</p>
      <Link href="/evrak/yeni" className={buttonClassName({ variant: "secondary", size: "sm" })}>{labels.open}</Link>
    </CardContent>
  </Card>;
}
