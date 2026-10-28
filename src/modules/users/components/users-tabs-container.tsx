"use client";

import { Tab, Tabs } from "@heroui/react";
import { ShieldCheck, Users } from "lucide-react";
import { type ReactNode, useState } from "react";

export function UsersTabsContainer({
  usersContent,
  permissionsContent,
}: {
  usersContent: ReactNode;
  permissionsContent: ReactNode;
}) {
  const [selectedTab, setSelectedTab] = useState<string>("users");

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(k) => setSelectedTab(k as string)}
        variant="underlined"
        color="primary"
        size="lg"
        classNames={{
          tabList: "gap-6 border-b border-default-200/80 p-0",
          cursor: "w-full bg-primary",
          tab: "max-w-fit px-2 h-11 text-small font-semibold",
        }}
      >
        <Tab
          key="users"
          title={
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Kullanıcı Listesi</span>
            </div>
          }
        />
        <Tab
          key="permissions"
          title={
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>Roller ve Yetki Matrisi</span>
            </div>
          }
        />
      </Tabs>

      <div className="pt-1">
        {selectedTab === "users" ? usersContent : permissionsContent}
      </div>
    </div>
  );
}
