"use client";
import { Tabs } from "@heroui/react";

import { ShieldCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";

export function UsersTabsContainer({
  usersContent,
  permissionsContent,
}: {
  usersContent: ReactNode;
  permissionsContent: ReactNode;
}) {
  const t = useTranslations("users");
  const [selectedTab, setSelectedTab] = useState<string>("users");

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(k) => setSelectedTab(k as string)}
        variant="primary"
      >
        <Tabs.ListContainer>
          <Tabs.List
            aria-label={t("pageTitle")}
            className={"gap-6 border-b border-ink-200/80 p-0"}
          >
            <Tabs.Tab
              id={"users"}
              key={"users"}
              className={"max-w-fit px-2 h-11 text-sm font-semibold"}
            >
              {
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{t("tabUsers")}</span>
                </div>
              }
              <Tabs.Indicator className={"w-full bg-accent"} />
            </Tabs.Tab>
            <Tabs.Tab
              id={"permissions"}
              key={"permissions"}
              className={"max-w-fit px-2 h-11 text-sm font-semibold"}
            >
              {
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t("tabRoles")}</span>
                </div>
              }
              <Tabs.Indicator className={"w-full bg-accent"} />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      <div className="pt-1">
        {selectedTab === "users" ? usersContent : permissionsContent}
      </div>
    </div>
  );
}
